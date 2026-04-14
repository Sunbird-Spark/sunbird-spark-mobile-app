import { Filesystem, Directory } from '@capacitor/filesystem';
import { CapacitorDownloader } from '@capgo/capacitor-downloader';
import { DownloadDbService, downloadDbService } from '../db/DownloadDbService';
import { contentDbService } from '../db/ContentDbService';
import { networkService } from '../network/networkService';
import type { NetworkState } from '../network/networkService';
import { ImportService, importService } from './ImportService';
import {
  DownloadState,
  VALID_TRANSITIONS,
  type DownloadRequest,
  type DownloadQueueEntry,
  type DownloadProgress,
  type AggregateProgress,
  type DownloadEvent,
  type DownloadListener,
} from './types';
import { NON_DOWNLOADABLE_MIME_TYPES } from '../content/hierarchyUtils';

const MAX_RETRIES_DEFAULT = 3;
const BACKOFF_BASE_MS = 2000;
const BACKOFF_MAX_MS = 30000;

export class DownloadManager {
  private listeners = new Set<DownloadListener>();
  private activeDownloads = new Map<string, { nativeId: string }>();
  private maxConcurrent = 2;
  private wifiOnly = false;
  private processing = false;
  private needsProcessing = false;
  private lastProgressWrite = new Map<string, { tick: number; percent: number }>();
  private networkState: NetworkState = { connected: true, connectionType: 'unknown' };
  private unsubscribeNetwork: (() => void) | null = null;
  private initialized = false;

  constructor(
    private downloadDb: DownloadDbService,
    private networkSvc: typeof networkService,
    private importSvc: ImportService
  ) { }

  // ══════════════════════════════════════════════
  //  LIFECYCLE
  // ══════════════════════════════════════════════

  async init(): Promise<void> {
    if (this.initialized) return;

    // Listen for network changes
    this.unsubscribeNetwork = this.networkSvc.subscribe((state) => {
      const wasDisconnected = !state.connected;
      const wasPreviouslyConnected = this.networkState.connected;
      const wasConnectionType = this.networkState.connectionType;
      this.networkState = state;

      // Connection lost → pause downloads
      if (wasPreviouslyConnected && wasDisconnected) {
        console.debug('[DownloadManager] Signal lost — stopping active downloads');
        void this.stopDownloadsOnSignalLoss();
      }

      // Back online OR switched to WiFi → re-queue RETRY_WAIT entries then process
      if (state.connected && (!wasPreviouslyConnected || (wasConnectionType !== 'wifi' && state.connectionType === 'wifi'))) {
        void this.requeueRetryWaitEntries().then(() => this.processQueue());
      }
    });

    // Recover crashed entries
    await this.recoverCrashedEntries();

    this.initialized = true;
    console.debug('[DownloadManager] initialized');

    // Set up Downloader listeners
    this.setupPluginListeners();

    // Start processing
    await this.processQueue();
  }

  async destroy(): Promise<void> {
    this.unsubscribeNetwork?.();
    this.unsubscribeNetwork = null;
    this.activeDownloads.clear();
    await CapacitorDownloader.removeAllListeners().catch(() => { });
    this.initialized = false;
  }

  private setupPluginListeners(): void {
    CapacitorDownloader.addListener('downloadProgress', async ({ id, progress }) => {
      // 1. Emit granular progress event immediately for smooth UI results (no DB hit)
      this.emit({ type: 'progress', identifier: id });

      // 2. Throttle DB updates to reduce SQLite pressure
      const now = Date.now();
      const last = this.lastProgressWrite.get(id);
      const percent = Math.floor(progress);

      // Only write to DB if:
      // - Progress % has increased by an integer value (or it's the first tick)
      // - AND at least 500ms has passed since last write (unless it's 100%)
      if (!last || (percent > last.percent) || (now - last.tick > 500)) {
        this.lastProgressWrite.set(id, { tick: now, percent });

        const entry = await this.downloadDb.getByIdentifier(id);
        if (!entry || entry.state !== DownloadState.DOWNLOADING) return;

        const bytesDownloaded = Math.floor((entry.total_bytes * progress) / 100);
        await this.downloadDb.update(id, {
          progress,
          bytes_downloaded: bytesDownloaded
        });
      }
    });

    CapacitorDownloader.addListener('downloadCompleted', async ({ id }) => {
      this.lastProgressWrite.delete(id);
      const entry = await this.downloadDb.getByIdentifier(id);
      if (!entry || entry.state !== DownloadState.DOWNLOADING) return;

      this.activeDownloads.delete(id);
      await this.transition(id, DownloadState.DOWNLOADED, { progress: 100 });
      await this.processQueue();
    });

    CapacitorDownloader.addListener('downloadFailed', async ({ id, error }) => {
      this.activeDownloads.delete(id);
      await this.handleDownloadFailure(id, new Error(error));
    });
  }

