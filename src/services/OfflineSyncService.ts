import { networkService } from './network/networkService';
import { keyValueDbService } from './db/KeyValueDbService';
import { BatchService } from './course/BatchService';
import { KVKey } from './db/KeyValueDbService';
import type { ContentStateUpdateRequest } from '../types/collectionTypes';

class OfflineSyncService {
  private readonly batchService = new BatchService();
  private flushing = false;

  /**
   * Call once at app start (after networkService.init()).
   * Subscribes to connectivity changes and flushes any pending queue
   * whenever the device comes back online.
   */
  init(): void {
    networkService.subscribe(async (state) => {
      if (state.connected && !this.flushing) {
        this.flushing = true;
        try {
          await this.flushContentStateQueue();
          await this.flushEnrolQueue();
        } finally {
          this.flushing = false;
        }
      }
    });
  }

  // ── Flush ────────────────────────────────────────────────────────────────────

  private async flushContentStateQueue(): Promise<void> {
    try {
      const raw = await keyValueDbService.getRaw(KVKey.PENDING_CONTENT_STATE_Q);
      if (!raw) return;

      const queue: Array<ContentStateUpdateRequest & { queuedAt: number }> = JSON.parse(raw);
      if (queue.length === 0) return;

      console.debug(`[OfflineSyncService] Flushing ${queue.length} pending content state update(s)`);

      const failed: typeof queue = [];

      for (const item of queue) {
        const request: ContentStateUpdateRequest = {
          userId: item.userId,
          courseId: item.courseId,
          batchId: item.batchId,
          contents: item.contents,
          ...(item.assessments?.length ? { assessments: item.assessments } : {}),
        };
        try {
          await this.batchService.contentStateUpdate(request);
        } catch {
          // Keep failed items so they are retried on the next reconnect
          failed.push(item);
        }
      }

      await keyValueDbService.setRaw(
        KVKey.PENDING_CONTENT_STATE_Q,
        JSON.stringify(failed),
      );

      if (failed.length > 0) {
        console.warn(`[OfflineSyncService] ${failed.length} item(s) failed to sync and will be retried`);
      } else {
        console.debug('[OfflineSyncService] All pending updates synced successfully');
      }
    } catch (err) {
      console.warn('[OfflineSyncService] Flush error:', err);
    }
  }

  // ── Enrol queue ──────────────────────────────────────────────────────────────

  private async flushEnrolQueue(): Promise<void> {
    try {
      const raw = await keyValueDbService.getRaw(KVKey.PENDING_ENROL_Q);
      if (!raw) return;

      const queue: Array<{ courseId: string; userId: string; batchId: string; queuedAt: number }> = JSON.parse(raw);
      if (queue.length === 0) return;

      console.debug(`[OfflineSyncService] Flushing ${queue.length} pending enrol request(s)`);

      const failed: typeof queue = [];

      for (const item of queue) {
        try {
          await this.batchService.enrol(item.courseId, item.userId, item.batchId);
        } catch {
          failed.push(item);
        }
      }

      await keyValueDbService.setRaw(KVKey.PENDING_ENROL_Q, JSON.stringify(failed));

      if (failed.length > 0) {
        console.warn(`[OfflineSyncService] ${failed.length} enrol request(s) failed and will be retried`);
      } else {
        console.debug('[OfflineSyncService] All pending enrols synced successfully');
      }
    } catch (err) {
      console.warn('[OfflineSyncService] Enrol flush error:', err);
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
