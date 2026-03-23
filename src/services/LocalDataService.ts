import { networkService } from './network/networkService';
import { keyValueDbService, KVKey } from './db/KeyValueDbService';
import { BatchService } from './course/BatchService';
import type { ContentStateUpdateRequest } from '../types/collectionTypes';

class LocalDataService {
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

  private static readonly MAX_RETRIES = 5;

  private async flushContentStateQueue(): Promise<void> {
    try {
      type QueueItem = ContentStateUpdateRequest & { queuedAt: number; retryCount: number };
      const queue = await keyValueDbService.getJSON<QueueItem[]>(KVKey.PENDING_CONTENT_STATE_Q);
      if (!queue || queue.length === 0) return;

      console.debug(`[LocalDataService] Flushing ${queue.length} pending content state update(s)`);

      const failed: QueueItem[] = [];

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
          const retryCount = (item.retryCount ?? 0) + 1;
          if (retryCount < LocalDataService.MAX_RETRIES) {
            failed.push({ ...item, retryCount });
          } else {
            console.warn(`[LocalDataService] Dropping content state update after ${retryCount} failures`, item);
          }
        }
      }

      await keyValueDbService.setJSON(KVKey.PENDING_CONTENT_STATE_Q, failed);

      if (failed.length > 0) {
        console.warn(`[LocalDataService] ${failed.length} item(s) failed to sync and will be retried`);
      } else {
        console.debug('[LocalDataService] All pending updates synced successfully');
      }
    } catch (err) {
      console.warn('[LocalDataService] Flush error:', err);
    }
  }

  // ── Enrol queue ──────────────────────────────────────────────────────────────

  private async flushEnrolQueue(): Promise<void> {
    try {
      type EnrolItem = { courseId: string; userId: string; batchId: string; queuedAt: number; retryCount: number };
      const queue = await keyValueDbService.getJSON<EnrolItem[]>(KVKey.PENDING_ENROL_Q);
      if (!queue || queue.length === 0) return;

      console.debug(`[LocalDataService] Flushing ${queue.length} pending enrol request(s)`);

      const failed: EnrolItem[] = [];

      for (const item of queue) {
        try {
          await this.batchService.enrol(item.courseId, item.userId, item.batchId);
        } catch {
          const retryCount = (item.retryCount ?? 0) + 1;
          if (retryCount < LocalDataService.MAX_RETRIES) {
            failed.push({ ...item, retryCount });
          } else {
            console.warn(`[LocalDataService] Dropping enrol after ${retryCount} failures`, item);
          }
        }
      }

      await keyValueDbService.setJSON(KVKey.PENDING_ENROL_Q, failed);

      if (failed.length > 0) {
        console.warn(`[LocalDataService] ${failed.length} enrol request(s) failed and will be retried`);
      } else {
        console.debug('[LocalDataService] All pending enrols synced successfully');
      }
    } catch (err) {
      console.warn('[LocalDataService] Enrol flush error:', err);
    }
  }
}

export const localDataService = new LocalDataService();