  /** Notify listeners that content has been deleted from the local DB. */
  notifyContentDeleted(identifier: string): void {
    this.emit({ type: 'content_deleted', identifier });
  }

  // ══════════════════════════════════════════════
  //  DOWNLOAD ACTIONS
  // ══════════════════════════════════════════════

  async enqueue(requests: DownloadRequest[]): Promise<void> {
    const now = Date.now();

    for (const req of requests) {
      // Root Fix: Do not enqueue streaming-only or non-downloadable types (YouTube/External URL)
      if (req.mimeType) {
        const mime = req.mimeType.toLowerCase();
        if (NON_DOWNLOADABLE_MIME_TYPES.some(m => m.toLowerCase() === mime)) {
          console.warn(`[DownloadManager] Skipping non-downloadable MIME type: ${req.mimeType} (ID: ${req.identifier})`);
          continue;
        }
      }

      // Check if user cancelled this before — skip auto-re-queue
      const wasCancelled = await this.downloadDb.wasCancelledByUser(req.identifier);
      if (wasCancelled) continue;

      // Fast-path: content already exists locally (e.g. downloaded as part of collection
      // with visibility='Parent'). Skip actual download — just upgrade visibility + ref_count.
      const contentEntry = await contentDbService.getByIdentifier(req.identifier);
      if (contentEntry && contentEntry.content_state === 2) {
        const updates: Partial<typeof contentEntry> = {};
        if (contentEntry.visibility === 'Parent' && !req.parentIdentifier) {
          // Standalone download of content that was previously part of a collection
          updates.visibility = 'Default';
        }
        updates.ref_count = contentEntry.ref_count + 1;
        await contentDbService.update(req.identifier, updates);
        this.emit({ type: 'state_change', identifier: req.identifier });
        continue;
      }

      const existing = await this.downloadDb.getByIdentifier(req.identifier);
      if (existing) {
        // Already in queue - if this new request is standalone and the existing one
        // is parent-bound, "upgrade" the intent immediately (Default visibility + ref_count bump).
        if (!req.parentIdentifier && existing.parent_identifier) {
          const contentEntry = await contentDbService.getByIdentifier(req.identifier);
          if (contentEntry) {
            await contentDbService.update(req.identifier, {
              visibility: 'Default',
              ref_count: contentEntry.ref_count + 1,
            });
          }
        }

        // Skip if currently active or importing. We allow re-enqueuing FAILED/CANCELLED.
        if (
          existing.state !== DownloadState.FAILED &&
          existing.state !== DownloadState.CANCELLED &&
          existing.state !== DownloadState.COMPLETED
        ) {
          continue;
        }
      }

      const entry: DownloadQueueEntry = {
        identifier: req.identifier,
        parent_identifier: req.parentIdentifier ?? null,
        download_url: req.downloadUrl,
        filename: req.filename,
        mime_type: req.mimeType,
        file_path: null,
        state: DownloadState.QUEUED,
        progress: 0,
        bytes_downloaded: 0,
        total_bytes: 0,
        retry_count: 0,
        max_retries: MAX_RETRIES_DEFAULT,
        last_error: null,
        content_meta: req.contentMeta ? JSON.stringify(req.contentMeta) : null,
        priority: req.priority ?? 0,
        cancelled_by_user: 0,
        created_at: now,
        updated_at: now,
      };

      await this.downloadDb.insert(entry);
    }

    this.emit({ type: 'queue_changed' });
    await this.processQueue();
  }

