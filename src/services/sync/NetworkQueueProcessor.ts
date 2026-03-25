import { CapacitorHttp } from '@capacitor/core';
import { networkService } from '../network/networkService';
import { networkQueueDbService } from '../db/NetworkQueueDbService';
import { authHeadersBuilder } from './AuthHeadersBuilder';
import { syncConfig } from './SyncConfig';
import { base64ToUint8Array } from './compression';
import { NetworkQueueEntry, NetworkQueueType, SyncResult } from './types';

const BATCH_SIZE = 5; // rows processed per execute() call

export class NetworkQueueProcessor {
  /**
   * Dequeue up to BATCH_SIZE pending rows of the given types, execute each
   * HTTP request, and record success or failure.
   *
   * @param typeFilter  If provided, only rows with matching type are fetched.
   */
  async execute(typeFilter?: NetworkQueueType[]): Promise<SyncResult> {
    const result: SyncResult = {
      telemetry:        { syncedEventCount: 0, syncedBatchCount: 0 },
      courseProgress:   { syncedCount: 0 },
      courseAssessment: { syncedCount: 0 },
      errors:           [],
    };

    const entries = await networkQueueDbService.getPending(BATCH_SIZE, typeFilter);
    if (entries.length === 0) return result;

    for (const entry of entries) {
      // G3 — stop mid-batch if network dropped
      if (!networkService.isConnected()) break;

      await networkQueueDbService.markProcessing(entry.msg_id);
      try {
        await this.executeRequest(entry);
        await networkQueueDbService.markSuccess(entry.msg_id);

        switch (entry.type) {
          case NetworkQueueType.TELEMETRY:
            result.telemetry.syncedBatchCount += 1;
            result.telemetry.syncedEventCount += entry.item_count;
            break;
          case NetworkQueueType.COURSE_PROGRESS:
            result.courseProgress.syncedCount += entry.item_count;
            break;
          case NetworkQueueType.COURSE_ASSESMENT:
            result.courseAssessment.syncedCount += entry.item_count;
            break;
        }
      } catch (err: any) {
        const message = err?.message ?? String(err);
        const httpStatus: number = err?.status ?? 0;
        const retryCount = entry.retry_count;

        await this.handleError(entry.msg_id, httpStatus, message, retryCount, entry.max_retries);

        result.errors.push({
          msgId:   entry.msg_id,
          type:    entry.type,
          status:  httpStatus,
          message,
        });
      }
    }

    return result;
  }

  private async executeRequest(entry: NetworkQueueEntry): Promise<void> {
    const reqConfig = syncConfig.getRequestConfig(entry.type);
    const headers   = await authHeadersBuilder.build(entry.type);

    let responseData: any;

    if (reqConfig.isGzipped) {
      // Telemetry: send raw gzip bytes decoded from base64
      const bytes = base64ToUint8Array(entry.data);
      const response = await CapacitorHttp.request({
        url:     reqConfig.url,
        method:  reqConfig.method,
        headers,
        data:    bytes,
      });
      responseData = response;
      this.assertHttpSuccess(response.status, response.data);
    } else {
      // Course progress / assessment: send JSON body
      const parsed = JSON.parse(entry.data);
      const response = await CapacitorHttp.request({
        url:     reqConfig.url,
        method:  reqConfig.method,
        headers,
        data:    parsed,
      });
      responseData = response;
      this.assertHttpSuccess(response.status, response.data);
    }

    return responseData;
  }

  /**
   * Apply the error-handling matrix from the plan:
   *
   * HTTP 400             → DEAD_LETTER  (malformed payload, never retry)
   * HTTP 401/403 try=1   → PENDING, next_retry_at=0  (immediate; tokens may refresh)
   * HTTP 401/403 try>1   → PENDING, next_retry_at=now+60s  (wait for re-login)
   * Network error (0)    → PENDING, next_retry_at=now+10s
   * HTTP 5xx / other     → PENDING, next_retry_at=now+(2^N × 1000ms)
   * retryCount≥maxRetries → DEAD_LETTER
   */
  private async handleError(
    msg_id: string,
    httpStatus: number,
    error: string,
    retryCount: number,
    maxRetries: number
  ): Promise<void> {
    const db = networkQueueDbService;

    // Hard dead-letter: 400 = malformed, never retry
    if (httpStatus === 400) {
      await db.markFailed(msg_id, error, maxRetries, maxRetries); // triggers DEAD_LETTER
      return;
    }

    // Exhausted retries → DEAD_LETTER
    if (retryCount >= maxRetries) {
      await db.markFailed(msg_id, error, retryCount, maxRetries);
      return;
    }

    let nextRetryAt: number;

    if (httpStatus === 401 || httpStatus === 403) {
      // First attempt: retry immediately (tokens may have just been refreshed)
      // Subsequent attempts: wait 60s for user to re-login
      nextRetryAt = retryCount === 0 ? 0 : Date.now() + 60_000;
    } else if (httpStatus === 0) {
      // Network error — brief wait before retry
      nextRetryAt = Date.now() + 10_000;
    } else {
      // 5xx / other — exponential backoff: 2^N × 1000ms
      nextRetryAt = Date.now() + Math.pow(2, retryCount) * 1000;
    }

    await db.markFailedAt(msg_id, error, retryCount + 1, nextRetryAt);
  }

  private assertHttpSuccess(status: number, data: any): void {
    if (status < 200 || status >= 300) {
      const err: any = new Error(`HTTP ${status}`);
      err.status = status;
      err.responseData = data;
      throw err;
    }
  }
}

export const networkQueueProcessor = new NetworkQueueProcessor();
