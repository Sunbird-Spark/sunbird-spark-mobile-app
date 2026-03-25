import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './DatabaseService';
import { NetworkQueueEntry, NetworkQueueType, QueueEntryStatus } from '../sync/types';

export class NetworkQueueDbService {
  async insert(entry: Omit<NetworkQueueEntry, '_id' | 'msg_id' | 'retry_count' | 'max_retries' | 'next_retry_at' | 'last_error' | 'status'>): Promise<string> {
    const msg_id = uuidv4();
    await databaseService.insert('network_queue', {
      msg_id,
      type:          entry.type,
      priority:      entry.priority,
      timestamp:     entry.timestamp,
      data:          entry.data,
      item_count:    entry.item_count,
      retry_count:   0,
      max_retries:   5,
      next_retry_at: 0,
      last_error:    null,
      status:        QueueEntryStatus.PENDING,
    });
    return msg_id;
  }

  async getPending(limit = 10, types?: NetworkQueueType[]): Promise<NetworkQueueEntry[]> {
    const now = Date.now();
    const db = databaseService.getDb();

    let sql = `SELECT * FROM network_queue
       WHERE status IN ('PENDING', 'FAILED')
         AND next_retry_at <= ?`;
    const params: any[] = [now];

    if (types && types.length > 0) {
      const placeholders = types.map(() => '?').join(', ');
      sql += ` AND type IN (${placeholders})`;
      params.push(...types);
    }

    sql += ` ORDER BY priority ASC, timestamp ASC LIMIT ?`;
    params.push(limit);

    const result = await db.query(sql, params);
    return (result.values ?? []) as NetworkQueueEntry[];
  }

  async markProcessing(msg_id: string): Promise<void> {
    await databaseService.update(
      'network_queue',
      { status: QueueEntryStatus.PROCESSING },
      { eq: { msg_id } }
    );
  }

  async markSuccess(msg_id: string): Promise<void> {
    await databaseService.delete('network_queue', { eq: { msg_id } });
  }

  async markFailed(msg_id: string, error: string, retryCount: number, maxRetries: number): Promise<void> {
    if (retryCount >= maxRetries) {
      await databaseService.update(
        'network_queue',
        { status: QueueEntryStatus.DEAD_LETTER, last_error: error },
        { eq: { msg_id } }
      );
      return;
    }

    const backoffMs = Math.pow(2, retryCount) * 1000;
    await databaseService.update(
      'network_queue',
      {
        status:        QueueEntryStatus.FAILED,
        retry_count:   retryCount + 1,
        next_retry_at: Date.now() + backoffMs,
        last_error:    error,
      },
      { eq: { msg_id } }
    );
  }

  /** Set retry fields with a caller-specified next_retry_at (used for nuanced backoff). */
  async markFailedAt(msg_id: string, error: string, newRetryCount: number, nextRetryAt: number): Promise<void> {
    await databaseService.update(
      'network_queue',
      {
        status:        QueueEntryStatus.FAILED,
        retry_count:   newRetryCount,
        next_retry_at: nextRetryAt,
        last_error:    error,
      },
      { eq: { msg_id } }
    );
  }

  /** Purge DEAD_LETTER rows older than the given age in days. */
  async purgeDeadLetter(olderThanDays: number): Promise<void> {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const db = databaseService.getDb();
    await db.run(
      `DELETE FROM network_queue WHERE status = 'DEAD_LETTER' AND timestamp < ?`,
      [cutoff]
    );
  }

  /** On init: reset any PROCESSING rows back to PENDING (crash recovery). */
  async resetProcessing(): Promise<void> {
    await databaseService.update(
      'network_queue',
      { status: QueueEntryStatus.PENDING, next_retry_at: 0 },
      { eq: { status: QueueEntryStatus.PROCESSING } }
    );
  }

  async getPendingCount(type?: NetworkQueueType): Promise<number> {
    return databaseService.count(
      'network_queue',
      {
        eq: {
          ...(type ? { type } : {}),
        },
        in: { status: [QueueEntryStatus.PENDING, QueueEntryStatus.FAILED] },
      }
    );
  }

  async getDeadLetterCount(): Promise<number> {
    return databaseService.count('network_queue', { eq: { status: QueueEntryStatus.DEAD_LETTER } });
  }
}

export const networkQueueDbService = new NetworkQueueDbService();
