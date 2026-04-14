import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentDbService } from './ContentDbService';
import type { DatabaseService } from './DatabaseService';

describe('ContentDbService', () => {
  let db: DatabaseService;
  let service: ContentDbService;

  beforeEach(() => {
    db = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getDb: vi.fn().mockReturnValue({
        query: vi.fn().mockResolvedValue({ values: [] }),
      }),
    } as any;
    service = new ContentDbService(db);
  });

  it('upserts a content entry', async () => {
    const entry = { identifier: 'do_123', mime_type: 'application/pdf' };
    await service.upsert(entry as any);
    expect(db.insert).toHaveBeenCalledWith('content', entry, 'REPLACE');
  });

  it('gets by identifier', async () => {
    vi.mocked(db.select).mockResolvedValue([{ identifier: 'do_123' }]);
    const result = await service.getByIdentifier('do_123');
    expect(result?.identifier).toBe('do_123');
  });

  it('returns null if not found', async () => {
    vi.mocked(db.select).mockResolvedValue([]);
    const result = await service.getByIdentifier('do_missing');
    expect(result).toBeNull();
  });

  it('gets by identifiers', async () => {
    vi.mocked(db.select).mockResolvedValue([{ identifier: 'do_1' }, { identifier: 'do_2' }]);
    const result = await service.getByIdentifiers(['do_1', 'do_2']);
    expect(result.length).toBe(2);
    expect(db.select).toHaveBeenCalled();
  });

  it('returns empty array if identifiers list is empty', async () => {
    const result = await service.getByIdentifiers([]);
    expect(result).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });

  it('updates an entry', async () => {
    await service.update('do_123', { mime_type: 'video/mp4' });
    expect(db.update).toHaveBeenCalledWith('content', { mime_type: 'video/mp4' }, { eq: { identifier: 'do_123' } });
  });

  it('decrements ref count and sets state to 0 when it hits 0', async () => {
    vi.mocked(db.select).mockResolvedValue([{ identifier: 'do_123', ref_count: 1 }]);
    await service.decrementRefCount('do_123');
    expect(db.update).toHaveBeenCalledWith('content', { ref_count: 0, content_state: 0 }, expect.anything());
  });

  it('decrements ref count and preserves state when > 0', async () => {
    vi.mocked(db.select).mockResolvedValue([{ identifier: 'do_123', ref_count: 5 }]);
    await service.decrementRefCount('do_123');
    expect(db.update).toHaveBeenCalledWith('content', { ref_count: 4 }, expect.anything());
  });

  it('returns early in decrement if entry not found', async () => {
    vi.mocked(db.select).mockResolvedValue([]);
    await service.decrementRefCount('do_missing');
    expect(db.update).not.toHaveBeenCalled();
  });

  it('updates size on device', async () => {
    await service.updateSizeOnDevice('do_123', 500);
    expect(db.update).toHaveBeenCalledWith('content', { size_on_device: 500 }, expect.anything());
  });

  it('gets downloaded content', async () => {
    await service.getDownloadedContent();
    expect(db.select).toHaveBeenCalledWith('content', expect.objectContaining({
      where: { eq: { content_state: 2, visibility: 'Default' } }
    }));
  });

  it('deletes an entry', async () => {
    await service.delete('do_123');
    expect(db.delete).toHaveBeenCalledWith('content', { eq: { identifier: 'do_123' } });
  });

  it('finds collections containing child (handles null values)', async () => {
    const mockDb = db.getDb();
    vi.mocked(mockDb.query).mockResolvedValue({ values: null } as any);
    const result = await service.getCollectionsContainingChild('child_1');
    expect(result).toEqual([]);
  });
});
