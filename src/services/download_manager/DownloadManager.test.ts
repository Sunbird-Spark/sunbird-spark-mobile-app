import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadManager } from './DownloadManager';
import { DownloadDbService } from '../db/DownloadDbService';
import { ImportService } from './ImportService';
import { DownloadState } from './types';
import type { DownloadQueueEntry, DownloadListener } from './types';

// Mock native dependencies
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    deleteFile: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 1024 }),
    getUri: vi.fn().mockResolvedValue({ uri: 'file:///mock/path/file.ecar' }),
  },
  Directory: { Data: 'DATA' },
}));
vi.mock('@capgo/capacitor-downloader', () => ({
  CapacitorDownloader: {
    download: vi.fn().mockResolvedValue({ id: 'do_123' }),
    stop: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
  }
}));

vi.mock('../db/DownloadDbService', () => ({
  DownloadDbService: vi.fn(),
  downloadDbService: {},
}));
vi.mock('../network/networkService', () => ({
  networkService: {
    subscribe: vi.fn().mockReturnValue(() => {}),
  },
}));
vi.mock('./ImportService', () => ({
  ImportService: vi.fn(),
  importService: {},
}));

function makeMockDownloadDb(): DownloadDbService {
  return {
    insert: vi.fn().mockResolvedValue(undefined),
    getByIdentifier: vi.fn().mockResolvedValue(null),
    getByState: vi.fn().mockResolvedValue([]),
    getByParent: vi.fn().mockResolvedValue([]),
    getNextQueued: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    countActive: vi.fn().mockResolvedValue(0),
    getAll: vi.fn().mockResolvedValue([]),
    cleanupOlderThan: vi.fn().mockResolvedValue(undefined),
    wasCancelledByUser: vi.fn().mockResolvedValue(false),
  } as unknown as DownloadDbService;
}

function makeMockImportService(): ImportService {
  return {
    import: vi.fn().mockResolvedValue({ status: 'SUCCESS', identifiers: [] }),
  } as unknown as ImportService;
}

