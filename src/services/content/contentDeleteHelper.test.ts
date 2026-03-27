import { deleteDownloadedContent } from './contentDeleteHelper';
import { Filesystem } from '@capacitor/filesystem';
import { contentDbService } from '../db/ContentDbService';
import { downloadDbService } from '../db/DownloadDbService';
import { downloadManager } from '../download_manager';

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    rmdir: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../db/ContentDbService', () => ({
  contentDbService: {
    getByIdentifier: vi.fn(),
    getByIdentifiers: vi.fn().mockResolvedValue([]),
    getCollectionsContainingChild: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    decrementRefCount: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../db/DownloadDbService', () => ({
  downloadDbService: {
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../download_manager', () => ({
  downloadManager: {
    getEntry: vi.fn().mockResolvedValue(null),
    cancel: vi.fn().mockResolvedValue(undefined),
    notifyContentDeleted: vi.fn(),
  },
}));

describe('deleteDownloadedContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns not deleted when content not found', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue(null);
    const result = await deleteDownloadedContent('do_missing');
    expect(result).toEqual({ deleted: false, freedBytes: 0 });
  });

  it('returns deleted when content_state is lesser than 2', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_1',
      content_state: 1,
      ref_count: 1,
    } as any);
    const result = await deleteDownloadedContent('do_1');
    expect(result).toEqual({ deleted: true, freedBytes: 0 });
  });

  it('hard deletes when ref_count is 1', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_1',
      content_state: 2,
      ref_count: 1,
      size_on_device: 5000,
      path: '/content/do_1',
    } as any);

    const result = await deleteDownloadedContent('do_1');

    expect(result).toEqual({ deleted: true, freedBytes: 5000 });
    expect(Filesystem.rmdir).toHaveBeenCalledWith({ path: '/content/do_1', recursive: true });
    expect(contentDbService.delete).toHaveBeenCalledWith('do_1');
    expect(contentDbService.decrementRefCount).not.toHaveBeenCalled();
    expect(downloadDbService.delete).toHaveBeenCalledWith('do_1');
  });

  it('hard deletes when ref_count is 0', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_1',
      content_state: 2,
      ref_count: 0,
      size_on_device: 1000,
      path: '/content/do_1',
    } as any);

    const result = await deleteDownloadedContent('do_1');
    expect(result.deleted).toBe(true);
    expect(contentDbService.delete).toHaveBeenCalledWith('do_1');
  });

  it('soft deletes when ref_count > 1 — keeps artifacts, sets visibility=Parent', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_1',
      content_state: 2,
      ref_count: 3,
      size_on_device: 50000,
      path: '/content/do_1',
    } as any);

    const result = await deleteDownloadedContent('do_1');

    expect(result).toEqual({ deleted: true, freedBytes: 0 });
    expect(contentDbService.decrementRefCount).toHaveBeenCalledWith('do_1');
    // Visibility set to Parent so it's hidden from standalone Downloads list
    expect(contentDbService.update).toHaveBeenCalledWith('do_1', {
      visibility: 'Parent',
    });
    // Artifacts kept on disk for collection offline playback
    expect(Filesystem.rmdir).not.toHaveBeenCalled();
    // DB row preserved (not hard-deleted)
    expect(contentDbService.delete).not.toHaveBeenCalled();
  });

  it('cancels active download before deleting', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_1',
      content_state: 2,
      ref_count: 1,
      size_on_device: 1000,
      path: '/content/do_1',
    } as any);
    vi.mocked(downloadManager.getEntry).mockResolvedValue({
      identifier: 'do_1',
      state: 'DOWNLOADING',
    } as any);

    await deleteDownloadedContent('do_1');
    expect(downloadManager.cancel).toHaveBeenCalledWith('do_1');
  });

  it('does not cancel already completed downloads', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_1',
      content_state: 2,
      ref_count: 1,
      size_on_device: 1000,
      path: '/content/do_1',
    } as any);
    vi.mocked(downloadManager.getEntry).mockResolvedValue({
      identifier: 'do_1',
      state: 'COMPLETED',
    } as any);

    await deleteDownloadedContent('do_1');
    expect(downloadManager.cancel).not.toHaveBeenCalled();
  });

  // ── Collection deletion ──

  it('decrements children ref_counts when deleting a collection', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_collection',
      content_state: 2,
      ref_count: 1,
      size_on_device: 3400,
      path: '/content/do_collection',
      mime_type: 'application/vnd.ekstep.content-collection',
      child_nodes: 'do_child1,do_child2',
    } as any);

    vi.mocked(contentDbService.getByIdentifiers).mockResolvedValue([
      { identifier: 'do_child1', ref_count: 1, path: '/content/do_child1' } as any,
      { identifier: 'do_child2', ref_count: 2, path: '/content/do_child2' } as any,
    ]);

    await deleteDownloadedContent('do_collection');

    // Collection itself hard-deleted
    expect(contentDbService.delete).toHaveBeenCalledWith('do_collection');
    // Child1 (ref_count=1) → hard delete
    expect(contentDbService.delete).toHaveBeenCalledWith('do_child1');
    expect(Filesystem.rmdir).toHaveBeenCalledWith({ path: '/content/do_child1', recursive: true });
    // Child2 (ref_count=2) → decrement only
    expect(contentDbService.decrementRefCount).toHaveBeenCalledWith('do_child2');
    expect(contentDbService.delete).not.toHaveBeenCalledWith('do_child2');
  });

  // ── Orphaned collection cleanup ──

  it('removes orphaned collection when last child is hard-deleted', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_leaf',
      content_state: 2,
      ref_count: 1,
      size_on_device: 5000,
      path: '/content/do_leaf',
    } as any);

    // After hard-delete, find parent collection referencing this child
    vi.mocked(contentDbService.getCollectionsContainingChild).mockResolvedValue([
      {
        identifier: 'do_collection',
        child_nodes: 'do_leaf,do_other',
        path: '/content/do_collection',
        content_state: 2,
      } as any,
    ]);

    // do_other is also gone (no remaining downloaded children)
    vi.mocked(contentDbService.getByIdentifiers).mockResolvedValue([]);

    await deleteDownloadedContent('do_leaf');

    // Orphaned collection should be cleaned up
    expect(contentDbService.delete).toHaveBeenCalledWith('do_collection');
    expect(downloadManager.notifyContentDeleted).toHaveBeenCalledWith('do_collection');
  });

  it('does not remove collection when it still has downloaded children', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_leaf',
      content_state: 2,
      ref_count: 1,
      size_on_device: 5000,
      path: '/content/do_leaf',
    } as any);

    vi.mocked(contentDbService.getCollectionsContainingChild).mockResolvedValue([
      {
        identifier: 'do_collection',
        child_nodes: 'do_leaf,do_other',
        path: '/content/do_collection',
        content_state: 2,
      } as any,
    ]);

    // do_other still exists and is downloaded
    vi.mocked(contentDbService.getByIdentifiers).mockResolvedValue([
      { identifier: 'do_other', content_state: 2 } as any,
    ]);

    await deleteDownloadedContent('do_leaf');

    // Collection should NOT be cleaned up
    expect(contentDbService.delete).not.toHaveBeenCalledWith('do_collection');
  });
});
