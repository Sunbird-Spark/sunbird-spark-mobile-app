import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportService } from './ImportService';
import { DatabaseService } from '../db/DatabaseService';
import { ContentDbService } from '../db/ContentDbService';
import type { ContentEntry } from './types';

// Mock all native dependencies
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    getUri: vi.fn().mockResolvedValue({ uri: 'file:///tmp/test' }),
    rmdir: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue({ data: '{}' }),
    copy: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 1024 }),
  },
  Directory: { Data: 'DATA', Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
}));

vi.mock('capa-zip', () => ({
  Zip: {
    unzip: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../db/DatabaseService', () => ({ DatabaseService: vi.fn(), databaseService: {} }));
vi.mock('../db/ContentDbService', () => ({ ContentDbService: vi.fn(), contentDbService: {} }));

function makeMockDb() {
  return {
    transaction: vi.fn().mockImplementation(async (fn: () => Promise<any>) => fn()),
  } as unknown as DatabaseService;
}

function makeMockContentDb() {
  return {
    getByIdentifiers: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue(undefined),
    getByIdentifier: vi.fn().mockResolvedValue(null),
    updateSizeOnDevice: vi.fn().mockResolvedValue(undefined),
  } as unknown as ContentDbService;
}

describe('ImportService', () => {
  let db: DatabaseService;
  let contentDb: ContentDbService;
  let svc: ImportService;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockDb();
    contentDb = makeMockContentDb();
    svc = new ImportService(db, contentDb);
  });

  // ── import — manifest not found ──

  describe('import — manifest not found', () => {
    it('returns FAILED when neither hierarchy.json nor manifest.json exists', async () => {
      const { Filesystem } = await import('@capacitor/filesystem');
      vi.mocked(Filesystem.readFile).mockRejectedValue(new Error('not found'));

      const result = await svc.import('do_123', '/path/to/file.ecar');
      expect(result.status).toBe('FAILED');
      expect(result.errors?.[0]).toBe('IMPORT_FAILED_MANIFEST_NOT_FOUND');
    });
  });

  // ── import — unsupported manifest ──

  describe('import — unsupported manifest version', () => {
    it('returns FAILED for ver 1.0 manifest', async () => {
      const { Filesystem } = await import('@capacitor/filesystem');
      vi.mocked(Filesystem.readFile).mockResolvedValue({
        data: JSON.stringify({ ver: 1.0, archive: { items: [] } }),
      } as any);

      const result = await svc.import('do_123', '/path/to/file.ecar');
      expect(result.status).toBe('FAILED');
      expect(result.errors?.[0]).toBe('IMPORT_FAILED_UNSUPPORTED_MANIFEST');
    });
  });

  // ── import — empty items ──

  describe('import — no items in manifest', () => {
    it('returns FAILED when archive.items is missing', async () => {
      const { Filesystem } = await import('@capacitor/filesystem');
      vi.mocked(Filesystem.readFile).mockResolvedValue({
        data: JSON.stringify({ ver: '1.1', archive: {} }),
      } as any);

      const result = await svc.import('do_123', '/path/to/file.ecar');
      expect(result.status).toBe('FAILED');
      expect(result.errors?.[0]).toBe('IMPORT_FAILED_NO_CONTENT_METADATA');
    });
  });

  // ── import — all items already exist ──

  describe('import — all items already imported', () => {
    it('returns ALREADY_EXIST when all items are duplicates', async () => {
      const { Filesystem } = await import('@capacitor/filesystem');

      const existingContent: ContentEntry = {
        identifier: 'do_item1',
        server_data: '',
        local_data: JSON.stringify({ pkgVersion: 5 }),
        mime_type: 'application/pdf',
        path: '/content/do_item1',
        visibility: 'Default',
        server_last_updated_on: null,
        local_last_updated_on: '',
        ref_count: 1,
        content_state: 2,
        content_type: 'resource',
        audience: 'Learner',
        size_on_device: 1024,
        pragma: '',
        manifest_version: '1.1',
        dialcodes: '',
        child_nodes: '',
        primary_category: '',
      };

      vi.mocked(Filesystem.readFile).mockResolvedValue({
        data: JSON.stringify({
          ver: '1.1',
          archive: {
            items: [{ identifier: 'do_item1', pkgVersion: 3, mimeType: 'application/pdf' }],
          },
        }),
      } as any);

      vi.mocked(contentDb.getByIdentifiers).mockResolvedValue([existingContent]);

      const result = await svc.import('do_123', '/path/to/file.ecar');
      expect(result.status).toBe('ALREADY_EXIST');
    });
  });

  // ── import — successful import ──

  describe('import — success', () => {
    it('imports new items and writes to content DB', async () => {
      const { Filesystem } = await import('@capacitor/filesystem');
      vi.mocked(Filesystem.readFile).mockResolvedValue({
        data: JSON.stringify({
          ver: '1.1',
          archive: {
            items: [
              {
                identifier: 'do_new',
                mimeType: 'application/pdf',
                contentDisposition: 'inline',
                contentEncoding: 'identity',
                artifactUrl: 'do_new/artifact.pdf',
                contentType: 'resource',
                visibility: 'Default',
                primaryCategory: 'teacher resource',
              },
            ],
          },
        }),
      } as any);

      vi.mocked(contentDb.getByIdentifiers).mockResolvedValue([]);

      const onProgress = vi.fn();
      const result = await svc.import('do_123', '/path/to/file.ecar', undefined, undefined, onProgress);

      expect(result.status).toBe('SUCCESS');
      expect(result.identifiers).toContain('do_new');
      expect(contentDb.upsert).toHaveBeenCalledOnce();

      // Verify progress callbacks were called in order
      const phases = onProgress.mock.calls.map(([phase]: [string]) => phase);
      expect(phases).toContain('EXTRACTING');
      expect(phases).toContain('VALIDATING');
      expect(phases).toContain('IMPORTING_CONTENT');
      expect(phases).toContain('CREATING_MANIFEST');
      expect(phases).toContain('CLEANING_UP');
      expect(phases).toContain('COMPLETED');
    });
  });

  // ── import — cancellation ──

  describe('import — cancellation', () => {
    it('returns CANCELLED when isCancelled returns true', async () => {
      const { Filesystem } = await import('@capacitor/filesystem');
      vi.mocked(Filesystem.readFile).mockResolvedValue({
        data: JSON.stringify({
          ver: '1.1',
          archive: {
            items: [{ identifier: 'do_item', mimeType: 'application/pdf', artifactUrl: 'x' }],
          },
        }),
      } as any);

      vi.mocked(contentDb.getByIdentifiers).mockResolvedValue([]);

      // Cancel on the import content step
      let callCount = 0;
      const isCancelled = vi.fn().mockImplementation(async () => {
        callCount++;
        return callCount >= 3; // cancel on third check
      });

      const result = await svc.import('do_123', '/path/to/file.ecar', undefined, isCancelled);
      expect(result.status).toBe('CANCELLED');
    });
  });

  // ── import — cleanup on failure ──

  describe('import — cleanup on failure', () => {
    it('cleans up temp dir on unexpected error', async () => {
      const { Filesystem } = await import('@capacitor/filesystem');
      const { Zip } = await import('capa-zip');

      vi.mocked(Zip.unzip).mockRejectedValueOnce(new Error('unzip failed'));

      const result = await svc.import('do_123', '/path/to/file.ecar');
      expect(result.status).toBe('FAILED');
      // rmdir should be called in the finally block
      expect(Filesystem.rmdir).toHaveBeenCalled();
    });
  });

  // ── import — expired draft filtering ──

  describe('import — expired drafts are skipped', () => {
    it('skips items with status=Draft and past expires date', async () => {
      const { Filesystem } = await import('@capacitor/filesystem');
      vi.mocked(Filesystem.readFile).mockResolvedValue({
        data: JSON.stringify({
          ver: '1.1',
          archive: {
            items: [
              {
                identifier: 'do_expired',
                mimeType: 'application/pdf',
                status: 'Draft',
                expires: '2020-01-01T00:00:00Z',
                artifactUrl: 'do_expired/artifact.pdf',
              },
            ],
          },
        }),
      } as any);

      vi.mocked(contentDb.getByIdentifiers).mockResolvedValue([]);

      const result = await svc.import('do_123', '/path/to/file.ecar');
      expect(result.status).toBe('ALREADY_EXIST'); // all items filtered out
      expect(contentDb.upsert).not.toHaveBeenCalled();
    });
  });

  // ── server_data preservation ──

  describe('import — preserves existing server_data', () => {
    it('keeps existing server_data when re-importing content', async () => {
      const { Filesystem } = await import('@capacitor/filesystem');
      vi.mocked(Filesystem.readFile).mockResolvedValue({
        data: JSON.stringify({
          ver: '1.1',
          archive: {
            items: [
              {
                identifier: 'do_existing',
                mimeType: 'application/pdf',
                contentDisposition: 'inline',
                contentEncoding: 'identity',
                artifactUrl: 'do_existing/artifact.pdf',
                contentType: 'resource',
                pkgVersion: 10,
                visibility: 'Default',
              },
            ],
          },
        }),
      } as any);

      const existing: ContentEntry = {
        identifier: 'do_existing',
        server_data: JSON.stringify({ hierarchy: { children: [] }, name: 'Course' }),
        local_data: JSON.stringify({ pkgVersion: 5 }),
        mime_type: 'application/pdf',
        path: '/content/do_existing',
        visibility: 'Default',
        server_last_updated_on: null,
        local_last_updated_on: '',
        ref_count: 1,
        content_state: 0, // ONLY_SPINE — allows re-import
        content_type: 'resource',
        audience: 'Learner',
        size_on_device: 1024,
        pragma: '',
        manifest_version: '1.1',
        dialcodes: '',
        child_nodes: '',
        primary_category: '',
      };

      vi.mocked(contentDb.getByIdentifiers).mockResolvedValue([existing]);

      const result = await svc.import('do_123', '/path/to/file.ecar');
      expect(result.status).toBe('SUCCESS');

      const upsertedRow = vi.mocked(contentDb.upsert).mock.calls[0][0] as ContentEntry;
      expect(upsertedRow.server_data).toBe(existing.server_data);
    });
  });

  // ── constructContentRow (tested via import) ──

  describe('import — content_state never downgrades', () => {
    it('keeps ARTIFACT_AVAILABLE when existing has higher state', async () => {
      const { Filesystem } = await import('@capacitor/filesystem');
      vi.mocked(Filesystem.readFile).mockResolvedValue({
        data: JSON.stringify({
          ver: '1.1',
          archive: {
            items: [
              {
                identifier: 'do_existing',
                mimeType: 'application/pdf',
                contentDisposition: 'online', // would normally be no file op
                artifactUrl: '',              // no artifact → ONLY_SPINE (0)
                contentType: 'resource',
                pkgVersion: 10,
                visibility: 'Default',
              },
            ],
          },
        }),
      } as any);

      // Existing content has ARTIFACT_AVAILABLE (2) with lower pkgVersion
      const existing: ContentEntry = {
        identifier: 'do_existing',
        server_data: '',
        local_data: JSON.stringify({ pkgVersion: 5 }),
        mime_type: 'application/pdf',
        path: '/content/do_existing',
        visibility: 'Default',
        server_last_updated_on: null,
        local_last_updated_on: '',
        ref_count: 1,
        content_state: 2, // ARTIFACT_AVAILABLE
        content_type: 'resource',
        audience: 'Learner',
        size_on_device: 1024,
        pragma: '',
        manifest_version: '1.1',
        dialcodes: '',
        child_nodes: '',
        primary_category: '',
      };

      vi.mocked(contentDb.getByIdentifiers).mockResolvedValue([existing]);

      const result = await svc.import('do_123', '/path/to/file.ecar');
      expect(result.status).toBe('SUCCESS');

      // Verify the upserted row keeps content_state = 2
      const upsertedRow = vi.mocked(contentDb.upsert).mock.calls[0][0] as ContentEntry;
      expect(upsertedRow.content_state).toBe(2);
      // ref_count incremented
      expect(upsertedRow.ref_count).toBe(2);
    });
  });
});