  async cancel(identifier: string): Promise<void> {
    const entry = await this.downloadDb.getByIdentifier(identifier);
    if (!entry) return;

    switch (entry.state) {
      case DownloadState.QUEUED:
      case DownloadState.RETRY_WAIT:
        await this.transition(identifier, DownloadState.CANCELLED);
        break;

      case DownloadState.DOWNLOADING:
      case DownloadState.PAUSED:
        await CapacitorDownloader.stop({ id: identifier }).catch(() => { });
        this.activeDownloads.delete(identifier);
        await this.cleanPartialFile(entry);
        await this.transition(identifier, DownloadState.CANCELLED);
        break;

      case DownloadState.DOWNLOADED:
        await this.transition(identifier, DownloadState.CANCELLED);
        // Delete the .ecar file
        if (entry.file_path) {
          await Filesystem.deleteFile({ path: entry.file_path }).catch(() => { });
        }
        break;

      case DownloadState.IMPORTING:
        // Cooperative cancellation — ImportService checks isCancelled
        await this.transition(identifier, DownloadState.CANCELLED);
        break;

      default:
        // COMPLETED, FAILED, CANCELLED — no-op
        return;
    }

    await this.downloadDb.update(identifier, { cancelled_by_user: 1 });
    this.emit({ type: 'state_change', identifier });
    await this.processQueue();
  }

  async cancelByParent(parentIdentifier: string): Promise<void> {
    const entries = await this.downloadDb.getByParent(parentIdentifier);
    for (const entry of entries) {
      await this.cancel(entry.identifier);
    }
  }

  async cancelAll(): Promise<void> {
    const entries = await this.downloadDb.getAll();
    for (const entry of entries) {
      if (
        entry.state !== DownloadState.COMPLETED &&
        entry.state !== DownloadState.FAILED &&
        entry.state !== DownloadState.CANCELLED
      ) {
        await this.cancel(entry.identifier);
      }
    }
  }

  async pause(identifier: string): Promise<void> {
    const entry = await this.downloadDb.getByIdentifier(identifier);
    if (!entry) return;

    if (entry.state === DownloadState.DOWNLOADING) {
      try {
        await CapacitorDownloader.pause({ id: identifier });
      } catch {
        // Fallback for Android (Native DownloadManager does not support strict pausing)
        await CapacitorDownloader.stop({ id: identifier }).catch(() => { });
      }
      this.activeDownloads.delete(identifier);
    } else if (
      entry.state !== DownloadState.QUEUED &&
      entry.state !== DownloadState.RETRY_WAIT
    ) {
      // Only allow pausing if DOWNLOADING, QUEUED, or RETRY_WAIT
      return;
    }

    await this.transition(identifier, DownloadState.PAUSED);
    this.emit({ type: 'state_change', identifier });
    // Process queue to fill slots if we paused an active download,
    // or to stop any pending starts if we paused a queued item.
    await this.processQueue();
  }

  async resume(identifier: string): Promise<void> {
    const entry = await this.downloadDb.getByIdentifier(identifier);
    if (!entry || entry.state !== DownloadState.PAUSED) return;

    let resumedNatively = false;
    try {
      await CapacitorDownloader.resume({ id: identifier });
      resumedNatively = true;
    } catch {
      // Fallback: reset to queued and restart download payload stream natively
      await this.transition(identifier, DownloadState.QUEUED);
      this.emit({ type: 'state_change', identifier });
      await this.processQueue();
      return;
    }

    if (resumedNatively) {
      this.activeDownloads.set(identifier, { nativeId: identifier });
      await this.transition(identifier, DownloadState.DOWNLOADING);
      this.emit({ type: 'state_change', identifier });
    }
  }

  async retry(identifier: string): Promise<void> {
    const entry = await this.downloadDb.getByIdentifier(identifier);
    if (!entry) return;

    if (
      entry.state !== DownloadState.FAILED &&
      entry.state !== DownloadState.CANCELLED
    ) {
      return;
    }

    await this.downloadDb.update(identifier, {
      cancelled_by_user: 0,
      retry_count: 0,
      last_error: null,
      state: DownloadState.QUEUED,
      progress: 0,
      bytes_downloaded: 0,
    });

    this.emit({ type: 'state_change', identifier });
    await this.processQueue();
  }

  async retryAllFailed(): Promise<void> {
    const failed = await this.downloadDb.getByState(DownloadState.FAILED);
    for (const entry of failed) {
      await this.retry(entry.identifier);
    }
  }

  // ══════════════════════════════════════════════
  //  PROGRESS & STATE QUERIES
  // ══════════════════════════════════════════════

  async getProgress(
    identifier: string
  ): Promise<DownloadProgress | null> {
    const entry = await this.downloadDb.getByIdentifier(identifier);
    if (!entry) return null;

    return {
      identifier: entry.identifier,
      parentIdentifier: entry.parent_identifier ?? undefined,
      state: entry.state,
      progress: entry.progress,
      bytesDownloaded: entry.bytes_downloaded,
      totalBytes: entry.total_bytes,
    };
  }

