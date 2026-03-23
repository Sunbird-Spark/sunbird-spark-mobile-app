import { renderHook, act } from '@testing-library/react';
import { useDownloadQueue } from './useDownloadQueue';
import { downloadManager } from '../services/download_manager';
import type { DownloadListener, DownloadQueueEntry } from '../services/download_manager/types';

vi.mock('../services/download_manager', () => ({
  downloadManager: {
    getQueue: vi.fn(),
    subscribe: vi.fn(),
  },
}));

describe('useDownloadQueue', () => {
  let capturedListener: DownloadListener | null = null;
  const unsubMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    capturedListener = null;
    vi.mocked(downloadManager.subscribe).mockImplementation((listener) => {
      capturedListener = listener;
      return unsubMock;
    });
  });

  it('fetches initial queue on mount', async () => {
    const mockEntries = [{ identifier: 'do_1', state: 'QUEUED' }] as DownloadQueueEntry[];
    vi.mocked(downloadManager.getQueue).mockResolvedValue(mockEntries);

    const { result } = renderHook(() => useDownloadQueue());
    await act(async () => {});

    expect(result.current).toEqual(mockEntries);
  });

  it('refreshes queue on any event', async () => {
    vi.mocked(downloadManager.getQueue)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ identifier: 'do_1', state: 'DOWNLOADING' }] as DownloadQueueEntry[]);

    const { result } = renderHook(() => useDownloadQueue());
    await act(async () => {});
    expect(result.current).toEqual([]);

    await act(async () => {
      capturedListener?.({ type: 'queue_changed' });
    });

    expect(result.current).toHaveLength(1);
  });

  it('unsubscribes on unmount', () => {
    vi.mocked(downloadManager.getQueue).mockResolvedValue([]);
    const { unmount } = renderHook(() => useDownloadQueue());
    unmount();
    expect(unsubMock).toHaveBeenCalled();
  });
});
