import { databaseService } from '../db/DatabaseService';
import { telemetryDbService } from '../db/TelemetryDbService';
import { keyValueDbService, KVKey } from '../db/KeyValueDbService';
import { userService } from '../UserService';
import { networkService, type NetworkState } from '../network/networkService';
import { telemetryBatchEnqueuer } from './TelemetryBatchEnqueuer';
import { courseProgressEnqueuer } from './CourseProgressEnqueuer';
import { courseAssessmentEnqueuer } from './CourseAssessmentEnqueuer';
import { networkQueueDbService } from '../db/NetworkQueueDbService';
import { networkQueueProcessor } from './NetworkQueueProcessor';
import { syncConfig } from './SyncConfig';
import {
  AutoSyncMode,
  CourseContext,
  NetworkQueueType,
  SyncResult,
  SyncType,
  UpdateContentStateRequest,
} from './types';

class SyncService {
  private isSyncing = false;
  // Last known network state — updated via subscribe in onInit()
  private _lastNetworkState: NetworkState = { connected: true, connectionType: 'unknown' };

  /** Call once on app startup, after databaseService.initialize(). */
  async onInit(): Promise<void> {
    await databaseService.initialize();
    await syncConfig.load();

    // Track current network state without accessing private properties
    networkService.subscribe((state) => { this._lastNetworkState = state; });

    // Restore channel ID so sync requests include the correct X-Channel-Id header
    const savedChannelId = await keyValueDbService.get(KVKey.ACTIVE_CHANNEL_ID).catch(() => null);
    if (savedChannelId) syncConfig.setChannelId(savedChannelId);

    // Crash recovery: any row left in PROCESSING was mid-flight when the app died
    await networkQueueDbService.resetProcessing();

    // Reset DEAD_LETTER rows so they get another chance on next sync
    // Also purge stale telemetry rows that were stored as gzip base64 (legacy format)
    await networkQueueDbService.purgeStaleTelemetry().catch(() => {});
    await networkQueueDbService.resetDeadLetter().catch(() => {});

    // Phase 7 cleanup — purge stale data on every cold start
    await telemetryDbService.deleteOlderThan(7).catch(() => {});
    await networkQueueDbService.purgeDeadLetter(30).catch(() => {});
  }

  /** Enqueue a course progress update and fire a background sync immediately. */
  async enqueueCourseProgress(request: UpdateContentStateRequest): Promise<void> {
    await courseProgressEnqueuer.enqueue(request);
    // Background fire-and-forget — UI already updated locally inside enqueue
    void this._processTypes([NetworkQueueType.COURSE_PROGRESS]);
  }

  /** Persist a raw ASSESS event to the staging table. Call from TelemetryService.save(). */
  async captureAssessmentEvent(event: any, context: CourseContext, attemptId: string): Promise<void> {
    await courseAssessmentEnqueuer.persistAssessEvent(event, context, attemptId);
  }

  /**
   * Force a full sync cycle — enqueue all pending staging data then drain the
   * network queue. Called from a Settings page or manual sync button.
   */
  async forceSync(type: SyncType = SyncType.ALL): Promise<SyncResult> {
    const result = this._emptyResult();

    if (!networkService.isConnected()) return result;

    await databaseService.initialize();
    await syncConfig.load();

    if (type === SyncType.TELEMETRY || type === SyncType.ALL) {
      // Enqueue all remaining staging events in batches
      let enqueued: number;
      do {
        enqueued = await telemetryBatchEnqueuer.processBatch();
      } while (enqueued > 0);
    }

    if (type === SyncType.COURSE || type === SyncType.ALL) {
      const userId = userService.getUserId() ?? '';
      if (userId) {
        await courseAssessmentEnqueuer.aggregateAndEnqueue(userId);
      }
    }

    const typeFilter = this._typeFilterFor(type);
    const partial = await this._processTypes(typeFilter);

    result.telemetry        = partial.telemetry;
    result.courseProgress   = partial.courseProgress;
    result.courseAssessment = partial.courseAssessment;
    result.errors           = partial.errors;

    await keyValueDbService.set(KVKey.TELEMETRY_SYNC_LAST_RUN, String(Date.now()));

    return result;
  }