  async getBatchProgress(
    identifiers: string[]
  ): Promise<Map<string, DownloadProgress>> {
    const map = new Map<string, DownloadProgress>();
    if (identifiers.length === 0) return map;

    const entries = await this.downloadDb.getByIdentifiers(identifiers);
    for (const entry of entries) {
      map.set(entry.identifier, {
        identifier: entry.identifier,
        parentIdentifier: entry.parent_identifier ?? undefined,
        state: entry.state,
        progress: entry.progress,
        bytesDownloaded: entry.bytes_downloaded,
        totalBytes: entry.total_bytes,
      });
    }
    return map;
  }

  async getAggregateProgress(
    parentIdentifier: string
  ): Promise<AggregateProgress> {
    const entries = await this.downloadDb.getByParent(parentIdentifier);
    const completed = entries.filter(
      (e) => e.state === DownloadState.COMPLETED
    ).length;
    const failedCount = entries.filter(
      (e) => e.state === DownloadState.FAILED
    ).length;
    const activeCount = entries.filter(
      (e) => e.state !== DownloadState.COMPLETED && e.state !== DownloadState.FAILED && e.state !== DownloadState.CANCELLED
    ).length;
    const pausedCount = entries.filter(
      (e) => e.state === DownloadState.PAUSED
    ).length;
    const total = entries.length;
    const overallPercent =
      total > 0
        ? Math.round(
          entries.reduce((sum, e) => sum + e.progress, 0) / total
        )
        : 0;

    return { parentIdentifier, completed, total, overallPercent, failedCount, activeCount, pausedCount };
  }

  async getEntry(
    identifier: string
  ): Promise<DownloadQueueEntry | null> {
    return this.downloadDb.getByIdentifier(identifier);
  }

  async getActiveDownloads(): Promise<DownloadQueueEntry[]> {
    return this.downloadDb.getByState(DownloadState.DOWNLOADING);
  }

  async getFailedDownloads(): Promise<DownloadQueueEntry[]> {
    return this.downloadDb.getByState(DownloadState.FAILED);
  }

  async getQueue(): Promise<DownloadQueueEntry[]> {
    return this.downloadDb.getAll();
  }

  async wasCancelledByUser(identifier: string): Promise<boolean> {
    return this.downloadDb.wasCancelledByUser(identifier);
  }

  // ══════════════════════════════════════════════
  //  SETTINGS
  // ══════════════════════════════════════════════

  setWifiOnly(enabled: boolean): void {
    this.wifiOnly = enabled;
  }

  setMaxConcurrent(count: number): void {
    this.maxConcurrent = Math.max(1, count);
  }

  // ══════════════════════════════════════════════
  //  EVENTS (Listener pattern)
  // ══════════════════════════════════════════════

