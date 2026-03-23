import { startContentDownload } from './contentDownloadHelper';
import { downloadManager } from '../download_manager';
import { contentDbService } from '../db/ContentDbService';

vi.mock('../download_manager', () => ({
  downloadManager: {
    enqueue: vi.fn(),
    getEntry: vi.fn(),
  },
}));

vi.mock('../db/ContentDbService', () => ({
  contentDbService: {
    getByIdentifier: vi.fn(),
  },
}));

vi.mock('../db/DatabaseService', () => ({
  databaseService: {
    ensureOpen: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('startContentDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns not_available when downloadUrl is missing', async () => {
    const result = await startContentDownload({ identifier: 'do_1' });
    expect(result).toBe('not_available');
    expect(downloadManager.enqueue).not.toHaveBeenCalled();
  });

  it('returns already_downloaded when content_state is 2', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_1',
      content_state: 2,
    } as any);

    const result = await startContentDownload({
      identifier: 'do_1',
      downloadUrl: 'https://cdn.example.com/test.ecar',
    });
    expect(result).toBe('already_downloaded');
    expect(downloadManager.enqueue).not.toHaveBeenCalled();
  });

  it('returns in_progress when already in active queue', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue(null);
    vi.mocked(downloadManager.getEntry).mockResolvedValue({
      identifier: 'do_1',
      state: 'DOWNLOADING',
    } as any);

    const result = await startContentDownload({
      identifier: 'do_1',
      downloadUrl: 'https://cdn.example.com/test.ecar',
    });
    expect(result).toBe('in_progress');
    expect(downloadManager.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues and returns started for valid content', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue(null);
    vi.mocked(downloadManager.getEntry).mockResolvedValue(null);
    vi.mocked(downloadManager.enqueue).mockResolvedValue(undefined);

    const result = await startContentDownload(
      {
        identifier: 'do_1',
        downloadUrl: 'https://cdn.example.com/test.ecar',
        mimeType: 'video/mp4',
        pkgVersion: 3,
      },
      { priority: 10 },
    );

    expect(result).toBe('started');
    expect(downloadManager.enqueue).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: 'do_1',
        downloadUrl: 'https://cdn.example.com/test.ecar',
        filename: 'do_1_3.ecar',
        mimeType: 'video/mp4',
        priority: 10,
      }),
    ]);
  });

  it('uses default pkgVersion 1 when not provided', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue(null);
    vi.mocked(downloadManager.getEntry).mockResolvedValue(null);
    vi.mocked(downloadManager.enqueue).mockResolvedValue(undefined);

    await startContentDownload({
      identifier: 'do_2',
      downloadUrl: 'https://cdn.example.com/test.ecar',
    });

    expect(downloadManager.enqueue).toHaveBeenCalledWith([
      expect.objectContaining({ filename: 'do_2_1.ecar' }),
    ]);
  });

  it('allows re-enqueue when previous entry is FAILED', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue(null);
    vi.mocked(downloadManager.getEntry).mockResolvedValue({
      identifier: 'do_1',
      state: 'FAILED',
    } as any);
    vi.mocked(downloadManager.enqueue).mockResolvedValue(undefined);

    const result = await startContentDownload({
      identifier: 'do_1',
      downloadUrl: 'https://cdn.example.com/test.ecar',
    });
    expect(result).toBe('started');
  });
});
