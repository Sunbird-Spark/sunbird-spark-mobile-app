import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentDbService } from './ContentDbService';
import { DatabaseService } from './DatabaseService';
import type { ContentEntry } from '../download_manager/types';

vi.mock('./DatabaseService', () => ({ DatabaseService: vi.fn(), databaseService: {} }));

function makeMockDb() {
  return {
    select: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    getDb: vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ values: [] }),
    }),
  } as unknown as DatabaseService;
}

function makeContent(overrides: Partial<ContentEntry> = {}): ContentEntry {
  return {
    identifier: 'do_456',
    server_data: '',
    local_data: '{"name":"Test Content"}',
    mime_type: 'application/pdf',
    path: 'file:///data/content/do_456/',
    visibility: 'Default',
    server_last_updated_on: null,
    local_last_updated_on: new Date().toISOString(),
    ref_count: 1,
    content_state: 2,
    content_type: 'resource',
    audience: 'Learner',
    size_on_device: 0,
    pragma: '',
    manifest_version: '1.1',
    dialcodes: '',
    child_nodes: '',
    primary_category: 'teacher resource',
    ...overrides,
  };
}

describe('ContentDbService', () => {
  let db: DatabaseService;
  let svc: ContentDbService;

  beforeEach(() => {
    db = makeMockDb();
    svc = new ContentDbService(db);
  });

  // ── upsert ──

  describe('upsert', () => {
    it('calls db.insert with REPLACE on content table', async () => {
      const entry = makeContent();
      await svc.upsert(entry);
      expect(db.insert).toHaveBeenCalledOnce();
      const [table, , conflict] = vi.mocked(db.insert).mock.calls[0];
      expect(table).toBe('content');
      expect(conflict).toBe('REPLACE');
    });
  });

  // ── getByIdentifier ──

  describe('getByIdentifier', () => {
    it('returns entry when found', async () => {
      const entry = makeContent();
      vi.mocked(db.select).mockResolvedValue([entry]);
      const result = await svc.getByIdentifier('do_456');
      expect(result).toEqual(entry);
      expect(db.select).toHaveBeenCalledWith('content', {
        where: { eq: { identifier: 'do_456' } },
        limit: 1,
      });
    });

    it('returns null when not found', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      expect(await svc.getByIdentifier('missing')).toBeNull();
    });
  });

  // ── getByIdentifiers ──

  describe('getByIdentifiers', () => {
    it('returns matching entries', async () => {
      const entries = [makeContent({ identifier: 'do_1' }), makeContent({ identifier: 'do_2' })];
      vi.mocked(db.select).mockResolvedValue(entries);
      const result = await svc.getByIdentifiers(['do_1', 'do_2']);
      expect(result).toHaveLength(2);
      expect(db.select).toHaveBeenCalledWith('content', {
        where: { in: { identifier: ['do_1', 'do_2'] } },
      });
    });

    it('returns empty array for empty input', async () => {
      const result = await svc.getByIdentifiers([]);
      expect(result).toEqual([]);
      expect(db.select).not.toHaveBeenCalled();
    });
  });

  // ── update ──

  describe('update', () => {
    it('calls db.update with correct where clause', async () => {
      await svc.update('do_456', { content_state: 0 });
      expect(db.update).toHaveBeenCalledWith(
        'content',
        { content_state: 0 },
        { eq: { identifier: 'do_456' } }
      );
    });
  });

  // ── decrementRefCount ──

  describe('decrementRefCount', () => {
    it('decrements ref_count by 1', async () => {
      vi.mocked(db.select).mockResolvedValue([makeContent({ ref_count: 3 })]);
      await svc.decrementRefCount('do_456');
      expect(db.update).toHaveBeenCalledWith(
        'content',
        { ref_count: 2 },
        { eq: { identifier: 'do_456' } }
      );
    });

    it('sets content_state to ONLY_SPINE (0) when ref_count reaches 0', async () => {
      vi.mocked(db.select).mockResolvedValue([makeContent({ ref_count: 1 })]);
      await svc.decrementRefCount('do_456');
      expect(db.update).toHaveBeenCalledWith(
        'content',
        { ref_count: 0, content_state: 0 },
        { eq: { identifier: 'do_456' } }
      );
    });

    it('does not go below 0', async () => {
      vi.mocked(db.select).mockResolvedValue([makeContent({ ref_count: 0 })]);
      await svc.decrementRefCount('do_456');
      expect(db.update).toHaveBeenCalledWith(
        'content',
        { ref_count: 0, content_state: 0 },
        { eq: { identifier: 'do_456' } }
      );
    });

    it('does nothing when entry not found', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      await svc.decrementRefCount('missing');
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  // ── updateSizeOnDevice ──

  describe('updateSizeOnDevice', () => {
    it('updates size_on_device', async () => {
      await svc.updateSizeOnDevice('do_456', 123456);
      expect(db.update).toHaveBeenCalledWith(
        'content',
        { size_on_device: 123456 },
        { eq: { identifier: 'do_456' } }
      );
    });
  });

  // ── getDownloadedContent ──

  describe('getDownloadedContent', () => {
    it('queries for content_state = 2 (ARTIFACT_AVAILABLE)', async () => {
      await svc.getDownloadedContent();
      expect(db.select).toHaveBeenCalledWith('content', {
        where: { eq: { content_state: 2, visibility: 'Default' } },
        orderBy: [{ column: 'local_last_updated_on', direction: 'DESC' }],
      });
    });
  });

  // ── delete ──

  describe('delete', () => {
    it('deletes by identifier', async () => {
      await svc.delete('do_456');
      expect(db.delete).toHaveBeenCalledWith('content', { eq: { identifier: 'do_456' } });
    });
  });

  // ── getCollectionsContainingChild ──

  describe('getCollectionsContainingChild', () => {
    it('queries for collections with child_nodes containing the given id', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        values: [makeContent({ identifier: 'do_collection', mime_type: 'application/vnd.ekstep.content-collection', child_nodes: 'do_child1,do_child2' })],
      });
      vi.mocked(db.getDb).mockReturnValue({ query: mockQuery } as any);

      const result = await svc.getCollectionsContainingChild('do_child1');
      expect(result).toHaveLength(1);
      expect(result[0].identifier).toBe('do_collection');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('child_nodes LIKE'),
        ['%do_child1%'],
      );
    });

    it('returns empty array when no collections match', async () => {
      const mockQuery = vi.fn().mockResolvedValue({ values: [] });
      vi.mocked(db.getDb).mockReturnValue({ query: mockQuery } as any);

      const result = await svc.getCollectionsContainingChild('do_nonexistent');
      expect(result).toEqual([]);
    });
  });
});
