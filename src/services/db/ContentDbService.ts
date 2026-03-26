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
      where: { eq: { content_state: 2, visibility: 'Default' } },
      orderBy: [{ column: 'local_last_updated_on', direction: 'DESC' }],
    });
  }

  async delete(identifier: string): Promise<void> {
    await this.db.delete(TABLE, { eq: { identifier } });
  }

  /**
   * Find collection entries whose child_nodes list contains the given identifier.
   * Used for cleanup: when a leaf is deleted, check if its parent collection
   * should be removed from the Downloads list.
   */
  async getCollectionsContainingChild(childIdentifier: string): Promise<ContentEntry[]> {
    const db = this.db.getDb();
    // Escape SQL LIKE wildcards in the identifier so that e.g. `do_123` doesn't
    // accidentally match `do_1234` or `do%xyz` (both `_` and `%` are LIKE wildcards).
    // Wrapping child_nodes with leading/trailing commas ensures we match whole tokens
    // only (`,do_123,` won't match `,do_1234,`).
    const escaped = childIdentifier
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
    const result = await db.query(
      `SELECT * FROM ${TABLE} WHERE mime_type LIKE '%collection%' AND (',' || child_nodes || ',') LIKE ? ESCAPE '\\'`,
      [`%,${escaped},%`],
    );
    return (result.values ?? []) as ContentEntry[];
  }
}

export const contentDbService = new ContentDbService(databaseService);
