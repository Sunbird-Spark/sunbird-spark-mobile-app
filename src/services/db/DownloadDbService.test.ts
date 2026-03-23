import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadDbService } from './DownloadDbService';
import { DatabaseService } from './DatabaseService';
import { DownloadState } from '../download_manager/types';
import type { DownloadQueueEntry } from '../download_manager/types';

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

function makeEntry(overrides: Partial<DownloadQueueEntry> = {}): DownloadQueueEntry {
  return {
    identifier: 'do_123',
    parent_identifier: null,
    download_url: 'https://example.com/file.ecar',
    filename: 'file.ecar',
    mime_type: 'application/ecar',
    file_path: null,
    state: DownloadState.QUEUED,
    progress: 0,
    bytes_downloaded: 0,
    total_bytes: 0,
    retry_count: 0,
    max_retries: 3,
    last_error: null,
    content_meta: null,
    priority: 0,
    cancelled_by_user: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  };
}

describe('DownloadDbService', () => {
  let db: DatabaseService;
  let svc: DownloadDbService;

  beforeEach(() => {
    db = makeMockDb();
    svc = new DownloadDbService(db);
  });

  // ── insert ──

  describe('insert', () => {
    it('calls db.insert with REPLACE on download_queue', async () => {
      const entry = makeEntry();
      await svc.insert(entry);
      expect(db.insert).toHaveBeenCalledOnce();
      const [table, , conflict] = vi.mocked(db.insert).mock.calls[0];
      expect(table).toBe('download_queue');
      expect(conflict).toBe('REPLACE');
    });
  });

  // ── getByIdentifier ──

  describe('getByIdentifier', () => {
    it('returns entry when found', async () => {
      const entry = makeEntry();
      vi.mocked(db.select).mockResolvedValue([entry]);
      const result = await svc.getByIdentifier('do_123');
      expect(result).toEqual(entry);
      expect(db.select).toHaveBeenCalledWith('download_queue', {
        where: { eq: { identifier: 'do_123' } },
        limit: 1,
      });
    });

    it('returns null when not found', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      expect(await svc.getByIdentifier('missing')).toBeNull();
    });
  });

  // ── getByState ──

  describe('getByState', () => {
    it('queries by state', async () => {
      await svc.getByState(DownloadState.DOWNLOADING);
      expect(db.select).toHaveBeenCalledWith('download_queue', {
        where: { eq: { state: 'DOWNLOADING' } },
      });
    });
  });

  // ── getByParent ──

  describe('getByParent', () => {
    it('queries by parent_identifier', async () => {
      await svc.getByParent('do_parent');
      expect(db.select).toHaveBeenCalledWith('download_queue', {
        where: { eq: { parent_identifier: 'do_parent' } },
      });
    });
  });

  // ── getNextQueued ──

  describe('getNextQueued', () => {
    it('selects QUEUED ordered by priority DESC, created_at ASC with limit', async () => {
      await svc.getNextQueued(3);
      expect(db.select).toHaveBeenCalledWith('download_queue', {
        where: { eq: { state: 'QUEUED' } },
        orderBy: [
          { column: 'priority', direction: 'DESC' },
          { column: 'created_at', direction: 'ASC' },
        ],
        limit: 3,
      });
    });
  });

  // ── update ──

  describe('update', () => {
    it('calls db.update with updated_at appended', async () => {
      const before = Date.now();
      await svc.update('do_123', { progress: 50 });
      const after = Date.now();

      expect(db.update).toHaveBeenCalledOnce();
      const [table, data, where] = vi.mocked(db.update).mock.calls[0];
      expect(table).toBe('download_queue');
      expect(data.progress).toBe(50);
      expect(data.updated_at).toBeGreaterThanOrEqual(before);
      expect(data.updated_at).toBeLessThanOrEqual(after);
      expect(where).toEqual({ eq: { identifier: 'do_123' } });
    });
  });

  // ── delete ──

  describe('delete', () => {
    it('deletes by identifier', async () => {
      await svc.delete('do_123');
      expect(db.delete).toHaveBeenCalledWith('download_queue', { eq: { identifier: 'do_123' } });
    });
  });

  // ── countActive ──

  describe('countActive', () => {
    it('counts entries with active states', async () => {
      vi.mocked(db.count).mockResolvedValue(5);
      const result = await svc.countActive();
      expect(result).toBe(5);
      expect(db.count).toHaveBeenCalledWith('download_queue', {
        in: {
          state: ['QUEUED', 'DOWNLOADING', 'PAUSED', 'DOWNLOADED', 'IMPORTING', 'RETRY_WAIT'],
        },
      });
    });
  });

  // ── cleanupOlderThan ──

  describe('cleanupOlderThan', () => {
    it('deletes completed/failed entries older than cutoff', async () => {
      const cutoffMs = 86400000; // 24h
      const before = Date.now();
      await svc.cleanupOlderThan(cutoffMs);

      const [table, where] = vi.mocked(db.delete).mock.calls[0];
      expect(table).toBe('download_queue');
      expect(where!.in!.state).toEqual(['COMPLETED', 'FAILED']);
      expect(where!.lt!.updated_at).toBeLessThanOrEqual(before - cutoffMs + 1);
    });
  });

  // ── wasCancelledByUser ──

  describe('wasCancelledByUser', () => {
    it('returns true when cancelled entry exists', async () => {
      vi.mocked(db.select).mockResolvedValue([{ cancelled_by_user: 1 }]);
      expect(await svc.wasCancelledByUser('do_123')).toBe(true);
    });

    it('returns false when no cancelled entry', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      expect(await svc.wasCancelledByUser('do_123')).toBe(false);
    });
  });

  // ── getAll ──

  describe('getAll', () => {
    it('calls db.select with no filters', async () => {
      await svc.getAll();
      expect(db.select).toHaveBeenCalledWith('download_queue');
    });
  });
});
