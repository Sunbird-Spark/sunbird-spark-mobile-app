import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadSpineEcar } from './spineDownloadHelper';
import { downloadManager } from '../download_manager';
import { contentDbService } from '../db/ContentDbService';
import { databaseService } from '../db/DatabaseService';

vi.mock('../download_manager', () => ({
  downloadManager: {
    enqueue: vi.fn(),
  },
}));

vi.mock('../db/ContentDbService', () => ({
  contentDbService: {
    getByIdentifier: vi.fn(),
  },
}));

vi.mock('../db/DatabaseService', () => ({
  databaseService: {
    initialize: vi.fn(),
  },
}));

describe('downloadSpineEcar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(databaseService.initialize).mockResolvedValue(undefined);
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue(null);
    vi.mocked(downloadManager.enqueue).mockResolvedValue(undefined);
  });

  it('returns no_download_url when downloadUrl is missing', async () => {
    const result = await downloadSpineEcar('course1', undefined);
    expect(result).toBe('no_download_url');
    expect(downloadManager.enqueue).not.toHaveBeenCalled();
  });

  it('returns already_imported when course root exists with content_state >= 1', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'course1',
      content_state: 1,
    } as any);

    const result = await downloadSpineEcar('course1', 'https://cdn.example.com/spine.ecar');
    expect(result).toBe('already_imported');
    expect(downloadManager.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues spine download with priority=1', async () => {
    const result = await downloadSpineEcar('course1', 'https://cdn.example.com/spine.ecar', 3);

    expect(result).toBe('started');
    expect(downloadManager.enqueue).toHaveBeenCalledWith([
      expect.objectContaining({
        identifier: 'course1',
        downloadUrl: 'https://cdn.example.com/spine.ecar',
        filename: 'course1_3_spine.ecar',
        priority: 1,
        contentMeta: expect.objectContaining({ isSpine: true }),
      }),
    ]);
  });

  it('delegates queue deduplication to DownloadManager (enqueues even if already queued)', async () => {
    // DownloadManager.enqueue() handles deduplication internally —
    // it skips items already in non-terminal states.
    // spineDownloadHelper just calls enqueue and lets DM decide.
    const result = await downloadSpineEcar('course1', 'https://cdn.example.com/spine.ecar');
    expect(result).toBe('started');
    expect(downloadManager.enqueue).toHaveBeenCalled();
  });
});
