import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelemetryDbService, type TelemetryEvent } from './TelemetryDbService';
import { DatabaseService } from './DatabaseService';

vi.mock('./DatabaseService', () => ({ DatabaseService: vi.fn(), databaseService: {} }));

function makeMockDb() {
  return {
    select: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    transaction: vi.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
  } as unknown as DatabaseService;
}

const makeEvent = (overrides: Partial<TelemetryEvent> = {}): TelemetryEvent => ({
  event_id: 'evt-1',
  event: '{"eid":"START"}',
  event_type: 'START',
  timestamp: 1000,
  priority: 1,
  synced: 0,
  ...overrides,
});

describe('TelemetryDbService', () => {
  let db: DatabaseService;
  let svc: TelemetryDbService;

  beforeEach(() => {
    db = makeMockDb();
    svc = new TelemetryDbService(db);
  });

  // ── insert ─────────────────────────────────────────────────────────────────

  describe('insert', () => {
    it('calls insert with IGNORE conflict', async () => {
      const event = makeEvent();
      await svc.insert(event);
      expect(db.insert).toHaveBeenCalledWith(
        'telemetry',
        {
          event_id: 'evt-1',
          event: '{"eid":"START"}',
          event_type: 'START',
          timestamp: 1000,
          priority: 1,
          synced: 0,
        },
        'IGNORE'
      );
    });

    it('inserts END events with priority 2', async () => {
      const event = makeEvent({ event_id: 'evt-end', event_type: 'END', priority: 2 });
      await svc.insert(event);
      const [, data] = vi.mocked(db.insert).mock.calls[0];
      expect(data.priority).toBe(2);
      expect(data.event_type).toBe('END');
    });
  });

  // ── insertBatch ────────────────────────────────────────────────────────────

  describe('insertBatch', () => {
    it('is a no-op for empty array', async () => {
      await svc.insertBatch([]);
      expect(db.insert).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('wraps inserts in a transaction', async () => {
      await svc.insertBatch([makeEvent()]);
      expect(db.transaction).toHaveBeenCalledOnce();
    });

    it('calls insert for each event', async () => {
      const events = [makeEvent({ event_id: 'e1' }), makeEvent({ event_id: 'e2' })];
      await svc.insertBatch(events);
      expect(db.insert).toHaveBeenCalledTimes(2);
    });
  });

  // ── getPending ─────────────────────────────────────────────────────────────

  describe('getPending', () => {
    it('queries with synced=0, priority DESC, timestamp ASC, default limit 100', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      await svc.getPending();
      expect(db.select).toHaveBeenCalledWith('telemetry', {
        where: { eq: { synced: 0 } },
        orderBy: [
          { column: 'priority', direction: 'DESC' },
          { column: 'timestamp', direction: 'ASC' },
        ],
        limit: 100,
      });
    });

    it('accepts a custom limit', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      await svc.getPending(25);
      const [, config] = vi.mocked(db.select).mock.calls[0];
      expect(config?.limit).toBe(25);
    });

    it('maps rows to TelemetryEvent objects', async () => {
      const event = makeEvent();
      vi.mocked(db.select).mockResolvedValue([event]);
      const result = await svc.getPending();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(event);
    });

    it('returns empty array when no pending events', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      expect(await svc.getPending()).toEqual([]);
    });
  });

  // ── markSynced ─────────────────────────────────────────────────────────────

  describe('markSynced', () => {
    it('is a no-op for empty array', async () => {
      await svc.markSynced([]);
      expect(db.update).not.toHaveBeenCalled();
    });

    it('updates synced=1 using IN clause for provided IDs', async () => {
      await svc.markSynced(['e1', 'e2', 'e3']);
      expect(db.update).toHaveBeenCalledWith(
        'telemetry',
        { synced: 1 },
        { in: { event_id: ['e1', 'e2', 'e3'] } }
      );
    });

    it('works with a single event ID', async () => {
      await svc.markSynced(['only-one']);
      const [, , where] = vi.mocked(db.update).mock.calls[0];
      expect(where.in?.event_id).toEqual(['only-one']);
    });
  });

  // ── deleteByIds ────────────────────────────────────────────────────────────

  describe('deleteByIds', () => {
    it('is a no-op for empty array', async () => {
      await svc.deleteByIds([]);
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('deletes rows matching the provided event IDs', async () => {
      await svc.deleteByIds(['e1', 'e2', 'e3']);
      expect(db.delete).toHaveBeenCalledWith(
        'telemetry',
        { in: { event_id: ['e1', 'e2', 'e3'] } }
      );
    });

    it('works with a single event ID', async () => {
      await svc.deleteByIds(['only-one']);
      const [, where] = vi.mocked(db.delete).mock.calls[0];
      expect(where?.in?.event_id).toEqual(['only-one']);
    });
  });

  // ── deleteOlderThan ────────────────────────────────────────────────────────

  describe('deleteOlderThan', () => {
    it('deletes synced events older than the given days', async () => {
      const DAY_MS = 24 * 60 * 60 * 1000;
      const before = Date.now();
      await svc.deleteOlderThan(7);
      const after = Date.now();

      expect(db.delete).toHaveBeenCalledOnce();
      const [table, where] = vi.mocked(db.delete).mock.calls[0];
      expect(table).toBe('telemetry');
      expect(where?.eq).toEqual({ synced: 1 });

      const cutoff = where?.lt?.timestamp as number;
      const expectedMin = before - 7 * DAY_MS;
      const expectedMax = after - 7 * DAY_MS;
      expect(cutoff).toBeGreaterThanOrEqual(expectedMin);
      expect(cutoff).toBeLessThanOrEqual(expectedMax);
    });

    it('only deletes synced events (not unsynced)', async () => {
      await svc.deleteOlderThan(1);
      const [, where] = vi.mocked(db.delete).mock.calls[0];
      expect(where?.eq?.synced).toBe(1);
    });
  });

  // ── getPendingCount ────────────────────────────────────────────────────────

  describe('getPendingCount', () => {
    it('delegates to count with synced=0 filter', async () => {
      vi.mocked(db.count).mockResolvedValue(17);
      const n = await svc.getPendingCount();
      expect(n).toBe(17);
      expect(db.count).toHaveBeenCalledWith('telemetry', { eq: { synced: 0 } });
    });

    it('returns 0 when no pending events', async () => {
      vi.mocked(db.count).mockResolvedValue(0);
      expect(await svc.getPendingCount()).toBe(0);
    });
  });
});