  subscribe(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ══════════════════════════════════════════════
  //  INTERNAL — Queue Processing
  // ══════════════════════════════════════════════

  private async processQueue(): Promise<void> {
    if (this.processing) {
      this.needsProcessing = true;
      return;
    }
    this.processing = true;

    try {
      do {
        this.needsProcessing = false;

        // Fill download slots
        const activeCount = this.activeDownloads.size;
        const slotsAvailable = this.maxConcurrent - activeCount;

        if (slotsAvailable > 0) {
          const queued = await this.downloadDb.getNextQueued(slotsAvailable);
          for (const entry of queued) {
            await this.startDownload(entry);
          }
        }

        // Process downloaded entries → import
        await this.processDownloadedEntries();

        // Check if all work is done
        const remaining = await this.downloadDb.countActive();
        if (remaining === 0) {
          this.emit({ type: 'all_done' });
        }
      } while (this.needsProcessing);
    } finally {
      this.processing = false;
    }
  }

  private async startDownload(entry: DownloadQueueEntry): Promise<void> {
    await this.transition(entry.identifier, DownloadState.DOWNLOADING);

    try {
      const validFilename = entry.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const destinationDir = 'Download';
      const destinationPath = `${destinationDir}/${entry.identifier}_${validFilename}`;

      await Filesystem.mkdir({
        path: destinationDir,
        directory: Directory.External,
        recursive: true
      }).catch(() => { }); // Catch specifically if it already exists

      const uriResult = await Filesystem.getUri({
        path: destinationPath,
        directory: Directory.External
      });

      await this.downloadDb.update(entry.identifier, { file_path: uriResult.uri });

      await CapacitorDownloader.download({
        id: entry.identifier,
        url: entry.download_url,
        destination: destinationPath,
        network: this.wifiOnly ? 'wifi-only' : 'cellular',
      });

      this.activeDownloads.set(entry.identifier, { nativeId: entry.identifier });

      this.emit({
        type: 'state_change',
        identifier: entry.identifier,
      });
    } catch (err) {
      await this.handleDownloadFailure(entry.identifier, err as Error);
    }
  }

  private async handleDownloadFailure(
    identifier: string,
    error: Error
  ): Promise<void> {
    const entry = await this.downloadDb.getByIdentifier(identifier);
    if (!entry) return;

    this.activeDownloads.delete(identifier);
    const nextRetry = entry.retry_count + 1;

    if (nextRetry <= entry.max_retries) {
      const backoff = Math.min(
        BACKOFF_BASE_MS * Math.pow(2, entry.retry_count),
        BACKOFF_MAX_MS
      );

      await this.transition(identifier, DownloadState.RETRY_WAIT, {
        retry_count: nextRetry,
        last_error: error.message,
      });

      this.emit({
        type: 'error',
        identifier,
        data: {
          errorCode: 'DOWNLOAD_FAILED',
          message: error.message,
          retryCount: nextRetry,
          maxRetries: entry.max_retries,
        },
      });

      // Schedule re-queue after backoff
      setTimeout(async () => {
        const current = await this.downloadDb.getByIdentifier(identifier);
        if (current?.state === DownloadState.RETRY_WAIT) {
          await this.transition(identifier, DownloadState.QUEUED);
          await this.processQueue();
        }
      }, backoff);
    } else {
      await this.transition(identifier, DownloadState.FAILED);
      await this.downloadDb.update(identifier, {
        last_error: error.message,
      });
      await this.cleanPartialFile(entry);

      this.emit({
        type: 'error',
        identifier,
        data: {
          errorCode: 'DOWNLOAD_FAILED_FINAL',
          message: error.message,
          retryCount: nextRetry,
          maxRetries: entry.max_retries,
        },
      });
    }
  }

  private async processDownloadedEntries(): Promise<void> {
    // Loop until no more DOWNLOADED entries remain.
    // New entries may reach DOWNLOADED state while we're importing previous ones
    // (race condition: downloadCompleted fires but processQueue returns because processing=true).
    while (true) {
      const downloaded = await this.downloadDb.getByState(
        DownloadState.DOWNLOADED
      );
      if (downloaded.length === 0) break;

      for (const entry of downloaded) {
        // Skip if cancelled in the meantime
        const current = await this.downloadDb.getByIdentifier(entry.identifier);
        if (!current || current.state !== DownloadState.DOWNLOADED) continue;

        await this.transition(entry.identifier, DownloadState.IMPORTING);

        const result = await this.importSvc.import(
          entry.identifier,
          entry.file_path!,
          entry.content_meta ? JSON.parse(entry.content_meta) : undefined,
          // Cooperative cancellation checker
          async () => {
            const e = await this.downloadDb.getByIdentifier(entry.identifier);
            return e?.state === DownloadState.CANCELLED;
          },
          // Progress callback
          (phase, percent) => {
            this.emit({
              type: 'import_progress',
              identifier: entry.identifier,
              data: {
                identifier: entry.identifier,
                phase,
                percent,
              },
            });
          },
          // Parent identifier — tells ImportService this leaf is part of a collection
          entry.parent_identifier ?? undefined,
        );

        switch (result.status) {
          case 'SUCCESS':
          case 'ALREADY_EXIST':
            await this.transition(entry.identifier, DownloadState.COMPLETED);
            await this.downloadDb.update(entry.identifier, { progress: 100 });

            // Persist the actual download size (ECAR file bytes) as size_on_device.
            // This is the value shown during download and is more accurate than
            // the Filesystem.stat directory size (which returns ~3KB inode size).
            if (entry.total_bytes > 0) {
              await contentDbService.updateSizeOnDevice(entry.identifier, entry.total_bytes);
            }

            // If this leaf belongs to a collection, mark it as 'Parent' visibility
            // so it doesn't appear individually in Downloaded Contents page.
            // Then check if all siblings are done → upgrade parent content_state to 2.
            if (entry.parent_identifier) {
              await this.handleCollectionChildComplete(entry);
            }
            break;

          case 'CANCELLED':
            // Already in CANCELLED state via cooperative check
            break;

          case 'FAILED':
            await this.handleImportFailure(entry, result.errors?.[0] ?? 'Unknown import error');
            break;
        }
      }
    }
  }

  /**
   * After a leaf content that belongs to a collection is successfully imported:
   * 1. Set its visibility to 'Parent' so it's hidden from Downloaded Contents
   * 2. Check if ALL siblings (same parent_identifier) are COMPLETED
   *    → if so, upgrade the parent collection's content_state to 2 (ARTIFACT_AVAILABLE)
   *    so the collection itself appears in Downloaded Contents.
   */
  private async handleCollectionChildComplete(entry: DownloadQueueEntry): Promise<void> {
    const parentId = entry.parent_identifier!;

    // 1. Mark the imported leaf content as visibility='Parent' — but only if
    //    the content wasn't also downloaded standalone. A ref_count of 1 means
    //    this collection import is the only reference. ref_count > 1 means the
    //    content was also downloaded independently (via fast-path or race), so
    //    keep the existing visibility (likely 'Default').
    const contentEntry = await contentDbService.getByIdentifier(entry.identifier);
    if (contentEntry && contentEntry.visibility !== 'Parent' && contentEntry.ref_count <= 1) {
      await contentDbService.update(entry.identifier, { visibility: 'Parent' });
      console.debug('[DownloadManager] Set visibility=Parent for child:', entry.identifier);
    }

    // 2. Check if all downloads with this parent are COMPLETED
    const siblings = await this.downloadDb.getByParent(parentId);
    const allDone = siblings.length > 0 && siblings.every(
      (s) => s.state === DownloadState.COMPLETED
    );

    if (allDone) {
      // Upgrade the parent collection's content_state to 2 so it shows in Downloads
      const parentEntry = await contentDbService.getByIdentifier(parentId);
      if (parentEntry) {
        if (parentEntry.content_state < 2) {
          await contentDbService.update(parentId, { content_state: 2 });
          console.debug('[DownloadManager] Upgraded parent content_state to 2:', parentId);
        }
      } else {
        // Parent entry doesn't exist yet in ContentDb — create a minimal one.
        // useCollection's cacheHierarchyLocally may not have run, or import may
        // have been skipped because spine downloadUrl was null.
        await contentDbService.upsert({
          identifier: parentId,
          server_data: '',
          local_data: '',
          mime_type: 'application/vnd.ekstep.content-collection',
          path: null,
          visibility: 'Default',
          server_last_updated_on: null,
          local_last_updated_on: new Date().toISOString(),
          ref_count: 1,
          content_state: 2,
          content_type: 'Course',
          audience: 'Learner',
          size_on_device: 0,
          pragma: '',
          manifest_version: '',
          dialcodes: '',
          child_nodes: '',
          primary_category: 'Course',
        });
        console.debug('[DownloadManager] Created parent entry with content_state=2:', parentId);
      }
      this.emit({ type: 'state_change', identifier: parentId });
    }
  }

  private async handleImportFailure(
    entry: DownloadQueueEntry,
    errorMessage: string
  ): Promise<void> {
    const nextRetry = entry.retry_count + 1;

    if (nextRetry <= entry.max_retries) {
      const backoff = Math.min(
        BACKOFF_BASE_MS * Math.pow(2, entry.retry_count),
        BACKOFF_MAX_MS
      );

      // Check if .ecar still exists — retry from DOWNLOADED if so, else re-download
      let retryState = DownloadState.QUEUED;
      if (entry.file_path) {
        try {
          await Filesystem.stat({ path: entry.file_path });
          retryState = DownloadState.DOWNLOADED; // .ecar still exists
        } catch {
          retryState = DownloadState.QUEUED; // need to re-download
        }
      }

      await this.transition(entry.identifier, DownloadState.RETRY_WAIT, {
        retry_count: nextRetry,
        last_error: errorMessage,
      });

      this.emit({
        type: 'error',
        identifier: entry.identifier,
        data: {
          errorCode: 'IMPORT_FAILED',
          message: errorMessage,
          retryCount: nextRetry,
          maxRetries: entry.max_retries,
        },
      });

      setTimeout(async () => {
        const current = await this.downloadDb.getByIdentifier(entry.identifier);
        if (current?.state === DownloadState.RETRY_WAIT) {
          await this.transition(entry.identifier, retryState);
          await this.processQueue();
        }
      }, backoff);
    } else {
      await this.transition(entry.identifier, DownloadState.FAILED);
      await this.downloadDb.update(entry.identifier, {
        last_error: errorMessage,
      });

      this.emit({
        type: 'error',
        identifier: entry.identifier,
        data: {
          errorCode: 'IMPORT_FAILED_FINAL',
          message: errorMessage,
          retryCount: nextRetry,
          maxRetries: entry.max_retries,
        },
      });
    }
  }

  private async transition(
    identifier: string,
    newState: DownloadState,
    extra?: Record<string, unknown>
  ): Promise<void> {
    const entry = await this.downloadDb.getByIdentifier(identifier);
    if (!entry) throw new Error(`[DownloadManager] Entry not found: ${identifier}`);

    const currentState = entry.state as DownloadState;
    const allowed = VALID_TRANSITIONS[currentState];

    if (!allowed?.includes(newState)) {
      console.warn(
        `[DownloadManager] Invalid transition: ${currentState} → ${newState} for ${identifier}`
      );
      return;
    }

    await this.downloadDb.update(identifier, {
      state: newState,
      ...extra,
    });

    this.emit({ type: 'state_change', identifier });
  }

  /** Network reconnected → immediately re-queue all RETRY_WAIT entries so processQueue picks them up. */
  private async requeueRetryWaitEntries(): Promise<void> {
    const retryWait = await this.downloadDb.getByState(DownloadState.RETRY_WAIT);
    await Promise.allSettled(
      retryWait.map(entry => this.transition(entry.identifier, DownloadState.QUEUED).catch(err =>
        console.warn(`[DownloadManager] Failed to requeue ${entry.identifier}:`, err))
      )
    );
  }

  /** Signal lost while downloading → stop and set retry_wait */
  private async stopDownloadsOnSignalLoss(): Promise<void> {
    const active = Array.from(this.activeDownloads.entries());
    for (const [identifier, { nativeId }] of active) {
      try {
        await CapacitorDownloader.stop({ id: nativeId });
        this.activeDownloads.delete(identifier);
        await this.transition(identifier, DownloadState.RETRY_WAIT);
      } catch (err) {
        console.warn(`[DownloadManager] Could not stop ${identifier} on signal loss:`, err);
      }
    }
  }

  private async recoverCrashedEntries(): Promise<void> {
    // DOWNLOADING entries → reset to QUEUED (native download is gone after app restart)
    const downloading = await this.downloadDb.getByState(DownloadState.DOWNLOADING);
    for (const entry of downloading) {
      await this.downloadDb.update(entry.identifier, {
        state: DownloadState.QUEUED,
        progress: 0,
        bytes_downloaded: 0,
      });
    }

    // IMPORTING entries → check if .ecar still exists
    const importing = await this.downloadDb.getByState(DownloadState.IMPORTING);
    for (const entry of importing) {
      if (entry.file_path) {
        try {
          await Filesystem.stat({ path: entry.file_path });
          // .ecar exists → retry from DOWNLOADED
          await this.downloadDb.update(entry.identifier, {
            state: DownloadState.DOWNLOADED,
          });
        } catch {
          // .ecar gone → re-download
          await this.downloadDb.update(entry.identifier, {
            state: DownloadState.QUEUED,
            progress: 0,
            bytes_downloaded: 0,
          });
        }
      } else {
        await this.downloadDb.update(entry.identifier, {
          state: DownloadState.QUEUED,
          progress: 0,
          bytes_downloaded: 0,
        });
      }
    }

    // RETRY_WAIT entries → reset to QUEUED
    const retryWait = await this.downloadDb.getByState(DownloadState.RETRY_WAIT);
    for (const entry of retryWait) {
      await this.transition(entry.identifier, DownloadState.QUEUED);
    }

    // PAUSED entries → leave as-is (user resumes manually)
  }

  private async cleanPartialFile(entry: DownloadQueueEntry): Promise<void> {
    if (entry.file_path) {
      try {
        await Filesystem.deleteFile({ path: entry.file_path });
      } catch {
        /* file may not exist */
      }
    }
  }

  private emit(event: DownloadEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[DownloadManager] Listener error:', err);
      }
    }
  }
}

export const downloadManager = new DownloadManager(
  downloadDbService,
  networkService,
  importService
);