  /**
   * Auto-sync — called by SyncScheduler on a timer and on network reconnect.
   * Respects the user's TELEMETRY_SYNC_NETWORK_TYPE preference.
   * Course data always syncs regardless of WiFi preference.
   */
  async autoSync(): Promise<SyncResult> {
    const result = this._emptyResult();

    if (!networkService.isConnected()) return result;

    const rawMode = await keyValueDbService.get(KVKey.TELEMETRY_SYNC_NETWORK_TYPE).catch(() => null);
    const mode: AutoSyncMode = (rawMode as AutoSyncMode) ?? AutoSyncMode.ALWAYS_ON;

    if (mode === AutoSyncMode.OFF) return result;

    await databaseService.initialize();
    await syncConfig.load();

    const isWifi = this._lastNetworkState.connectionType === 'wifi';

    if (mode === AutoSyncMode.OVER_WIFI && !isWifi) {
      // WiFi-only mode but not on WiFi: only sync course data
      const userId = userService.getUserId() ?? '';
      if (userId) {
        await courseAssessmentEnqueuer.aggregateAndEnqueue(userId);
      }
      const partial = await this._processTypes([
        NetworkQueueType.COURSE_PROGRESS,
        NetworkQueueType.COURSE_ASSESMENT,
      ]);
      result.courseProgress   = partial.courseProgress;
      result.courseAssessment = partial.courseAssessment;
      result.errors           = partial.errors;
      await keyValueDbService.set(KVKey.TELEMETRY_SYNC_LAST_RUN, String(Date.now()));
      return result;
    }

    // ALWAYS_ON or on WiFi: full sync
    if (await telemetryBatchEnqueuer.hasThresholdCrossed()) {
      let enqueued: number;
      do {
        enqueued = await telemetryBatchEnqueuer.processBatch();
      } while (enqueued > 0);
    }

    const userId = userService.getUserId() ?? '';
    if (userId) {
      await courseAssessmentEnqueuer.aggregateAndEnqueue(userId);
    }

    const partial = await this._processTypes();
    result.telemetry        = partial.telemetry;
    result.courseProgress   = partial.courseProgress;
    result.courseAssessment = partial.courseAssessment;
    result.errors           = partial.errors;

    await keyValueDbService.set(KVKey.TELEMETRY_SYNC_LAST_RUN, String(Date.now()));
    return result;
  }

  async getPendingCount(type?: NetworkQueueType): Promise<number> {
    return networkQueueDbService.getPendingCount(type);
  }

  async getLastSyncTime(): Promise<number | null> {
    const raw = await keyValueDbService.get(KVKey.TELEMETRY_SYNC_LAST_RUN).catch(() => null);
    return raw ? Number(raw) : null;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async _processTypes(
    types?: NetworkQueueType[]
  ): Promise<SyncResult> {
    if (this.isSyncing) return this._emptyResult();
    this.isSyncing = true;

    const merged = this._emptyResult();

    try {
      // Keep draining until no more PENDING rows
      let hasMore = true;
      while (hasMore) {
        if (!networkService.isConnected()) break;

        const partial = await networkQueueProcessor.execute(types);
        merged.telemetry.syncedBatchCount  += partial.telemetry.syncedBatchCount;
        merged.telemetry.syncedEventCount  += partial.telemetry.syncedEventCount;
        merged.courseProgress.syncedCount  += partial.courseProgress.syncedCount;
        merged.courseAssessment.syncedCount += partial.courseAssessment.syncedCount;
        merged.errors.push(...partial.errors);

        const totalSuccess =
          partial.telemetry.syncedBatchCount +
          partial.courseProgress.syncedCount +
          partial.courseAssessment.syncedCount;

        // Stop when a batch produced no successes (all errored or empty)
        hasMore = totalSuccess > 0 && partial.errors.length === 0;
      }
    } finally {
      this.isSyncing = false;
    }

    return merged;
  }

  private _typeFilterFor(type: SyncType): NetworkQueueType[] | undefined {
    switch (type) {
      case SyncType.TELEMETRY: return [NetworkQueueType.TELEMETRY];
      case SyncType.COURSE:    return [NetworkQueueType.COURSE_PROGRESS, NetworkQueueType.COURSE_ASSESMENT];
      case SyncType.ALL:       return undefined;
    }
  }

  private _emptyResult(): SyncResult {
    return {
      telemetry:        { syncedEventCount: 0, syncedBatchCount: 0 },
      courseProgress:   { syncedCount: 0 },
      courseAssessment: { syncedCount: 0 },
      errors:           [],
    };
  }
}

export const syncService = new SyncService();
