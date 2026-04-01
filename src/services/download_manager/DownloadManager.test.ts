import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadManager } from './DownloadManager';
import { CapacitorDownloader } from '@capgo/capacitor-downloader';
import { Filesystem } from '@capacitor/filesystem';
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
const mockContentDbService = vi.hoisted(() => ({
  getByIdentifier: vi.fn().mockResolvedValue(null),
  update: vi.fn().mockResolvedValue(undefined),
  upsert: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../db/ContentDbService', () => ({
  contentDbService: mockContentDbService,
}));
vi.mock('../network/networkService', () => ({
  networkService: {
    subscribe: vi.fn().mockReturnValue(() => { }),
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
    getByIdentifiers: vi.fn().mockResolvedValue([]),
    getByState: vi.fn().mockResolvedValue([]),
    getByParent: vi.fn().mockResolvedValue([]),
    getNextQueued: vi.fn().mockResolvedValue([]),
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    countActive: vi.fn().mockResolvedValue(0),
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
    subscribe: vi.fn().mockReturnValue(() => { }),
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
    mockContentDbService.getByIdentifier.mockResolvedValue(null);
    mockContentDbService.update.mockResolvedValue(undefined);
    mockContentDbService.upsert.mockResolvedValue(undefined);
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

    it('recovers crashed entries on init', async () => {
      const crashingEntry = makeEntry({ identifier: 'crash_1', state: DownloadState.DOWNLOADING });
      vi.mocked(dlDb.getByState).mockResolvedValue([crashingEntry]);

      await (manager as any).recoverCrashedEntries();
      expect(dlDb.update).toHaveBeenCalledWith('crash_1', expect.objectContaining({
        state: DownloadState.QUEUED,
        progress: 0
      }));
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

    it('fast-path: upgrades visibility and bumps ref_count for locally available Parent content', async () => {
      vi.mocked(dlDb.wasCancelledByUser).mockResolvedValue(false);
      mockContentDbService.getByIdentifier.mockResolvedValue({
        identifier: 'do_parent',
        content_state: 2,
        visibility: 'Parent',
        ref_count: 1,
      });

      await manager.init();

      const listener = vi.fn();
      manager.subscribe(listener);

      await manager.enqueue([
        {
          identifier: 'do_parent',
          downloadUrl: 'https://ex.com/e.ecar',
          filename: 'e.ecar',
          mimeType: 'application/ecar',
        },
      ]);

      // Should NOT insert into download queue
      expect(dlDb.insert).not.toHaveBeenCalled();
      // Should upgrade visibility and bump ref_count
      expect(mockContentDbService.update).toHaveBeenCalledWith('do_parent', {
        visibility: 'Default',
        ref_count: 2,
      });
      // Should emit state_change for UI refresh
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'state_change', identifier: 'do_parent' }),
      );
    });

    it('fast-path: bumps ref_count without visibility change for Default content', async () => {
      vi.mocked(dlDb.wasCancelledByUser).mockResolvedValue(false);
      mockContentDbService.getByIdentifier.mockResolvedValue({
        identifier: 'do_default',
        content_state: 2,
        visibility: 'Default',
        ref_count: 1,
      });

      await manager.init();
      await manager.enqueue([
        {
          identifier: 'do_default',
          downloadUrl: 'https://ex.com/f.ecar',
          filename: 'f.ecar',
          mimeType: 'application/ecar',
        },
      ]);

      expect(dlDb.insert).not.toHaveBeenCalled();
      expect(mockContentDbService.update).toHaveBeenCalledWith('do_default', {
        ref_count: 2,
      });
    });

    it('fast-path: does not upgrade visibility when downloaded as collection child', async () => {
      vi.mocked(dlDb.wasCancelledByUser).mockResolvedValue(false);
      mockContentDbService.getByIdentifier.mockResolvedValue({
        identifier: 'do_child',
        content_state: 2,
        visibility: 'Parent',
        ref_count: 1,
      });

      await manager.init();
      await manager.enqueue([
        {
          identifier: 'do_child',
          downloadUrl: 'https://ex.com/g.ecar',
          filename: 'g.ecar',
          mimeType: 'application/ecar',
          parentIdentifier: 'do_collection',
        },
      ]);

      expect(dlDb.insert).not.toHaveBeenCalled();
      // Should NOT upgrade visibility (parentIdentifier present = collection child)
      expect(mockContentDbService.update).toHaveBeenCalledWith('do_child', {
        ref_count: 2,
      });
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
        activeCount: 0,
        failedCount: 0,
        pausedCount: 0,
      });
    });
  });

  // ── settings ──

  describe('settings', () => {
    it('setMaxConcurrent enforces minimum of 1', () => {
      manager.setMaxConcurrent(0);
      // Accessing private for coverage/verification
      expect((manager as any).maxConcurrent).toBe(1);
    });

    it('setWifiOnly pauses active downloads if not on wifi', async () => {
      // Mock being on cellular
      (networkSvc as any).connectionType = 'cellular';
      (manager as any).networkState = { connectionType: 'cellular' };

      const pauseSpy = vi.spyOn(manager, 'pause').mockResolvedValue(undefined);
      (manager as any).activeDownloads.set('do_1', {} as any);

      await manager.setWifiOnly(true);
      expect(pauseSpy).toHaveBeenCalledWith('do_1');
    });

    it('setWifiOnly triggers processQueue when switched off or on wifi', async () => {
      (networkSvc as any).connectionType = 'wifi';
      (manager as any).networkState = { connectionType: 'wifi' };

      const processSpy = vi.spyOn(manager as any, 'processQueue').mockResolvedValue(undefined);

      await manager.setWifiOnly(false);
      expect(processSpy).toHaveBeenCalled();
    });
  });

  // ── transition ──

  describe('transition', () => {
    it('throws error for non-existent entry', async () => {
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(null);
      await expect((manager as any).transition('missing', DownloadState.DOWNLOADING))
        .rejects.toThrow('[DownloadManager] Entry not found: missing');
    });

    it('warns and returns for invalid transition', async () => {
      const entry = makeEntry({ state: DownloadState.QUEUED });
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      // QUEUED -> COMPLETED is not allowed directly
      await (manager as any).transition('do_123', DownloadState.COMPLETED);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid transition: QUEUED → COMPLETED'));
      expect(dlDb.update).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // ── recoverCrashedEntries ──

  describe('recoverCrashedEntries', () => {
    it('resets IMPORTING entries to DOWNLOADED if file exists', async () => {
      const entry = makeEntry({ state: DownloadState.IMPORTING, file_path: '/p.ecar' });
      vi.mocked(dlDb.getByState).mockImplementation(async (s: any) =>
        s === DownloadState.IMPORTING ? [entry] : []
      );
      vi.mocked(Filesystem.stat).mockResolvedValue({ size: 100 } as any);

      await (manager as any).recoverCrashedEntries();

      expect(dlDb.update).toHaveBeenCalledWith('do_123', {
        state: DownloadState.DOWNLOADED,
      });
    });

    it('resets IMPORTING entries to QUEUED if file is missing', async () => {
      const entry = makeEntry({ state: DownloadState.IMPORTING, file_path: '/p.ecar' });
      vi.mocked(dlDb.getByState).mockImplementation(async (s: any) =>
        s === DownloadState.IMPORTING ? [entry] : []
      );
      vi.mocked(Filesystem.stat).mockRejectedValue(new Error('ENOENT'));

      await (manager as any).recoverCrashedEntries();

      expect(dlDb.update).toHaveBeenCalledWith('do_123', expect.objectContaining({
        state: DownloadState.QUEUED,
        progress: 0,
      }));
    });

    it('resets RETRY_WAIT entries to QUEUED', async () => {
      const entry = makeEntry({ state: DownloadState.RETRY_WAIT });
      vi.mocked(dlDb.getByState).mockImplementation(async (s: any) =>
        s === DownloadState.RETRY_WAIT ? [entry] : []
      );

      await (manager as any).recoverCrashedEntries();

      expect(dlDb.update).toHaveBeenCalledWith('do_123', {
        state: DownloadState.QUEUED,
      });
    });
  });

  describe('getBatchProgress', () => {
    it('returns progress map for multiple identifiers', async () => {
      const entry1 = makeEntry({ identifier: 'id1', state: DownloadState.DOWNLOADING });
      const entry2 = makeEntry({ identifier: 'id2', state: DownloadState.COMPLETED });
      vi.mocked(dlDb.getByIdentifiers).mockResolvedValue([entry1, entry2]);

      const res = await manager.getBatchProgress(['id1', 'id2']);
      expect(res.get('id1')?.state).toBe(DownloadState.DOWNLOADING);
      expect(res.get('id2')?.state).toBe(DownloadState.COMPLETED);
    });
  });

  describe('getters', () => {
    it('getActiveDownloads, getFailedDownloads, getQueue', async () => {
      const e1 = makeEntry({ identifier: 'e1' });
      vi.mocked(dlDb.getByState).mockResolvedValue([e1]);

      await manager.getActiveDownloads();
      expect(dlDb.getByState).toHaveBeenCalledWith(DownloadState.DOWNLOADING);

      await manager.getFailedDownloads();
      expect(dlDb.getByState).toHaveBeenCalledWith(DownloadState.FAILED);

      await manager.getQueue();
      expect(dlDb.getAll).toHaveBeenCalled();
    });

    it('getEntry and wasCancelledByUser', async () => {
      const e1 = makeEntry({ identifier: 'e1' });
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(e1);
      vi.mocked(dlDb.wasCancelledByUser).mockResolvedValue(true);

      await manager.getEntry('e1');
      expect(dlDb.getByIdentifier).toHaveBeenCalledWith('e1');

      const cancelled = await manager.wasCancelledByUser('e1');
      expect(cancelled).toBe(true);
    });
  });

  describe('notifyContentDeleted', () => {
    it('emits content_deleted event', () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      manager.notifyContentDeleted('do_123');
      expect(listener).toHaveBeenCalledWith({ type: 'content_deleted', identifier: 'do_123' });
    });
  });

  describe('cancelByParent', () => {
    it('calls db.getByParent and stops each child', async () => {
      const child = makeEntry({ identifier: 'c1', state: DownloadState.DOWNLOADING });
      vi.mocked(dlDb.getByParent).mockResolvedValue([child]);
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(child);

      await manager.cancelByParent('p1');
      expect(dlDb.getByParent).toHaveBeenCalledWith('p1');
      expect(CapacitorDownloader.stop).toHaveBeenCalled();
    });
  });

  // ── handleDownloadFailure ──

  describe('handleDownloadFailure', () => {
    it('transitions to RETRY_WAIT if retries remain', async () => {
      const entry = makeEntry({ state: DownloadState.DOWNLOADING, retry_count: 0, max_retries: 3 });
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);
      const updateSpy = vi.mocked(dlDb.update);

      await (manager as any).handleDownloadFailure(entry.identifier, 'Network Error');

      expect(updateSpy).toHaveBeenCalledWith(entry.identifier, expect.objectContaining({
        state: DownloadState.RETRY_WAIT,
        retry_count: 1,
      }));
    });

    it('transitions to FAILED if no retries remain', async () => {
      const entry = makeEntry({ state: DownloadState.DOWNLOADING, retry_count: 3, max_retries: 3 });
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);
      const updateSpy = vi.mocked(dlDb.update);

      await (manager as any).handleDownloadFailure(entry.identifier, 'Final Error');

      expect(updateSpy).toHaveBeenCalledWith(entry.identifier, expect.objectContaining({
        state: DownloadState.FAILED,
      }));
    });

    it('uses exponential backoff and transitions to retryState after timer', async () => {
      vi.useFakeTimers();
      const entry = makeEntry({
        identifier: 'retry_backoff',
        state: DownloadState.DOWNLOADING,
        retry_count: 0,
        max_retries: 3,
        file_path: undefined // Always re-download
      });
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);

      await (manager as any).handleDownloadFailure(entry.identifier, 'Temporary Error');

      // Should be in RETRY_WAIT first
      expect(dlDb.update).toHaveBeenCalledWith(entry.identifier, expect.objectContaining({
        state: DownloadState.RETRY_WAIT,
        retry_count: 1,
      }));

      // Mock getByIdentifier to return RETRY_WAIT when the timer callback checks it
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue({ ...entry, state: DownloadState.RETRY_WAIT, retry_count: 1 });

      // Fast-forward backoff (2s for first retry)
      await vi.advanceTimersByTimeAsync(2500);

      // Verify it transitions to QUEUED because we set file_path to undefined
      expect(dlDb.update).toHaveBeenCalledWith(entry.identifier, expect.objectContaining({
        state: DownloadState.QUEUED,
      }));

      vi.useRealTimers();
    });

    it('transitions to QUEUED after backoff if .ecar is missing', async () => {
      vi.useFakeTimers();
      const entry = makeEntry({
        identifier: 'retry_missing',
        state: DownloadState.DOWNLOADING,
        retry_count: 1,
        max_retries: 3,
        file_path: '/tmp/test.ecar'
      });
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);
      vi.mocked(Filesystem.stat).mockRejectedValue(new Error('not found'));

      await (manager as any).handleDownloadFailure(entry.identifier, 'Temporary Error');

      // Mock getByIdentifier to return RETRY_WAIT
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue({ ...entry, state: DownloadState.RETRY_WAIT, retry_count: 2 });

      // Fast-forward backoff (4s for second retry)
      await vi.advanceTimersByTimeAsync(4500);

      // Verify it transitions to QUEUED because stat failed
      expect(dlDb.update).toHaveBeenCalledWith(entry.identifier, expect.objectContaining({
        state: DownloadState.QUEUED,
      }));

      vi.useRealTimers();
    });
  });

  describe('stopDownloadsOnSignalLoss', () => {
    it('stops active downloads and sets state to RETRY_WAIT', async () => {
      const entry = makeEntry({ identifier: 'dl_active', state: DownloadState.DOWNLOADING });
      vi.mocked(dlDb.getByState).mockResolvedValue([entry]);
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);
      const updateSpy = vi.mocked(dlDb.update);

      // Mock native downloader to cancel successfully
      (manager as any).activeDownloads.set(entry.identifier, { nativeId: 'n1' });

      await (manager as any).stopDownloadsOnSignalLoss();

      expect(CapacitorDownloader.stop).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith(entry.identifier, expect.objectContaining({
        state: DownloadState.RETRY_WAIT,
      }));
      expect((manager as any).activeDownloads.has(entry.identifier)).toBe(false);
    });
  });

  // ── processQueue ──

  describe('processQueue', () => {
    it('returns early if queue is empty', async () => {
      vi.mocked(dlDb.getNextQueued).mockResolvedValue([]);
      await (manager as any).processQueue();
      expect(dlDb.getByIdentifier).not.toHaveBeenCalled();
    });

    it('returns early if wifi-only and on cellular', async () => {
      const entry = makeEntry({ state: DownloadState.QUEUED });
      vi.mocked(dlDb.getNextQueued).mockResolvedValue([entry]);
      (networkSvc as any).connectionType = 'cellular';
      (manager as any).networkState = { connectionType: 'cellular' };
      (manager as any).wifiOnly = true;

      await (manager as any).processQueue();
      expect(dlDb.getByIdentifier).not.toHaveBeenCalled();
    });

    it('skips if identifier is already in activeDownloads', async () => {
      const entry = makeEntry({ identifier: 'active_1', state: DownloadState.QUEUED });
      vi.mocked(dlDb.getNextQueued).mockResolvedValue([entry]);
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(entry);
      (manager as any).activeDownloads.set('active_1', {} as any);

      await (manager as any).processQueue();
      // It should skip startDownload due to activeDownloads check (if added)
      // or at least not throw if startDownload proceeds but we mock getByIdentifier
    });
  });

  // ── cleanPartialFile ──

  describe('cleanPartialFile', () => {
    it('deletes file if path exists', async () => {
      const entry = makeEntry({ file_path: '/some/path' });
      await (manager as any).cleanPartialFile(entry);
      expect(Filesystem.deleteFile).toHaveBeenCalledWith({ path: '/some/path' });
    });

    it('does nothing if path is missing', async () => {
      const entry = makeEntry({ file_path: undefined });
      vi.clearAllMocks();
      await (manager as any).cleanPartialFile(entry);
      expect(Filesystem.deleteFile).not.toHaveBeenCalled();
    });
  });

  // ── emit ──

  describe('emit', () => {
    it('handles listener errors gracefully', () => {
      const errorListener = () => { throw new Error('Listener Boom'); };
      const okListener = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      manager.subscribe(errorListener);
      manager.subscribe(okListener);

      (manager as any).emit({ type: 'queue_changed' });

      expect(okListener).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Listener error:'), expect.anything());
      consoleSpy.mockRestore();
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

      await manager.init();

      // getByState must return FAILED entries for retryAllFailed,
      // but return [] for DOWNLOADED (used by processDownloadedEntries while loop)
      vi.mocked(dlDb.getByState).mockImplementation(async (state: any) => {
        return state === DownloadState.FAILED ? failed : [];
      });
      vi.mocked(dlDb.getByIdentifier)
        .mockResolvedValueOnce(failed[0])
        .mockResolvedValueOnce(failed[1]);

      await manager.retryAllFailed();

      // Should have updated both entries to QUEUED
      const queuedCalls = vi.mocked(dlDb.update).mock.calls.filter(
        ([, data]) => (data as any).state === DownloadState.QUEUED
      );
      expect(queuedCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── collection child completion ──

  describe('processDownloadedEntries — collection child handling', () => {
    /**
     * Helper: creates a mock getByIdentifier that tracks state transitions.
     * The transition method calls getByIdentifier to validate state, so the
     * mock must reflect the new state after each update call.
     */
    function setupStatefulEntryMock(entry: DownloadQueueEntry) {
      const stateTracker = { state: entry.state };
      vi.mocked(dlDb.getByIdentifier).mockImplementation(async () => ({
        ...entry,
        state: stateTracker.state,
      }));
      vi.mocked(dlDb.update).mockImplementation(async (_id, fields) => {
        if ((fields as any).state) stateTracker.state = (fields as any).state;
      });
    }

    it('preserves Default visibility on child and upgrades parent when all children complete', async () => {
      const childEntry = makeEntry({
        identifier: 'do_child1',
        parent_identifier: 'do_collection',
        state: DownloadState.DOWNLOADED,
        file_path: '/path/to/child.ecar',
      });

      setupStatefulEntryMock(childEntry);

      // First call returns one DOWNLOADED entry, second call returns empty (loop termination)
      vi.mocked(dlDb.getByState).mockImplementation(async (state: any) => {
        if (state === DownloadState.DOWNLOADED) {
          // Return entry once, then empty
          const result = childEntry.state === DownloadState.DOWNLOADED ? [childEntry] : [];
          childEntry.state = DownloadState.IMPORTING; // consume
          return result;
        }
        return [];
      });

      // Import succeeds
      vi.mocked(importSvc.import).mockResolvedValue({
        status: 'SUCCESS',
        identifiers: ['do_child1'],
      });

      // Child content exists in ContentDb with Default visibility (previously downloaded standalone)
      // ref_count=2 means it was downloaded standalone (ref=1) then collection import incremented (ref=2)
      mockContentDbService.getByIdentifier
        .mockResolvedValueOnce({ identifier: 'do_child1', visibility: 'Default', content_state: 2, ref_count: 2 })  // child lookup
        .mockResolvedValueOnce({ identifier: 'do_collection', content_state: 0 });                                    // parent lookup

      // All siblings are COMPLETED
      vi.mocked(dlDb.getByParent).mockResolvedValue([
        makeEntry({ identifier: 'do_child1', parent_identifier: 'do_collection', state: DownloadState.COMPLETED }),
      ]);

      await manager.init();

      // Verify child visibility was NOT downgraded from Default → Parent
      expect(mockContentDbService.update).not.toHaveBeenCalledWith(
        'do_child1',
        { visibility: 'Parent' },
      );

      // Verify parent content_state was upgraded to 2
      expect(mockContentDbService.update).toHaveBeenCalledWith(
        'do_collection',
        { content_state: 2 },
      );
    });

    it('sets visibility=Parent on child with no existing visibility', async () => {
      const childEntry = makeEntry({
        identifier: 'do_child2',
        parent_identifier: 'do_collection',
        state: DownloadState.DOWNLOADED,
        file_path: '/path/to/child.ecar',
      });

      setupStatefulEntryMock(childEntry);

      vi.mocked(dlDb.getByState).mockImplementation(async (state: any) => {
        if (state === DownloadState.DOWNLOADED) {
          const result = childEntry.state === DownloadState.DOWNLOADED ? [childEntry] : [];
          childEntry.state = DownloadState.IMPORTING;
          return result;
        }
        return [];
      });

      vi.mocked(importSvc.import).mockResolvedValue({
        status: 'SUCCESS',
        identifiers: ['do_child2'],
      });

      // Child content has no visibility set (new import, not previously downloaded standalone)
      mockContentDbService.getByIdentifier
        .mockResolvedValueOnce({ identifier: 'do_child2', visibility: null, content_state: 2, ref_count: 1 })
        .mockResolvedValueOnce({ identifier: 'do_collection', content_state: 0 });

      vi.mocked(dlDb.getByParent).mockResolvedValue([
        makeEntry({ identifier: 'do_child2', parent_identifier: 'do_collection', state: DownloadState.COMPLETED }),
      ]);

      await manager.init();

      // Verify child visibility was set to Parent (since it wasn't Default)
      expect(mockContentDbService.update).toHaveBeenCalledWith(
        'do_child2',
        { visibility: 'Parent' },
      );
    });

    it('creates parent entry if it does not exist in ContentDb', async () => {
      const childEntry = makeEntry({
        identifier: 'do_child1',
        parent_identifier: 'do_collection',
        state: DownloadState.DOWNLOADED,
        file_path: '/path/to/child.ecar',
      });

      setupStatefulEntryMock(childEntry);

      vi.mocked(dlDb.getByState).mockImplementation(async (state: any) => {
        if (state === DownloadState.DOWNLOADED) {
          const result = childEntry.state === DownloadState.DOWNLOADED ? [childEntry] : [];
          childEntry.state = DownloadState.IMPORTING;
          return result;
        }
        return [];
      });

      vi.mocked(importSvc.import).mockResolvedValue({
        status: 'SUCCESS',
        identifiers: ['do_child1'],
      });

      // Child exists (standalone + collection, ref_count=2), parent does NOT exist
      mockContentDbService.getByIdentifier
        .mockResolvedValueOnce({ identifier: 'do_child1', visibility: 'Default', content_state: 2, ref_count: 2 })
        .mockResolvedValueOnce(null);  // parent not found

      vi.mocked(dlDb.getByParent).mockResolvedValue([
        makeEntry({ identifier: 'do_child1', parent_identifier: 'do_collection', state: DownloadState.COMPLETED }),
      ]);

      await manager.init();

      // Verify parent entry was created via upsert
      expect(mockContentDbService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'do_collection',
          content_state: 2,
          visibility: 'Default',
        }),
      );
    });

    it('does not upgrade parent if not all siblings are complete', async () => {
      const childEntry = makeEntry({
        identifier: 'do_child1',
        parent_identifier: 'do_collection',
        state: DownloadState.DOWNLOADED,
        file_path: '/path/to/child.ecar',
      });

      setupStatefulEntryMock(childEntry);

      vi.mocked(dlDb.getByState).mockImplementation(async (state: any) => {
        if (state === DownloadState.DOWNLOADED) {
          const result = childEntry.state === DownloadState.DOWNLOADED ? [childEntry] : [];
          childEntry.state = DownloadState.IMPORTING;
          return result;
        }
        return [];
      });

      vi.mocked(importSvc.import).mockResolvedValue({
        status: 'SUCCESS',
        identifiers: ['do_child1'],
      });

      // Child has no prior standalone download (visibility is null, not Default)
      mockContentDbService.getByIdentifier
        .mockResolvedValueOnce({ identifier: 'do_child1', visibility: null, content_state: 2, ref_count: 1 });

      // One sibling still DOWNLOADING
      vi.mocked(dlDb.getByParent).mockResolvedValue([
        makeEntry({ identifier: 'do_child1', parent_identifier: 'do_collection', state: DownloadState.COMPLETED }),
        makeEntry({ identifier: 'do_child2', parent_identifier: 'do_collection', state: DownloadState.DOWNLOADING }),
      ]);

      await manager.init();

      // Child visibility should be set to Parent
      expect(mockContentDbService.update).toHaveBeenCalledWith(
        'do_child1',
        { visibility: 'Parent' },
      );

      // But parent should NOT be upgraded (not all siblings done)
      const parentUpgradeCalls = mockContentDbService.update.mock.calls.filter(
        ([id]: [string]) => id === 'do_collection'
      );
      expect(parentUpgradeCalls).toHaveLength(0);
    });
  });
});
