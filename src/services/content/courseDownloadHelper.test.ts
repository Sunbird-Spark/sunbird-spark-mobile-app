import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startBulkDownload } from './courseDownloadHelper';
import { downloadManager } from '../download_manager';
import { contentDbService } from '../db/ContentDbService';
import { databaseService } from '../db/DatabaseService';
import { downloadSpineEcar } from './spineDownloadHelper';
import type { HierarchyContentNode } from '../../types/collectionTypes';

vi.mock('../download_manager', () => ({
  downloadManager: {
    enqueue: vi.fn(),
  },
}));

vi.mock('../db/ContentDbService', () => ({
  contentDbService: {
    getByIdentifier: vi.fn(),
    getByIdentifiers: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../db/DatabaseService', () => ({
  databaseService: {
    initialize: vi.fn(),
  },
}));

vi.mock('./spineDownloadHelper', () => ({
  downloadSpineEcar: vi.fn().mockResolvedValue('skipped'),
}));

const COLLECTION_MIME = 'application/vnd.ekstep.content-collection';

function makeLeaf(id: string, overrides?: Partial<HierarchyContentNode>): HierarchyContentNode {
  return {
    identifier: id,
    name: `Leaf ${id}`,
    mimeType: 'application/pdf',
    downloadUrl: `https://cdn.example.com/${id}.ecar`,
    size: 1000,
    pkgVersion: 1,
    ...overrides,
  };
}

function makeUnit(id: string, children: HierarchyContentNode[]): HierarchyContentNode {
  return {
    identifier: id,
    name: `Unit ${id}`,
    mimeType: COLLECTION_MIME,
    children,
  };
}

describe('startBulkDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(databaseService.initialize).mockResolvedValue(undefined);
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue(null);
    vi.mocked(contentDbService.getByIdentifiers).mockResolvedValue([]);
    vi.mocked(downloadManager.enqueue).mockResolvedValue(undefined);
  });

  it('enqueues downloadable leaf nodes', async () => {
    const nodes = [makeUnit('u1', [makeLeaf('a'), makeLeaf('b')])];
    const result = await startBulkDownload('course1', nodes);

    expect(result.enqueued).toBe(2);
    expect(result.skippedLocal).toBe(0);
    expect(result.spineStatus).toBe('skipped');
    expect(downloadManager.enqueue).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ identifier: 'a', parentIdentifier: 'course1' }),
        expect.objectContaining({ identifier: 'b', parentIdentifier: 'course1' }),
      ]),
    );
  });

  it('skips already downloaded content', async () => {
    vi.mocked(contentDbService.getByIdentifiers).mockImplementation(async (ids) => {
      if (ids.includes('a')) return [{ identifier: 'a', content_state: 2 }] as any;
      return [];
    });

    const nodes = [makeUnit('u1', [makeLeaf('a'), makeLeaf('b')])];
    const result = await startBulkDownload('course1', nodes);

    expect(result.enqueued).toBe(1);
    expect(result.skippedLocal).toBe(1);
  });

  it('skips non-downloadable content (no downloadUrl)', async () => {
    const nodes = [makeUnit('u1', [makeLeaf('a'), makeLeaf('b', { downloadUrl: undefined })])];
    const result = await startBulkDownload('course1', nodes);

    expect(result.enqueued).toBe(1);
    expect(result.skippedNotDownloadable).toBe(1);
  });

  it('skips streaming-only content', async () => {
    const nodes = [makeUnit('u1', [makeLeaf('a', { mimeType: 'video/x-youtube' })])];
    const result = await startBulkDownload('course1', nodes);

    expect(result.enqueued).toBe(0);
    expect(result.skippedNotDownloadable).toBe(1);
  });

  it('does not call enqueue when nothing to download', async () => {
    vi.mocked(contentDbService.getByIdentifiers).mockResolvedValue([{
      identifier: 'a',
      content_state: 2,
    } as any]);

    const nodes = [makeUnit('u1', [makeLeaf('a')])];
    const result = await startBulkDownload('course1', nodes);

    expect(result.enqueued).toBe(0);
    expect(downloadManager.enqueue).not.toHaveBeenCalled();
  });

  it('delegates queue deduplication to DownloadManager', async () => {
    // Even if items are already queued, we still pass them to enqueue().
    // DownloadManager handles deduplication internally.
    const nodes = [makeUnit('u1', [makeLeaf('a'), makeLeaf('b')])];
    const result = await startBulkDownload('course1', nodes);

    expect(result.enqueued).toBe(2);
    expect(downloadManager.enqueue).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ identifier: 'a' }),
        expect.objectContaining({ identifier: 'b' }),
      ]),
    );
  });

  it('triggers spine download when spineDownloadUrl is provided', async () => {
    vi.mocked(downloadSpineEcar).mockResolvedValue('started');
    // Mock successful spine import so the sequential loop finishes
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'course1',
      content_state: 2,
    } as any);

    const nodes = [makeUnit('u1', [makeLeaf('a')])];
    const result = await startBulkDownload('course1', nodes, {
      spineDownloadUrl: 'https://cdn.example.com/course1_spine.ecar',
      pkgVersion: 2,
    });

    expect(downloadSpineEcar).toHaveBeenCalledWith(
      'course1',
      'https://cdn.example.com/course1_spine.ecar',
      2,
    );
    expect(result.spineStatus).toBe('started');
    expect(result.enqueued).toBe(1);
  });

  it('skips spine download when no spineDownloadUrl', async () => {
    const nodes = [makeUnit('u1', [makeLeaf('a')])];
    const result = await startBulkDownload('course1', nodes);

    expect(downloadSpineEcar).not.toHaveBeenCalled();
    expect(result.spineStatus).toBe('skipped');
  });
});