function makeMockNetworkService() {
  return {
    subscribe: vi.fn().mockReturnValue(() => {}),
  };
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

describe('DownloadManager', () => {
  let dlDb: DownloadDbService;
  let importSvc: ImportService;
  let networkSvc: ReturnType<typeof makeMockNetworkService>;
  let manager: DownloadManager;

  beforeEach(() => {
    vi.clearAllMocks();
    dlDb = makeMockDownloadDb();
    importSvc = makeMockImportService();
    networkSvc = makeMockNetworkService();
    manager = new DownloadManager(dlDb, networkSvc as any, importSvc);
  });

  // ── init ──

  describe('init', () => {
    it('subscribes to network and recovers crashed entries', async () => {
      await manager.init();
      expect(networkSvc.subscribe).toHaveBeenCalledOnce();
    });

    it('does not init twice', async () => {
      await manager.init();
      await manager.init();
      expect(networkSvc.subscribe).toHaveBeenCalledOnce();
    });
  });

  // ── enqueue ──

  describe('enqueue', () => {
    it('inserts new entries into the queue', async () => {
      await manager.init();
      await manager.enqueue([
        {
          identifier: 'do_new',
          downloadUrl: 'https://ex.com/a.ecar',
          filename: 'a.ecar',
          mimeType: 'application/ecar',
        },
      ]);

      expect(dlDb.insert).toHaveBeenCalledOnce();
      const insertedEntry = vi.mocked(dlDb.insert).mock.calls[0][0] as DownloadQueueEntry;
      expect(insertedEntry.identifier).toBe('do_new');
      expect(insertedEntry.state).toBe(DownloadState.QUEUED);
    });

    it('skips entries cancelled by user', async () => {
      vi.mocked(dlDb.wasCancelledByUser).mockResolvedValue(true);
      await manager.init();
      await manager.enqueue([
        {
          identifier: 'do_cancelled',
          downloadUrl: 'https://ex.com/b.ecar',
          filename: 'b.ecar',
          mimeType: 'application/ecar',
        },
      ]);

      expect(dlDb.insert).not.toHaveBeenCalled();
    });

    it('skips entries already in active state', async () => {
      vi.mocked(dlDb.wasCancelledByUser).mockResolvedValue(false);
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(
        makeEntry({ state: DownloadState.DOWNLOADING })
      );

      await manager.init();
      await manager.enqueue([
        {
          identifier: 'do_active',
          downloadUrl: 'https://ex.com/c.ecar',
          filename: 'c.ecar',
          mimeType: 'application/ecar',
        },
      ]);

      expect(dlDb.insert).not.toHaveBeenCalled();
    });

    it('re-enqueues FAILED entries', async () => {
      vi.mocked(dlDb.wasCancelledByUser).mockResolvedValue(false);
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(
        makeEntry({ state: DownloadState.FAILED })
      );

      await manager.init();
      await manager.enqueue([
        {
          identifier: 'do_failed',
          downloadUrl: 'https://ex.com/d.ecar',
          filename: 'd.ecar',
          mimeType: 'application/ecar',
        },
      ]);

      expect(dlDb.insert).toHaveBeenCalledOnce();
    });
  });

  // ── cancel ──

  describe('cancel', () => {
    it('cancels a QUEUED entry and sets cancelled_by_user', async () => {
      const entry = makeEntry({ state: DownloadState.QUEUED });
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);

      await manager.init();
      await manager.cancel('do_123');

      expect(dlDb.update).toHaveBeenCalledWith('do_123', expect.objectContaining({
        cancelled_by_user: 1,
      }));
    });

    it('no-op for COMPLETED entry', async () => {
      const entry = makeEntry({ state: DownloadState.COMPLETED });
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);

      await manager.init();
      await manager.cancel('do_123');

      // Only the crash recovery update calls should be there, not a cancellation
      const updateCalls = vi.mocked(dlDb.update).mock.calls;
      const cancelCalls = updateCalls.filter(
        ([, data]) => (data as any).cancelled_by_user === 1
      );
      expect(cancelCalls).toHaveLength(0);
    });

    it('returns silently for non-existent entry', async () => {
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(null);
      await manager.init();
      await expect(manager.cancel('do_missing')).resolves.not.toThrow();
    });
  });

  // ── retry ──

  describe('retry', () => {
    it('resets FAILED entry to QUEUED', async () => {
      const entry = makeEntry({ state: DownloadState.FAILED, retry_count: 3 });
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);

      await manager.init();
      await manager.retry('do_123');

      expect(dlDb.update).toHaveBeenCalledWith(
        'do_123',
        expect.objectContaining({
          cancelled_by_user: 0,
          retry_count: 0,
          state: DownloadState.QUEUED,
        })
      );
    });

    it('resets CANCELLED entry to QUEUED', async () => {
      const entry = makeEntry({
        state: DownloadState.CANCELLED,
        cancelled_by_user: 1,
      });
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);

      await manager.init();
      await manager.retry('do_123');

      expect(dlDb.update).toHaveBeenCalledWith(
        'do_123',
        expect.objectContaining({
          cancelled_by_user: 0,
          state: DownloadState.QUEUED,
        })
      );
    });

    it('does nothing for DOWNLOADING entry', async () => {
      const entry = makeEntry({ state: DownloadState.DOWNLOADING });
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);

      await manager.init();
      await manager.retry('do_123');

      // No state change for DOWNLOADING
      const updateCalls = vi.mocked(dlDb.update).mock.calls.filter(
        ([, data]) => (data as any).state === DownloadState.QUEUED
      );
      expect(updateCalls).toHaveLength(0);
    });
  });

  // ── subscribe / events ──

  describe('subscribe', () => {
    it('adds and removes listeners', async () => {
      const listener: DownloadListener = vi.fn();
      const unsub = manager.subscribe(listener);

      await manager.init();
      await manager.enqueue([
        {
          identifier: 'do_test',
          downloadUrl: 'https://ex.com/e.ecar',
          filename: 'e.ecar',
          mimeType: 'application/ecar',
        },
      ]);

      // Should have received queue_changed and possibly other events
      expect(listener).toHaveBeenCalled();

      unsub();
      vi.mocked(listener).mockClear();

      await manager.enqueue([
        {
          identifier: 'do_test2',
          downloadUrl: 'https://ex.com/f.ecar',
          filename: 'f.ecar',
          mimeType: 'application/ecar',
        },
      ]);

      // Should not receive events after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ── query methods ──

  describe('getProgress', () => {
    it('returns progress for existing entry', async () => {
      const entry = makeEntry({ progress: 50, bytes_downloaded: 500, total_bytes: 1000 });
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);

      const progress = await manager.getProgress('do_123');
      expect(progress).toEqual({
        identifier: 'do_123',
        parentIdentifier: undefined,
        state: DownloadState.QUEUED,
        progress: 50,
        bytesDownloaded: 500,
        totalBytes: 1000,
      });
    });

    it('returns null for non-existent entry', async () => {
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(null);
      expect(await manager.getProgress('missing')).toBeNull();
    });
  });

  describe('getAggregateProgress', () => {
    it('calculates aggregate correctly', async () => {
      vi.mocked(dlDb.getByParent).mockResolvedValue([
        makeEntry({ progress: 100, state: DownloadState.COMPLETED }),
        makeEntry({ identifier: 'do_2', progress: 50, state: DownloadState.DOWNLOADING }),
      ]);

      const agg = await manager.getAggregateProgress('do_parent');
      expect(agg.completed).toBe(1);
      expect(agg.total).toBe(2);
      expect(agg.overallPercent).toBe(75);
    });

    it('returns zeros when no children', async () => {
      vi.mocked(dlDb.getByParent).mockResolvedValue([]);
      const agg = await manager.getAggregateProgress('do_parent');
      expect(agg).toEqual({
        parentIdentifier: 'do_parent',
        completed: 0,
        total: 0,
        overallPercent: 0,
      });
    });
  });

  // ── settings ──

  describe('settings', () => {
    it('setMaxConcurrent enforces minimum of 1', () => {
      manager.setMaxConcurrent(0);
      // No assertion on private field, but it shouldn't throw
    });

    it('setWifiOnly stores the preference', () => {
      manager.setWifiOnly(true);
      // No assertion on private field, but it shouldn't throw
    });
  });

  // ── destroy ──

  describe('destroy', () => {
    it('clears state', async () => {
      await manager.init();
      await manager.destroy();
      // Should be able to re-init after destroy
      await manager.init();
      expect(networkSvc.subscribe).toHaveBeenCalledTimes(2);
    });
  });

  // ── wasCancelledByUser ──

  describe('wasCancelledByUser', () => {
    it('delegates to downloadDb', async () => {
      vi.mocked(dlDb.wasCancelledByUser).mockResolvedValue(true);
      expect(await manager.wasCancelledByUser('do_123')).toBe(true);
    });
  });

  // ── retryAllFailed ──

  describe('retryAllFailed', () => {
    it('retries all FAILED entries', async () => {
      const failed = [
        makeEntry({ identifier: 'do_f1', state: DownloadState.FAILED }),
        makeEntry({ identifier: 'do_f2', state: DownloadState.FAILED }),
      ];
      vi.mocked(dlDb.getByState).mockResolvedValue(failed);
      vi.mocked(dlDb.getByIdentifier)
        .mockResolvedValueOnce(failed[0])
        .mockResolvedValueOnce(failed[1]);

      await manager.init();
      await manager.retryAllFailed();

      // Should have updated both entries to QUEUED
      const queuedCalls = vi.mocked(dlDb.update).mock.calls.filter(
        ([, data]) => (data as any).state === DownloadState.QUEUED
      );
      expect(queuedCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
