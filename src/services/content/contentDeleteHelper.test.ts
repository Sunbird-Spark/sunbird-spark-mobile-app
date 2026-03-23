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

vi.mock('../db/DatabaseService', () => ({
  databaseService: {
    ensureOpen: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../db/ContentDbService', () => ({
  contentDbService: {
    getByIdentifier: vi.fn(),
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

  it('returns not deleted when content_state is not 2', async () => {
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

  it('soft deletes when ref_count > 1', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_1',
      content_state: 2,
      ref_count: 3,
      size_on_device: 50000,
      path: '/content/do_1',
    } as any);

    const result = await deleteDownloadedContent('do_1');

    expect(result).toEqual({ deleted: true, freedBytes: 50000 });
    expect(contentDbService.decrementRefCount).toHaveBeenCalledWith('do_1');
    expect(contentDbService.update).toHaveBeenCalledWith('do_1', {
      content_state: 1,
      size_on_device: 0,
    });
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
});
