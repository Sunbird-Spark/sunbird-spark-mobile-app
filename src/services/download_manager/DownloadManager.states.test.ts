import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DownloadManager } from './DownloadManager';
import { CapacitorDownloader } from '@capgo/capacitor-downloader';
import { Filesystem } from '@capacitor/filesystem';
import { DownloadDbService } from '../db/DownloadDbService';
import { ImportService } from './ImportService';
import { DownloadState } from './types';
import type { DownloadQueueEntry, DownloadEvent } from './types';

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    deleteFile: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 1024 }),
    getUri: vi.fn().mockResolvedValue({ uri: 'file:///mock/path/file.ecar' }),
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
  Directory: { Data: 'DATA', External: 'EXTERNAL' },
}));
vi.mock('@capgo/capacitor-downloader', () => ({
  CapacitorDownloader: {
    download: vi.fn().mockResolvedValue({ id: 'do_123' }),
    stop: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../db/DownloadDbService', () => ({ DownloadDbService: vi.fn(), downloadDbService: {} }));
const mockContentDb = vi.hoisted(() => ({
  getByIdentifier: vi.fn().mockResolvedValue(null),
  update: vi.fn().mockResolvedValue(undefined),
  upsert: vi.fn().mockResolvedValue(undefined),
  updateSizeOnDevice: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../db/ContentDbService', () => ({ contentDbService: mockContentDb }));
vi.mock('../network/networkService', () => ({
  networkService: { subscribe: vi.fn().mockReturnValue(() => { }) },
}));
vi.mock('./ImportService', () => ({ ImportService: vi.fn(), importService: {} }));

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
    created_at: 1,
    updated_at: 1,
    ...overrides,
  };
}

type PluginListeners = Record<string, (payload: any) => Promise<void> | void>;

describe('DownloadManager — state transitions', () => {
  let dlDb: DownloadDbService;
  let importSvc: ImportService;
  let networkSvc: { subscribe: ReturnType<typeof vi.fn> };
  let manager: DownloadManager;
  let listeners: PluginListeners;
  let events: DownloadEvent[];

  const only = (identifier: string, entry: DownloadQueueEntry | null) =>
    vi.mocked(dlDb.getByIdentifier).mockImplementation(async (id: string) =>
      (id === identifier ? entry : null),
    );

  /**
   * Backs `getByIdentifier` with a row that `update()` actually mutates, so
   * multi-step transitions (DOWNLOADED → IMPORTING → RETRY_WAIT → …) are
   * validated against the real state machine rather than a frozen snapshot.
   */
  const statefulRow = (entry: DownloadQueueEntry) => {
    const row = { ...entry };
    vi.mocked(dlDb.getByIdentifier).mockImplementation(async (id: string) =>
      (id === row.identifier ? { ...row } : null),
    );
    vi.mocked(dlDb.update).mockImplementation(async (id: string, fields: any) => {
      if (id === row.identifier) Object.assign(row, fields);
    });
    return row;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    listeners = {};
    events = [];
    vi.mocked(CapacitorDownloader.addListener).mockImplementation(((ev: string, cb: any) => {
      listeners[ev] = cb;
      return Promise.resolve({ remove: vi.fn() });
    }) as any);
    vi.mocked(Filesystem.stat).mockResolvedValue({ size: 1024 } as any);
    vi.mocked(Filesystem.getUri).mockResolvedValue({ uri: 'file:///mock/file.ecar' } as any);
    mockContentDb.getByIdentifier.mockResolvedValue(null);

    dlDb = makeMockDownloadDb();
    importSvc = { import: vi.fn().mockResolvedValue({ status: 'SUCCESS', identifiers: [] }) } as unknown as ImportService;
    networkSvc = { subscribe: vi.fn().mockReturnValue(() => { }) };
    manager = new DownloadManager(dlDb, networkSvc as any, importSvc);
    manager.subscribe((e) => events.push(e));
    await manager.init();
    events.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ══════════════════════════════════════════════
  //  Native plugin listeners
  // ══════════════════════════════════════════════

  describe('downloadProgress listener', () => {
    it('emits a progress event and persists the throttled byte count', async () => {
      only('do_123', makeEntry({ state: DownloadState.DOWNLOADING, total_bytes: 1000 }));
      await listeners.downloadProgress({ id: 'do_123', progress: 25 });

      expect(events[0]).toEqual({ type: 'progress', identifier: 'do_123' });
      expect(dlDb.update).toHaveBeenCalledWith('do_123', { progress: 25, bytes_downloaded: 250 });
    });

    it('skips the DB write for a repeated tick at the same percent', async () => {
      only('do_123', makeEntry({ state: DownloadState.DOWNLOADING, total_bytes: 1000 }));
      await listeners.downloadProgress({ id: 'do_123', progress: 25 });
      vi.mocked(dlDb.update).mockClear();

      await listeners.downloadProgress({ id: 'do_123', progress: 25.4 });
      expect(dlDb.update).not.toHaveBeenCalled();
      expect(events.filter((e) => e.type === 'progress')).toHaveLength(2);
    });

    it('writes again once the whole percent advances', async () => {
      only('do_123', makeEntry({ state: DownloadState.DOWNLOADING, total_bytes: 1000 }));
      await listeners.downloadProgress({ id: 'do_123', progress: 25 });
      await listeners.downloadProgress({ id: 'do_123', progress: 40 });
      expect(dlDb.update).toHaveBeenLastCalledWith('do_123', { progress: 40, bytes_downloaded: 400 });
    });

    it('does not write progress for an entry that is no longer downloading', async () => {
      only('do_123', makeEntry({ state: DownloadState.PAUSED, total_bytes: 1000 }));
      await listeners.downloadProgress({ id: 'do_123', progress: 25 });
      expect(dlDb.update).not.toHaveBeenCalled();
    });

    it('does not write progress for an unknown entry', async () => {
      await listeners.downloadProgress({ id: 'ghost', progress: 25 });
      expect(dlDb.update).not.toHaveBeenCalled();
    });
  });

  describe('downloadCompleted listener', () => {
    it('moves a downloading entry to DOWNLOADED at 100%', async () => {
      only('do_123', makeEntry({ state: DownloadState.DOWNLOADING }));
      (manager as any).activeDownloads.set('do_123', { nativeId: 'do_123' });

      await listeners.downloadCompleted({ id: 'do_123' });

      expect(dlDb.update).toHaveBeenCalledWith('do_123', {
        state: DownloadState.DOWNLOADED,
        progress: 100,
      });
      expect((manager as any).activeDownloads.has('do_123')).toBe(false);
    });

    it('ignores a completion for an entry that is not downloading', async () => {
      only('do_123', makeEntry({ state: DownloadState.CANCELLED }));
      await listeners.downloadCompleted({ id: 'do_123' });
      expect(dlDb.update).not.toHaveBeenCalled();
    });
  });

  describe('downloadFailed listener', () => {
    it('routes the native error into the retry pipeline', async () => {
      only('do_123', makeEntry({ state: DownloadState.DOWNLOADING, retry_count: 0 }));
      (manager as any).activeDownloads.set('do_123', { nativeId: 'do_123' });

      await listeners.downloadFailed({ id: 'do_123', error: 'socket closed' });

      expect(dlDb.update).toHaveBeenCalledWith('do_123', expect.objectContaining({
        state: DownloadState.RETRY_WAIT,
        retry_count: 1,
        last_error: 'socket closed',
      }));
      expect(events.find((e) => e.type === 'error')?.data).toMatchObject({
        errorCode: 'DOWNLOAD_FAILED',
        message: 'socket closed',
      });
    });
  });

  // ══════════════════════════════════════════════
  //  enqueue
  // ══════════════════════════════════════════════

  describe('enqueue', () => {
    it('skips streaming-only mime types', async () => {
      await manager.enqueue([{
        identifier: 'yt_1', downloadUrl: 'https://yt', filename: 'a.ecar', mimeType: 'video/x-youtube',
      }]);
      expect(dlDb.insert).not.toHaveBeenCalled();
    });

    it('upgrades a parent-bound queue entry when the same content is requested standalone', async () => {
      only('do_123', makeEntry({ parent_identifier: 'coll_1', state: DownloadState.QUEUED }));
      mockContentDb.getByIdentifier.mockResolvedValue({ ref_count: 2, visibility: 'Parent', content_state: 1 });

      await manager.enqueue([{
        identifier: 'do_123', downloadUrl: 'https://x', filename: 'a.ecar', mimeType: 'application/ecar',
      }]);

      expect(mockContentDb.update).toHaveBeenCalledWith('do_123', { visibility: 'Default', ref_count: 3 });
      expect(dlDb.insert).not.toHaveBeenCalled();
    });

    it('leaves the content row alone when there is no ContentDb entry to upgrade', async () => {
      only('do_123', makeEntry({ parent_identifier: 'coll_1', state: DownloadState.QUEUED }));
      mockContentDb.getByIdentifier.mockResolvedValue(null);

      await manager.enqueue([{
        identifier: 'do_123', downloadUrl: 'https://x', filename: 'a.ecar', mimeType: 'application/ecar',
      }]);
      expect(mockContentDb.update).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════
  //  cancel
  // ══════════════════════════════════════════════

  describe('cancel', () => {
    it('cancels a DOWNLOADED entry and removes the ecar file', async () => {
      only('do_123', makeEntry({ state: DownloadState.DOWNLOADED, file_path: 'file:///a.ecar' }));
      await manager.cancel('do_123');

      expect(dlDb.update).toHaveBeenCalledWith('do_123', { state: DownloadState.CANCELLED });
      expect(Filesystem.deleteFile).toHaveBeenCalledWith({ path: 'file:///a.ecar' });
      expect(dlDb.update).toHaveBeenCalledWith('do_123', { cancelled_by_user: 1 });
    });

    it('cancels a DOWNLOADED entry with no file path without touching the filesystem', async () => {
      only('do_123', makeEntry({ state: DownloadState.DOWNLOADED, file_path: null }));
      await manager.cancel('do_123');
      expect(Filesystem.deleteFile).not.toHaveBeenCalled();
    });

    it('cancels an IMPORTING entry cooperatively', async () => {
      only('do_123', makeEntry({ state: DownloadState.IMPORTING }));
      await manager.cancel('do_123');
      expect(dlDb.update).toHaveBeenCalledWith('do_123', { state: DownloadState.CANCELLED });
      expect(CapacitorDownloader.stop).not.toHaveBeenCalled();
    });

    it('stops the native download and clears the partial file for an active entry', async () => {
      only('do_123', makeEntry({ state: DownloadState.DOWNLOADING, file_path: 'file:///partial.ecar' }));
      (manager as any).activeDownloads.set('do_123', { nativeId: 'do_123' });

      await manager.cancel('do_123');

      expect(CapacitorDownloader.stop).toHaveBeenCalledWith({ id: 'do_123' });
      expect(Filesystem.deleteFile).toHaveBeenCalledWith({ path: 'file:///partial.ecar' });
      expect((manager as any).activeDownloads.has('do_123')).toBe(false);
    });

    it('cancelAll only cancels entries that are still in flight', async () => {
      const entries = [
        makeEntry({ identifier: 'a', state: DownloadState.QUEUED }),
        makeEntry({ identifier: 'b', state: DownloadState.COMPLETED }),
        makeEntry({ identifier: 'c', state: DownloadState.FAILED }),
        makeEntry({ identifier: 'd', state: DownloadState.CANCELLED }),
        makeEntry({ identifier: 'e', state: DownloadState.DOWNLOADING }),
      ];
      vi.mocked(dlDb.getAll).mockResolvedValue(entries);
      const cancelSpy = vi.spyOn(manager, 'cancel').mockResolvedValue(undefined);

      await manager.cancelAll();

      expect(cancelSpy).toHaveBeenCalledTimes(2);
      expect(cancelSpy).toHaveBeenCalledWith('a');
      expect(cancelSpy).toHaveBeenCalledWith('e');
    });
  });

  // ══════════════════════════════════════════════
  //  pause / resume
  // ══════════════════════════════════════════════

  describe('pause', () => {
    it('pauses an active download natively and drops it from the active set', async () => {
      only('do_123', makeEntry({ state: DownloadState.DOWNLOADING }));
      (manager as any).activeDownloads.set('do_123', { nativeId: 'do_123' });

      await manager.pause('do_123');

      expect(CapacitorDownloader.pause).toHaveBeenCalledWith({ id: 'do_123' });
      expect((manager as any).activeDownloads.has('do_123')).toBe(false);
      expect(dlDb.update).toHaveBeenCalledWith('do_123', { state: DownloadState.PAUSED });
    });

    it('falls back to stopping the download when native pause is unsupported', async () => {
      only('do_123', makeEntry({ state: DownloadState.DOWNLOADING }));
      vi.mocked(CapacitorDownloader.pause).mockRejectedValueOnce(new Error('unsupported'));

      await manager.pause('do_123');

      expect(CapacitorDownloader.stop).toHaveBeenCalledWith({ id: 'do_123' });
      expect(dlDb.update).toHaveBeenCalledWith('do_123', { state: DownloadState.PAUSED });
    });

    it('pauses a queued entry without calling the native plugin', async () => {
      only('do_123', makeEntry({ state: DownloadState.QUEUED }));
      await manager.pause('do_123');
      expect(CapacitorDownloader.pause).not.toHaveBeenCalled();
      expect(dlDb.update).toHaveBeenCalledWith('do_123', { state: DownloadState.PAUSED });
    });

    it('refuses to pause a completed entry', async () => {
      only('do_123', makeEntry({ state: DownloadState.COMPLETED }));
      await manager.pause('do_123');
      expect(dlDb.update).not.toHaveBeenCalled();
      expect(events).toHaveLength(0);
    });

    it('is a no-op for an unknown entry', async () => {
      await manager.pause('ghost');
      expect(dlDb.update).not.toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    it('resumes natively and returns the entry to DOWNLOADING', async () => {
      only('do_123', makeEntry({ state: DownloadState.PAUSED }));
      await manager.resume('do_123');

      expect(CapacitorDownloader.resume).toHaveBeenCalledWith({ id: 'do_123' });
      expect((manager as any).activeDownloads.get('do_123')).toEqual({ nativeId: 'do_123' });
      expect(dlDb.update).toHaveBeenCalledWith('do_123', { state: DownloadState.DOWNLOADING });
    });

    it('re-queues the entry when native resume is unsupported', async () => {
      only('do_123', makeEntry({ state: DownloadState.PAUSED }));
      vi.mocked(CapacitorDownloader.resume).mockRejectedValueOnce(new Error('unsupported'));

      await manager.resume('do_123');

      expect(dlDb.update).toHaveBeenCalledWith('do_123', { state: DownloadState.QUEUED });
      expect((manager as any).activeDownloads.has('do_123')).toBe(false);
    });

    it('ignores a resume for an entry that is not paused', async () => {
      only('do_123', makeEntry({ state: DownloadState.DOWNLOADING }));
      await manager.resume('do_123');
      expect(CapacitorDownloader.resume).not.toHaveBeenCalled();
    });

    it('ignores a resume for an unknown entry', async () => {
      await manager.resume('ghost');
      expect(CapacitorDownloader.resume).not.toHaveBeenCalled();
    });
  });

  it('retry is a no-op for an unknown entry', async () => {
    await manager.retry('ghost');
    expect(dlDb.update).not.toHaveBeenCalled();
  });

  it('getBatchProgress short-circuits on an empty identifier list', async () => {
    const map = await manager.getBatchProgress([]);
    expect(map.size).toBe(0);
    expect(dlDb.getByIdentifiers).not.toHaveBeenCalled();
  });

  // ══════════════════════════════════════════════
  //  Queue processing
  // ══════════════════════════════════════════════

  describe('processQueue', () => {
    it('defers a re-entrant call instead of running twice', async () => {
      vi.mocked(dlDb.getNextQueued).mockClear();
      (manager as any).processing = true;
      await (manager as any).processQueue();
      expect((manager as any).needsProcessing).toBe(true);
      expect(dlDb.getNextQueued).not.toHaveBeenCalled();
    });

    it('routes a startDownload failure into the retry pipeline', async () => {
      const entry = makeEntry({ state: DownloadState.QUEUED });
      only('do_123', makeEntry({ state: DownloadState.DOWNLOADING }));
      vi.mocked(Filesystem.getUri).mockRejectedValueOnce(new Error('no storage'));

      await (manager as any).startDownload(entry);

      expect(dlDb.update).toHaveBeenCalledWith('do_123', expect.objectContaining({
        state: DownloadState.RETRY_WAIT,
        last_error: 'no storage',
      }));
    });

    it('handleDownloadFailure is a no-op when the entry vanished', async () => {
      await (manager as any).handleDownloadFailure('ghost', new Error('boom'));
      expect(dlDb.update).not.toHaveBeenCalled();
      expect(events).toHaveLength(0);
    });
  });

  // ══════════════════════════════════════════════
  //  Import phase
  // ══════════════════════════════════════════════

  describe('processDownloadedEntries', () => {
    const downloaded = (over: Partial<DownloadQueueEntry> = {}) =>
      makeEntry({ state: DownloadState.DOWNLOADED, file_path: 'file:///a.ecar', ...over });

    const queueOnce = (entries: DownloadQueueEntry[]) => {
      let served = false;
      vi.mocked(dlDb.getByState).mockImplementation(async (s: any) => {
        if (s !== DownloadState.DOWNLOADED || served) return [];
        served = true;
        return entries;
      });
    };

    it('skips an entry whose state changed before the import started', async () => {
      const entry = downloaded();
      queueOnce([entry]);
      only('do_123', makeEntry({ state: DownloadState.CANCELLED }));

      await (manager as any).processDownloadedEntries();
      expect(importSvc.import).not.toHaveBeenCalled();
    });

    it('records size on device and forwards import progress on success', async () => {
      const entry = downloaded({ total_bytes: 4096, content_meta: '{"name":"x"}' });
      queueOnce([entry]);
      only('do_123', entry);
      vi.mocked(importSvc.import).mockImplementation(async (_id, _p, _meta, _cancelled, onProgress) => {
        onProgress?.('EXTRACTING', 55);
        return { status: 'SUCCESS', identifiers: [] } as any;
      });

      await (manager as any).processDownloadedEntries();

      expect(mockContentDb.updateSizeOnDevice).toHaveBeenCalledWith('do_123', 4096);
      expect(dlDb.update).toHaveBeenCalledWith('do_123', { progress: 100 });
      expect(events.find((e) => e.type === 'import_progress')?.data).toMatchObject({
        identifier: 'do_123', phase: 'EXTRACTING', percent: 55,
      });
    });

    it('does not record size on device when the ecar size is unknown', async () => {
      const entry = downloaded({ total_bytes: 0 });
      queueOnce([entry]);
      only('do_123', entry);

      await (manager as any).processDownloadedEntries();
      expect(mockContentDb.updateSizeOnDevice).not.toHaveBeenCalled();
    });

    it('exposes cooperative cancellation to the import service', async () => {
      const entry = downloaded();
      queueOnce([entry]);
      vi.mocked(dlDb.getByIdentifier)
        .mockResolvedValueOnce(entry)
        .mockResolvedValue(makeEntry({ state: DownloadState.CANCELLED }));

      let cancelled: boolean | undefined;
      vi.mocked(importSvc.import).mockImplementation(async (_id, _p, _meta, isCancelled) => {
        cancelled = await isCancelled?.();
        return { status: 'CANCELLED', identifiers: [] } as any;
      });

      await (manager as any).processDownloadedEntries();

      expect(cancelled).toBe(true);
      expect(dlDb.update).not.toHaveBeenCalledWith('do_123', expect.objectContaining({
        state: DownloadState.COMPLETED,
      }));
    });

    it('routes an import failure into handleImportFailure', async () => {
      vi.useFakeTimers();
      const entry = downloaded();
      queueOnce([entry]);
      statefulRow(entry);
      vi.mocked(importSvc.import).mockResolvedValue({ status: 'FAILED', errors: ['bad zip'] } as any);

      await (manager as any).processDownloadedEntries();

      expect(dlDb.update).toHaveBeenCalledWith('do_123', { state: DownloadState.IMPORTING });
      expect(dlDb.update).toHaveBeenCalledWith('do_123', expect.objectContaining({
        state: DownloadState.RETRY_WAIT,
        last_error: 'bad zip',
      }));
    });

    it('falls back to a generic message when the import reports no error detail', async () => {
      vi.useFakeTimers();
      const entry = downloaded();
      queueOnce([entry]);
      statefulRow(entry);
      vi.mocked(importSvc.import).mockResolvedValue({ status: 'FAILED' } as any);

      await (manager as any).processDownloadedEntries();
      expect(dlDb.update).toHaveBeenCalledWith('do_123', expect.objectContaining({
        last_error: 'Unknown import error',
      }));
    });
  });

  describe('handleImportFailure', () => {
    it('retries from DOWNLOADED when the ecar is still on disk', async () => {
      vi.useFakeTimers();
      const entry = makeEntry({ state: DownloadState.IMPORTING, file_path: 'file:///a.ecar', retry_count: 0 });
      statefulRow(entry);

      await (manager as any).handleImportFailure(entry, 'unzip error');

      expect(dlDb.update).toHaveBeenCalledWith('do_123', expect.objectContaining({
        state: DownloadState.RETRY_WAIT, retry_count: 1, last_error: 'unzip error',
      }));
      expect(events.find((e) => e.type === 'error')?.data).toMatchObject({
        errorCode: 'IMPORT_FAILED', retryCount: 1, maxRetries: 3,
      });

      await vi.advanceTimersByTimeAsync(2000);
      expect(dlDb.update).toHaveBeenCalledWith('do_123', { state: DownloadState.DOWNLOADED });
    });

    it('retries from QUEUED when the ecar is gone', async () => {
      vi.useFakeTimers();
      vi.mocked(Filesystem.stat).mockRejectedValue(new Error('ENOENT'));
      const entry = makeEntry({ state: DownloadState.IMPORTING, file_path: 'file:///a.ecar', retry_count: 1 });
      statefulRow(entry);

      await (manager as any).handleImportFailure(entry, 'unzip error');
      await vi.advanceTimersByTimeAsync(3999);
      expect(dlDb.update).not.toHaveBeenCalledWith('do_123', { state: DownloadState.QUEUED });
      await vi.advanceTimersByTimeAsync(1);

      expect(dlDb.update).toHaveBeenCalledWith('do_123', { state: DownloadState.QUEUED });
    });

    it('retries from QUEUED when there is no file path at all', async () => {
      vi.useFakeTimers();
      const entry = makeEntry({ state: DownloadState.IMPORTING, file_path: null, retry_count: 0 });
      statefulRow(entry);

      await (manager as any).handleImportFailure(entry, 'unzip error');
      expect(Filesystem.stat).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(2000);
      expect(dlDb.update).toHaveBeenCalledWith('do_123', { state: DownloadState.QUEUED });
    });

    it('does not re-transition if the entry left RETRY_WAIT before the timer fired', async () => {
      vi.useFakeTimers();
      const entry = makeEntry({ state: DownloadState.IMPORTING, file_path: null, retry_count: 0 });
      const row = statefulRow(entry);

      await (manager as any).handleImportFailure(entry, 'unzip error');
      row.state = DownloadState.CANCELLED;
      vi.mocked(dlDb.update).mockClear();
      await vi.advanceTimersByTimeAsync(2000);

      expect(dlDb.update).not.toHaveBeenCalled();
    });

    it('gives up and marks the entry FAILED once retries are exhausted', async () => {
      const entry = makeEntry({ state: DownloadState.IMPORTING, retry_count: 3, max_retries: 3 });
      only('do_123', entry);

      await (manager as any).handleImportFailure(entry, 'corrupt ecar');

      expect(dlDb.update).toHaveBeenCalledWith('do_123', { state: DownloadState.FAILED });
      expect(dlDb.update).toHaveBeenCalledWith('do_123', { last_error: 'corrupt ecar' });
      expect(events.find((e) => e.type === 'error')?.data).toMatchObject({
        errorCode: 'IMPORT_FAILED_FINAL', retryCount: 4, maxRetries: 3,
      });
    });
  });

  // ══════════════════════════════════════════════
  //  Network recovery
  // ══════════════════════════════════════════════

  describe('requeueRetryWaitEntries', () => {
    it('moves every RETRY_WAIT entry back to QUEUED', async () => {
      const a = makeEntry({ identifier: 'a', state: DownloadState.RETRY_WAIT });
      const b = makeEntry({ identifier: 'b', state: DownloadState.RETRY_WAIT });
      vi.mocked(dlDb.getByState).mockImplementation(async (s: any) =>
        (s === DownloadState.RETRY_WAIT ? [a, b] : []),
      );
      vi.mocked(dlDb.getByIdentifier).mockImplementation(async (id: string) =>
        (id === 'a' ? a : b),
      );

      await (manager as any).requeueRetryWaitEntries();

      expect(dlDb.update).toHaveBeenCalledWith('a', { state: DownloadState.QUEUED });
      expect(dlDb.update).toHaveBeenCalledWith('b', { state: DownloadState.QUEUED });
    });

    it('warns instead of throwing when an entry can no longer be requeued', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });
      const a = makeEntry({ identifier: 'a', state: DownloadState.RETRY_WAIT });
      vi.mocked(dlDb.getByState).mockImplementation(async (s: any) =>
        (s === DownloadState.RETRY_WAIT ? [a] : []),
      );
      vi.mocked(dlDb.getByIdentifier).mockResolvedValue(null);

      await expect((manager as any).requeueRetryWaitEntries()).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to requeue a'),
        expect.any(Error),
      );
      warn.mockRestore();
    });
  });

  it('warns when a download cannot be stopped after signal loss', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });
    (manager as any).activeDownloads.set('do_123', { nativeId: 'do_123' });
    vi.mocked(CapacitorDownloader.stop).mockRejectedValueOnce(new Error('not running'));

    await (manager as any).stopDownloadsOnSignalLoss();

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not stop do_123'),
      expect.any(Error),
    );
    expect((manager as any).activeDownloads.has('do_123')).toBe(true);
    warn.mockRestore();
  });

  it('re-queues an IMPORTING entry that has no ecar path on recovery', async () => {
    const entry = makeEntry({ identifier: 'imp_1', state: DownloadState.IMPORTING, file_path: null });
    vi.mocked(dlDb.getByState).mockImplementation(async (s: any) =>
      (s === DownloadState.IMPORTING ? [entry] : []),
    );

    await (manager as any).recoverCrashedEntries();

    expect(dlDb.update).toHaveBeenCalledWith('imp_1', {
      state: DownloadState.QUEUED, progress: 0, bytes_downloaded: 0,
    });
  });
});
