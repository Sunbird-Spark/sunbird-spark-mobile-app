import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkQueueDbService } from './NetworkQueueDbService';
import { databaseService } from './DatabaseService';
import { NetworkQueueType, QueueEntryStatus } from '../sync/types';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'generated-uuid') }));

const mockDb = {
  query: vi.fn(),
  run: vi.fn(),
};

vi.mock('./DatabaseService', () => ({
  DatabaseService: vi.fn(),
  databaseService: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    getDb: vi.fn(),
  },
}));

describe('NetworkQueueDbService', () => {
  let svc: NetworkQueueDbService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.query.mockResolvedValue({ values: [] });
    mockDb.run.mockResolvedValue({ changes: { changes: 0 } });
    vi.mocked(databaseService.getDb).mockReturnValue(mockDb as never);
    vi.mocked(databaseService.insert).mockResolvedValue(undefined);
    vi.mocked(databaseService.update).mockResolvedValue(undefined);
    vi.mocked(databaseService.delete).mockResolvedValue(undefined);
    vi.mocked(databaseService.count).mockResolvedValue(0);
    svc = new NetworkQueueDbService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── insert ─────────────────────────────────────────────────────────────────

  describe('insert', () => {
    it('inserts a PENDING row with generated msg_id and retry defaults', async () => {
      const msgId = await svc.insert({
        type: NetworkQueueType.TELEMETRY,
        priority: 1,
        timestamp: 1234,
        data: 'H4sIpayload',
        item_count: 3,
      });

      expect(msgId).toBe('generated-uuid');
      expect(databaseService.insert).toHaveBeenCalledWith('network_queue', {
        msg_id: 'generated-uuid',
        type: NetworkQueueType.TELEMETRY,
        priority: 1,
        timestamp: 1234,
        data: 'H4sIpayload',
        item_count: 3,
        retry_count: 0,
        max_retries: 5,
        next_retry_at: 0,
        last_error: null,
        status: QueueEntryStatus.PENDING,
      });
    });

    it('propagates a database insert failure', async () => {
      vi.mocked(databaseService.insert).mockRejectedValue(new Error('disk full'));
      await expect(
        svc.insert({
          type: NetworkQueueType.COURSE_PROGRESS,
          priority: 2,
          timestamp: 1,
          data: '{}',
          item_count: 1,
        })
      ).rejects.toThrow('disk full');
    });
  });

  // ── getPending ─────────────────────────────────────────────────────────────

  describe('getPending', () => {
    it('selects PENDING/FAILED rows due for retry, ordered, with default limit 10', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(50_000));

      await svc.getPending();

      const [sql, params] = mockDb.query.mock.calls[0];
      expect(sql).toContain("status IN ('PENDING', 'FAILED')");
      expect(sql).toContain('next_retry_at <= ?');
      expect(sql).toContain('ORDER BY priority ASC, timestamp ASC LIMIT ?');
      expect(sql).not.toContain('type IN');
      expect(params).toEqual([50_000, 10]);
    });

    it('adds a type IN filter with one placeholder per type', async () => {
      await svc.getPending(5, [NetworkQueueType.TELEMETRY, NetworkQueueType.COURSE_ASSESMENT]);

      const [sql, params] = mockDb.query.mock.calls[0];
      expect(sql).toContain('AND type IN (?, ?)');
      expect(params.slice(1)).toEqual([
        NetworkQueueType.TELEMETRY,
        NetworkQueueType.COURSE_ASSESMENT,
        5,
      ]);
    });

    it('ignores an empty types array', async () => {
      await svc.getPending(7, []);
      const [sql, params] = mockDb.query.mock.calls[0];
      expect(sql).not.toContain('type IN');
      expect(params).toHaveLength(2);
      expect(params[1]).toBe(7);
    });

    it('returns the rows from the query', async () => {
      const row = { msg_id: 'a', type: NetworkQueueType.TELEMETRY };
      mockDb.query.mockResolvedValue({ values: [row] });
      await expect(svc.getPending()).resolves.toEqual([row]);
    });

    it('returns an empty array when the driver omits values', async () => {
      mockDb.query.mockResolvedValue({});
      await expect(svc.getPending()).resolves.toEqual([]);
    });
  });

  // ── status transitions ─────────────────────────────────────────────────────

  describe('markProcessing', () => {
    it('sets status PROCESSING for the msg_id', async () => {
      await svc.markProcessing('m1');
      expect(databaseService.update).toHaveBeenCalledWith(
        'network_queue',
        { status: QueueEntryStatus.PROCESSING },
        { eq: { msg_id: 'm1' } }
      );
    });
  });

  describe('markSuccess', () => {
    it('deletes the row rather than updating it', async () => {
      await svc.markSuccess('m1');
      expect(databaseService.delete).toHaveBeenCalledWith('network_queue', {
        eq: { msg_id: 'm1' },
      });
      expect(databaseService.update).not.toHaveBeenCalled();
    });
  });

  describe('markFailed', () => {
    it('moves the row to DEAD_LETTER once retries are exhausted', async () => {
      await svc.markFailed('m1', 'boom', 5, 5);
      expect(databaseService.update).toHaveBeenCalledWith(
        'network_queue',
        { status: QueueEntryStatus.DEAD_LETTER, last_error: 'boom' },
        { eq: { msg_id: 'm1' } }
      );
      expect(databaseService.update).toHaveBeenCalledOnce();
    });

    it('dead-letters when retryCount exceeds maxRetries', async () => {
      await svc.markFailed('m1', 'boom', 9, 5);
      const [, data] = vi.mocked(databaseService.update).mock.calls[0];
      expect(data.status).toBe(QueueEntryStatus.DEAD_LETTER);
    });

    it('applies exponential backoff and increments retry_count while retries remain', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(100_000));

      await svc.markFailed('m1', 'timeout', 3, 5);

      expect(databaseService.update).toHaveBeenCalledWith(
        'network_queue',
        {
          status: QueueEntryStatus.FAILED,
          retry_count: 4,
          next_retry_at: 100_000 + 8_000,
          last_error: 'timeout',
        },
        { eq: { msg_id: 'm1' } }
      );
    });

    it('uses a 1s backoff on the first failure', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));
      await svc.markFailed('m1', 'timeout', 0, 5);
      const [, data] = vi.mocked(databaseService.update).mock.calls[0];
      expect(data.next_retry_at).toBe(1000);
      expect(data.retry_count).toBe(1);
    });
  });

  describe('markFailedAt', () => {
    it('writes the caller-supplied retry count and next_retry_at verbatim', async () => {
      await svc.markFailedAt('m1', 'offline', 2, 987_654);
      expect(databaseService.update).toHaveBeenCalledWith(
        'network_queue',
        {
          status: QueueEntryStatus.FAILED,
          retry_count: 2,
          next_retry_at: 987_654,
          last_error: 'offline',
        },
        { eq: { msg_id: 'm1' } }
      );
    });
  });

  // ── purges / resets ────────────────────────────────────────────────────────

  describe('purgeStaleTelemetry', () => {
    it('deletes telemetry rows that are neither gzip base64 nor JSON', async () => {
      await svc.purgeStaleTelemetry();
      const [sql, params, transaction] = mockDb.run.mock.calls[0];
      expect(sql).toContain('DELETE FROM network_queue');
      expect(sql).toContain("data NOT LIKE 'H4sI%'");
      expect(sql).toContain("data NOT LIKE '{%'");
      expect(params).toEqual([NetworkQueueType.TELEMETRY]);
      expect(transaction).toBe(false);
    });

    it('propagates driver errors', async () => {
      mockDb.run.mockRejectedValue(new Error('db locked'));
      await expect(svc.purgeStaleTelemetry()).rejects.toThrow('db locked');
    });
  });

  describe('resetDeadLetter', () => {
    it('returns DEAD_LETTER rows to PENDING and clears retry state', async () => {
      await svc.resetDeadLetter();
      expect(databaseService.update).toHaveBeenCalledWith(
        'network_queue',
        {
          status: QueueEntryStatus.PENDING,
          retry_count: 0,
          next_retry_at: 0,
          last_error: null,
        },
        { eq: { status: QueueEntryStatus.DEAD_LETTER } }
      );
    });
  });

  describe('purgeDeadLetter', () => {
    it('computes the cutoff from the age in days', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(10 * 24 * 60 * 60 * 1000));

      await svc.purgeDeadLetter(3);

      const [sql, params, transaction] = mockDb.run.mock.calls[0];
      expect(sql).toContain("status = 'DEAD_LETTER'");
      expect(sql).toContain('timestamp < ?');
      expect(params).toEqual([7 * 24 * 60 * 60 * 1000]);
      expect(transaction).toBe(false);
    });
  });

  describe('clearCourseData', () => {
    it('deletes course rows only, leaving telemetry intact', async () => {
      await svc.clearCourseData();
      const [table, where] = vi.mocked(databaseService.delete).mock.calls[0];
      expect(table).toBe('network_queue');
      expect(where?.in?.type).toEqual([
        NetworkQueueType.COURSE_PROGRESS,
        NetworkQueueType.COURSE_ASSESMENT,
      ]);
      expect(where?.in?.type).not.toContain(NetworkQueueType.TELEMETRY);
    });
  });

  describe('resetProcessing', () => {
    it('returns crashed PROCESSING rows to PENDING immediately', async () => {
      await svc.resetProcessing();
      expect(databaseService.update).toHaveBeenCalledWith(
        'network_queue',
        { status: QueueEntryStatus.PENDING, next_retry_at: 0 },
        { eq: { status: QueueEntryStatus.PROCESSING } }
      );
    });
  });

  // ── counts ─────────────────────────────────────────────────────────────────

  describe('getPendingCount', () => {
    it('counts PENDING and FAILED rows across all types when no type is given', async () => {
      vi.mocked(databaseService.count).mockResolvedValue(4);
      await expect(svc.getPendingCount()).resolves.toBe(4);
      expect(databaseService.count).toHaveBeenCalledWith('network_queue', {
        eq: {},
        in: { status: [QueueEntryStatus.PENDING, QueueEntryStatus.FAILED] },
      });
    });

    it('narrows the count to a single type when given', async () => {
      await svc.getPendingCount(NetworkQueueType.COURSE_PROGRESS);
      const [, where] = vi.mocked(databaseService.count).mock.calls[0];
      expect(where?.eq).toEqual({ type: NetworkQueueType.COURSE_PROGRESS });
    });
  });

  describe('getDeadLetterCount', () => {
    it('counts DEAD_LETTER rows', async () => {
      vi.mocked(databaseService.count).mockResolvedValue(2);
      await expect(svc.getDeadLetterCount()).resolves.toBe(2);
      expect(databaseService.count).toHaveBeenCalledWith('network_queue', {
        eq: { status: QueueEntryStatus.DEAD_LETTER },
      });
    });
  });
});
