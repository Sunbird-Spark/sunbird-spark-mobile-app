import { DatabaseService, databaseService } from './DatabaseService';
import type { DownloadQueueEntry, DownloadState } from '../download_manager/types';

const TABLE = 'download_queue';

export class DownloadDbService {
  constructor(private db: DatabaseService) {}

  async insert(entry: DownloadQueueEntry): Promise<void> {
    await this.db.insert(TABLE, entry as unknown as Record<string, unknown>, 'REPLACE');
  }

  async getByIdentifier(identifier: string): Promise<DownloadQueueEntry | null> {
    const rows = await this.db.select<DownloadQueueEntry>(TABLE, {
      where: { eq: { identifier } },
      limit: 1,
    });
    return rows[0] ?? null;
  }

  async getByState(state: DownloadState): Promise<DownloadQueueEntry[]> {
    return this.db.select<DownloadQueueEntry>(TABLE, {
      where: { eq: { state } },
    });
  }

  async getByParent(parentIdentifier: string): Promise<DownloadQueueEntry[]> {
    return this.db.select<DownloadQueueEntry>(TABLE, {
      where: { eq: { parent_identifier: parentIdentifier } },
    });
  }

  async getNextQueued(limit: number): Promise<DownloadQueueEntry[]> {
    return this.db.select<DownloadQueueEntry>(TABLE, {
      where: { eq: { state: 'QUEUED' } },
      orderBy: [
        { column: 'priority', direction: 'DESC' },
        { column: 'created_at', direction: 'ASC' },
      ],
      limit,
    });
  }

  async update(identifier: string, fields: Partial<DownloadQueueEntry>): Promise<void> {
    const data = { ...fields, updated_at: Date.now() } as Record<string, unknown>;
    await this.db.update(TABLE, data, { eq: { identifier } });
  }

  async delete(identifier: string): Promise<void> {
    await this.db.delete(TABLE, { eq: { identifier } });
  }

  async countActive(): Promise<number> {
    return this.db.count(TABLE, {
      in: {
        state: ['QUEUED', 'DOWNLOADING', 'PAUSED', 'DOWNLOADED', 'IMPORTING', 'RETRY_WAIT'],
      },
    });
  }

  async getAll(): Promise<DownloadQueueEntry[]> {
    return this.db.select<DownloadQueueEntry>(TABLE);
  }

  async cleanupOlderThan(cutoffMs: number): Promise<void> {
    const cutoff = Date.now() - cutoffMs;
    await this.db.delete(TABLE, {
      in: { state: ['COMPLETED', 'FAILED'] },
      lt: { updated_at: cutoff },
    });
  }

  async wasCancelledByUser(identifier: string): Promise<boolean> {
    const rows = await this.db.select<{ cancelled_by_user: number }>(TABLE, {
      columns: ['cancelled_by_user'],
      where: { eq: { identifier, state: 'CANCELLED', cancelled_by_user: 1 } },
      limit: 1,
    });
    return rows.length > 0;
  }
}

export const downloadDbService = new DownloadDbService(databaseService);
