import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoSyncMode, NetworkQueueType, SyncType } from './types';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../db/DatabaseService', () => ({
  databaseService: { initialize: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../db/TelemetryDbService', () => ({
  telemetryDbService: { deleteOlderThan: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../db/KeyValueDbService', () => ({
  keyValueDbService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
  KVKey: {
    TELEMETRY_SYNC_LAST_RUN: 'telemetry_sync_last_run',
    TELEMETRY_SYNC_NETWORK_TYPE: 'telemetry_sync_network_type',
    ACTIVE_CHANNEL_ID: 'active_channel_id',
  },
}));

vi.mock('../UserService', () => ({
  userService: {
    getUserId: vi.fn().mockReturnValue('user-1'),
    getChannelId: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../network/networkService', () => ({
  networkService: {
    isConnected: vi.fn().mockReturnValue(true),
    subscribe: vi.fn().mockReturnValue(() => {}),
  },
}));

vi.mock('./TelemetryBatchEnqueuer', () => ({
  telemetryBatchEnqueuer: {
    processBatch: vi.fn().mockResolvedValue(0),
    hasThresholdCrossed: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock('./CourseProgressEnqueuer', () => ({
  courseProgressEnqueuer: { enqueue: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('./CourseAssessmentEnqueuer', () => ({
  courseAssessmentEnqueuer: {
    persistAssessEvent: vi.fn().mockResolvedValue(undefined),
    aggregateAndEnqueue: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../db/NetworkQueueDbService', () => ({
  networkQueueDbService: {
    resetProcessing: vi.fn().mockResolvedValue(undefined),
    purgeStaleTelemetry: vi.fn().mockResolvedValue(undefined),
    resetDeadLetter: vi.fn().mockResolvedValue(undefined),
    purgeDeadLetter: vi.fn().mockResolvedValue(undefined),
    getPendingCount: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('./NetworkQueueProcessor', () => ({
  networkQueueProcessor: {
    execute: vi.fn().mockResolvedValue({
      telemetry: { syncedBatchCount: 0, syncedEventCount: 0 },
      courseProgress: { syncedCount: 0 },
      courseAssessment: { syncedCount: 0 },
      errors: [],
    }),
  },
}));

vi.mock('./SyncConfig', () => ({
  syncConfig: {
    load: vi.fn().mockResolvedValue(undefined),
    setChannelId: vi.fn(),
  },
}));

// ── Import AFTER mocks ──────────────────────────────────────────────────────

import { syncService } from './SyncService';
import { databaseService } from '../db/DatabaseService';
import { networkService } from '../network/networkService';
import { telemetryBatchEnqueuer } from './TelemetryBatchEnqueuer';
import { courseAssessmentEnqueuer } from './CourseAssessmentEnqueuer';
import { networkQueueProcessor } from './NetworkQueueProcessor';
import { keyValueDbService, KVKey } from '../db/KeyValueDbService';
import { networkQueueDbService } from '../db/NetworkQueueDbService';
import { userService } from '../UserService';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (networkService.isConnected as any).mockReturnValue(true);
    (keyValueDbService.get as any).mockResolvedValue(null);
    (keyValueDbService.set as any).mockResolvedValue(undefined);
    (databaseService.initialize as any).mockResolvedValue(undefined);
    (telemetryBatchEnqueuer.processBatch as any).mockResolvedValue(0);
    (telemetryBatchEnqueuer.hasThresholdCrossed as any).mockResolvedValue(false);
    (networkQueueProcessor.execute as any).mockResolvedValue({
      telemetry: { syncedBatchCount: 0, syncedEventCount: 0 },
      courseProgress: { syncedCount: 0 },
      courseAssessment: { syncedCount: 0 },
      errors: [],
    });
    (userService.getUserId as any).mockReturnValue('user-1');
    (networkService.subscribe as any).mockReturnValue(() => {});
  });

  // ── onInit ───────────────────────────────────────────────────────────────

  describe('onInit', () => {
    it('initializes database on startup', async () => {
      await syncService.onInit();
      expect(databaseService.initialize).toHaveBeenCalled();
    });

    it('runs crash recovery (resetProcessing) on startup', async () => {
      await syncService.onInit();
      expect(networkQueueDbService.resetProcessing).toHaveBeenCalled();
    });

    it('purges stale telemetry on startup', async () => {
      await syncService.onInit();
      expect(networkQueueDbService.purgeStaleTelemetry).toHaveBeenCalled();
    });

    it('resets dead-letter rows on startup', async () => {
      await syncService.onInit();
      expect(networkQueueDbService.resetDeadLetter).toHaveBeenCalled();
    });

    it('purges dead-letter rows older than 30 days', async () => {
      await syncService.onInit();
      expect(networkQueueDbService.purgeDeadLetter).toHaveBeenCalledWith(30);
    });

    it('does not throw if purgeStaleTelemetry fails', async () => {
      (networkQueueDbService.purgeStaleTelemetry as any).mockRejectedValue(new Error('DB error'));
      await expect(syncService.onInit()).resolves.toBeUndefined();
    });
  });

  // ── forceSync ─────────────────────────────────────────────────────────────

  describe('forceSync', () => {
    it('returns empty result when offline', async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      const result = await syncService.forceSync();
      expect(result.telemetry.syncedBatchCount).toBe(0);
      expect(networkQueueProcessor.execute).not.toHaveBeenCalled();
    });

    it('enqueues telemetry batches until empty on SyncType.ALL', async () => {
      (telemetryBatchEnqueuer.processBatch as any)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);
      await syncService.forceSync(SyncType.ALL);
      expect(telemetryBatchEnqueuer.processBatch).toHaveBeenCalledTimes(2);
    });

    it('aggregates assessment events on SyncType.ALL', async () => {
      await syncService.forceSync(SyncType.ALL);
      expect(courseAssessmentEnqueuer.aggregateAndEnqueue).toHaveBeenCalledWith('user-1');
    });

    it('skips telemetry enqueue on SyncType.COURSE', async () => {
      await syncService.forceSync(SyncType.COURSE);
      expect(telemetryBatchEnqueuer.processBatch).not.toHaveBeenCalled();
    });

    it('writes TELEMETRY_SYNC_LAST_RUN after successful forceSync', async () => {
      await syncService.forceSync();
      expect(keyValueDbService.set).toHaveBeenCalledWith(
        KVKey.TELEMETRY_SYNC_LAST_RUN,
        expect.any(String),
      );
    });

    it('processes only TELEMETRY type when SyncType.TELEMETRY', async () => {
      await syncService.forceSync(SyncType.TELEMETRY);
      expect(networkQueueProcessor.execute).toHaveBeenCalledWith([NetworkQueueType.TELEMETRY]);
    });

    it('processes only COURSE types when SyncType.COURSE', async () => {
      await syncService.forceSync(SyncType.COURSE);
      expect(networkQueueProcessor.execute).toHaveBeenCalledWith([
        NetworkQueueType.COURSE_PROGRESS,
        NetworkQueueType.COURSE_ASSESMENT,
      ]);
    });

    it('processes all types when SyncType.ALL', async () => {
      await syncService.forceSync(SyncType.ALL);
      expect(networkQueueProcessor.execute).toHaveBeenCalledWith(undefined);
    });

    it('skips aggregation when userId is empty', async () => {
      (userService.getUserId as any).mockReturnValue('');
      await syncService.forceSync(SyncType.ALL);
      expect(courseAssessmentEnqueuer.aggregateAndEnqueue).not.toHaveBeenCalled();
    });
  });

  // ── autoSync ─────────────────────────────────────────────────────────────

  describe('autoSync', () => {
    it('returns empty result when offline', async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      const result = await syncService.autoSync();
      expect(result.telemetry.syncedBatchCount).toBe(0);
      expect(networkQueueProcessor.execute).not.toHaveBeenCalled();
    });

    it('returns empty result when sync mode is OFF', async () => {
      (keyValueDbService.get as any).mockResolvedValue(AutoSyncMode.OFF);
      const result = await syncService.autoSync();
      expect(result.telemetry.syncedBatchCount).toBe(0);
      expect(networkQueueProcessor.execute).not.toHaveBeenCalled();
    });

    it('writes TELEMETRY_SYNC_LAST_RUN on ALWAYS_ON full sync', async () => {
      (keyValueDbService.get as any).mockResolvedValue(AutoSyncMode.ALWAYS_ON);
      await syncService.autoSync();
      expect(keyValueDbService.set).toHaveBeenCalledWith(
        KVKey.TELEMETRY_SYNC_LAST_RUN,
        expect.any(String),
      );
    });

    it('processes telemetry when threshold crossed in ALWAYS_ON mode', async () => {
      (keyValueDbService.get as any).mockResolvedValue(AutoSyncMode.ALWAYS_ON);
      (telemetryBatchEnqueuer.hasThresholdCrossed as any).mockResolvedValue(true);
      (telemetryBatchEnqueuer.processBatch as any)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);
      await syncService.autoSync();
      expect(telemetryBatchEnqueuer.processBatch).toHaveBeenCalled();
    });

    it('skips telemetry when threshold not crossed in ALWAYS_ON', async () => {
      (keyValueDbService.get as any).mockResolvedValue(AutoSyncMode.ALWAYS_ON);
      (telemetryBatchEnqueuer.hasThresholdCrossed as any).mockResolvedValue(false);
      await syncService.autoSync();
      expect(telemetryBatchEnqueuer.processBatch).not.toHaveBeenCalled();
    });

    it('defaults to ALWAYS_ON when no preference saved', async () => {
      (keyValueDbService.get as any).mockResolvedValue(null);
      (telemetryBatchEnqueuer.hasThresholdCrossed as any).mockResolvedValue(false);
      await syncService.autoSync();
      // Full sync path runs (not OVER_WIFI partial path)
      expect(networkQueueProcessor.execute).toHaveBeenCalledWith(undefined);
    });
  });

  // ── getLastSyncTime ───────────────────────────────────────────────────────

  describe('getLastSyncTime', () => {
    it('returns null when no last sync recorded', async () => {
      (keyValueDbService.get as any).mockResolvedValue(null);
      const t = await syncService.getLastSyncTime();
      expect(t).toBeNull();
    });

    it('returns numeric timestamp when last sync recorded', async () => {
      (keyValueDbService.get as any).mockResolvedValue('1700000000000');
      const t = await syncService.getLastSyncTime();
      expect(t).toBe(1700000000000);
    });
  });

  // ── getPendingCount ───────────────────────────────────────────────────────

  describe('getPendingCount', () => {
    it('returns pending count from db', async () => {
      (networkQueueDbService.getPendingCount as any).mockResolvedValue(7);
      const count = await syncService.getPendingCount();
      expect(count).toBe(7);
    });

    it('passes type filter to db', async () => {
      await syncService.getPendingCount(NetworkQueueType.TELEMETRY);
      expect(networkQueueDbService.getPendingCount).toHaveBeenCalledWith(NetworkQueueType.TELEMETRY);
    });
  });

  // ── enqueueCourseProgress ─────────────────────────────────────────────────

  describe('enqueueCourseProgress', () => {
    it('delegates to courseProgressEnqueuer.enqueue', async () => {
      const { courseProgressEnqueuer } = await import('./CourseProgressEnqueuer');
      const request = { userId: 'u1', contents: [] };
      await syncService.enqueueCourseProgress(request as any);
      expect(courseProgressEnqueuer.enqueue).toHaveBeenCalledWith(request);
    });
  });

  // ── captureAssessmentEvent ────────────────────────────────────────────────

  describe('captureAssessmentEvent', () => {
    it('delegates to courseAssessmentEnqueuer.persistAssessEvent', async () => {
      const event = { eid: 'ASSESS' };
      const context = { userId: 'u1', courseId: 'c1', batchId: 'b1' };
      await syncService.captureAssessmentEvent(event, context, 'attempt-1');
      expect(courseAssessmentEnqueuer.persistAssessEvent).toHaveBeenCalledWith(
        event, context, 'attempt-1',
      );
    });
  });

  // ── autoSync OVER_WIFI partial path ───────────────────────────────────────

  describe('autoSync OVER_WIFI', () => {
    it('syncs only course types when OVER_WIFI but not on WiFi', async () => {
      (keyValueDbService.get as any).mockResolvedValue(AutoSyncMode.OVER_WIFI);
      // Simulate cellular connection (not WiFi) via network state
      (networkService.subscribe as any).mockImplementation((cb: any) => {
        cb({ connected: true, connectionType: 'cellular' });
        return () => {};
      });

      // Re-init to pick up new network state
      await syncService.onInit();

      await syncService.autoSync();

      expect(networkQueueProcessor.execute).toHaveBeenCalledWith([
        NetworkQueueType.COURSE_PROGRESS,
        NetworkQueueType.COURSE_ASSESMENT,
      ]);
      // Telemetry batches NOT enqueued
      expect(telemetryBatchEnqueuer.processBatch).not.toHaveBeenCalled();
    });

    it('writes TELEMETRY_SYNC_LAST_RUN even in OVER_WIFI+cellular partial sync', async () => {
      (keyValueDbService.get as any).mockResolvedValue(AutoSyncMode.OVER_WIFI);
      (networkService.subscribe as any).mockImplementation((cb: any) => {
        cb({ connected: true, connectionType: 'cellular' });
        return () => {};
      });
      await syncService.onInit();

      await syncService.autoSync();

      expect(keyValueDbService.set).toHaveBeenCalledWith(
        KVKey.TELEMETRY_SYNC_LAST_RUN,
        expect.any(String),
      );
    });
  });
});
