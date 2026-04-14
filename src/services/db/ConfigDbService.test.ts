import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigDbService, CONFIG_TTL_MS, type ConfigType } from './ConfigDbService';
import { DatabaseService } from './DatabaseService';

vi.mock('./DatabaseService', () => ({ DatabaseService: vi.fn(), databaseService: {} }));

function makeMockDb() {
  return {
    select: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
  } as unknown as DatabaseService;
}

describe('ConfigDbService', () => {
  let db: DatabaseService;
  let svc: ConfigDbService;

  beforeEach(() => {
    db = makeMockDb();
    svc = new ConfigDbService(db);
  });

  // ── set ────────────────────────────────────────────────────────────────────

  describe('set', () => {
    it('inserts with REPLACE and correct fields', async () => {
      const before = Date.now();
      await svc.set('channel-01', 'channel', { name: 'Sunbird' });
      const after = Date.now();

      expect(db.insert).toHaveBeenCalledOnce();
      const [table, data, conflict] = vi.mocked(db.insert).mock.calls[0];
      expect(table).toBe('configs');
      expect(data.config_key).toBe('channel-01');
      expect(data.config_type).toBe('channel');
      expect(data.data).toBe(JSON.stringify({ name: 'Sunbird' }));
      expect(data.fetched_on).toBeGreaterThanOrEqual(before);
      expect(data.fetched_on).toBeLessThanOrEqual(after);
      expect(conflict).toBe('REPLACE');
    });
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns parsed data and fetchedOn when found', async () => {
      vi.mocked(db.select).mockResolvedValue([
        { data: '{"key":"value"}', fetched_on: 9999 },
      ]);
      const result = await svc.get('channel-01');
      expect(result).toEqual({ data: { key: 'value' }, fetchedOn: 9999 });
      expect(db.select).toHaveBeenCalledWith('configs', {
        columns: ['data', 'fetched_on'],
        where: { eq: { config_key: 'channel-01' } },
      });
    });

    it('returns null when not found', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      expect(await svc.get('missing')).toBeNull();
    });

    it('returns null when data JSON is invalid', async () => {
      vi.mocked(db.select).mockResolvedValue([{ data: 'bad-json', fetched_on: 1 }]);
      expect(await svc.get('bad')).toBeNull();
    });
  });

  // ── getByType ──────────────────────────────────────────────────────────────

  describe('getByType', () => {
    it('returns mapped entries for the given config type', async () => {
      vi.mocked(db.select).mockResolvedValue([
        { config_key: 'ch-1', config_type: 'channel', data: '{"id":1}', fetched_on: 100 },
        { config_key: 'ch-2', config_type: 'channel', data: '{"id":2}', fetched_on: 200 },
      ]);
      const entries = await svc.getByType('channel');
      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({ configKey: 'ch-1', configType: 'channel', data: { id: 1 }, fetchedOn: 100 });
      expect(db.select).toHaveBeenCalledWith('configs', {
        where: { eq: { config_type: 'channel' } },
      });
    });

    it('returns empty array when no entries found', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      expect(await svc.getByType('framework')).toEqual([]);
    });

    it('falls back to empty object when data is unparseable', async () => {
      vi.mocked(db.select).mockResolvedValue([
        { config_key: 'k', config_type: 'channel', data: 'bad', fetched_on: 1 },
      ]);
      const entries = await svc.getByType('channel');
      expect(entries[0].data).toEqual({});
    });
  });

  // ── isStale ────────────────────────────────────────────────────────────────

  describe('isStale', () => {
    it('returns true when key not in cache', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      expect(await svc.isStale('missing-key')).toBe(true);
    });

    it('returns false when within TTL', async () => {
      const recent = Date.now() - 1000; // 1 second ago
      vi.mocked(db.select).mockResolvedValue([{ fetched_on: recent }]);
      expect(await svc.isStale('key', CONFIG_TTL_MS)).toBe(false);
    });

    it('returns true when TTL has expired', async () => {
      const old = Date.now() - CONFIG_TTL_MS - 1; // 1 ms past expiry
      vi.mocked(db.select).mockResolvedValue([{ fetched_on: old }]);
      expect(await svc.isStale('key', CONFIG_TTL_MS)).toBe(true);
    });

    it('uses CONFIG_TTL_MS as default TTL', async () => {
      const withinDefault = Date.now() - (CONFIG_TTL_MS / 2);
      vi.mocked(db.select).mockResolvedValue([{ fetched_on: withinDefault }]);
      expect(await svc.isStale('key')).toBe(false);
    });

    it('queries only fetched_on column', async () => {
      vi.mocked(db.select).mockResolvedValue([{ fetched_on: Date.now() }]);
      await svc.isStale('my-key');
      expect(db.select).toHaveBeenCalledWith('configs', {
        columns: ['fetched_on'],
        where: { eq: { config_key: 'my-key' } },
      });
    });
  });

  // ── deleteByType ───────────────────────────────────────────────────────────

  describe('deleteByType', () => {
    it('deletes by config_type', async () => {
      await svc.deleteByType('form');
      expect(db.delete).toHaveBeenCalledWith('configs', { eq: { config_type: 'form' } });
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes by config_key', async () => {
      await svc.delete('channel-01');
      expect(db.delete).toHaveBeenCalledWith('configs', { eq: { config_key: 'channel-01' } });
    });
  });
});
