import { DatabaseService, databaseService } from './DatabaseService';
import type { ContentEntry } from '../download_manager/types';

const TABLE = 'content';

export class ContentDbService {
  constructor(private db: DatabaseService) {}

  async upsert(entry: ContentEntry): Promise<void> {
    await this.db.insert(TABLE, entry as unknown as Record<string, unknown>, 'REPLACE');
  }

  async getByIdentifier(identifier: string): Promise<ContentEntry | null> {
    const rows = await this.db.select<ContentEntry>(TABLE, {
      where: { eq: { identifier } },
      limit: 1,
    });
    return rows[0] ?? null;
  }

  async getByIdentifiers(identifiers: string[]): Promise<ContentEntry[]> {
    if (identifiers.length === 0) return [];
    return this.db.select<ContentEntry>(TABLE, {
      where: { in: { identifier: identifiers } },
    });
  }

  async update(identifier: string, fields: Partial<ContentEntry>): Promise<void> {
    await this.db.update(TABLE, fields as Record<string, unknown>, { eq: { identifier } });
  }

  async decrementRefCount(identifier: string): Promise<void> {
    const entry = await this.getByIdentifier(identifier);
    if (!entry) return;
    const newRef = Math.max(0, entry.ref_count - 1);
    const updates: Partial<ContentEntry> = { ref_count: newRef };
    if (newRef === 0) {
      updates.content_state = 0; // ONLY_SPINE
    }
    await this.update(identifier, updates);
  }

  async updateSizeOnDevice(identifier: string, size: number): Promise<void> {
    await this.update(identifier, { size_on_device: size });
  }

  async getDownloadedContent(): Promise<ContentEntry[]> {
    return this.db.select<ContentEntry>(TABLE, {
      where: { eq: { content_state: 2 } },
    });
  }

  async delete(identifier: string): Promise<void> {
    await this.db.delete(TABLE, { eq: { identifier } });
  }
}

export const contentDbService = new ContentDbService(databaseService);
