import { renderHook, act } from '@testing-library/react';
import { useBatchDownloadStates } from './useBatchDownloadStates';
import { downloadManager } from '../services/download_manager';
import type { DownloadListener } from '../services/download_manager/types';

vi.mock('../services/download_manager', () => ({
  downloadManager: {
    getProgress: vi.fn(),
    subscribe: vi.fn(),
  },
}));

describe('useBatchDownloadStates', () => {
  let capturedListener: DownloadListener | null = null;
  const unsubMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    capturedListener = null;
    vi.mocked(downloadManager.subscribe).mockImplementation((listener) => {
      capturedListener = listener;
      return unsubMock;
    });
    vi.mocked(downloadManager.getProgress).mockResolvedValue(null);
  });

  it('returns empty map for empty identifiers', () => {
    const { result } = renderHook(() => useBatchDownloadStates([]));
    expect(result.current.size).toBe(0);
  });

  it('fetches progress for each identifier on mount', async () => {
    vi.mocked(downloadManager.getProgress)
      .mockResolvedValueOnce({
        identifier: 'a',
        state: 'DOWNLOADING' as const,
        progress: 50,
        bytesDownloaded: 500,
        totalBytes: 1000,
      })
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() => useBatchDownloadStates(['a', 'b']));
    await act(async () => {});

    expect(result.current.size).toBe(1);
    expect(result.current.get('a')?.state).toBe('DOWNLOADING');
    expect(result.current.get('a')?.progress).toBe(50);
    expect(result.current.has('b')).toBe(false);
  });

  it('refreshes on download events', async () => {
    const { result } = renderHook(() => useBatchDownloadStates(['a']));
    await act(async () => {});
    expect(result.current.size).toBe(0);

    vi.mocked(downloadManager.getProgress).mockResolvedValue({
      identifier: 'a',
      state: 'DOWNLOADING' as const,
      progress: 25,
      bytesDownloaded: 250,
      totalBytes: 1000,
    });

    await act(async () => {
      capturedListener?.({ type: 'state_change', identifier: 'a' });
    });

    expect(result.current.size).toBe(1);
    expect(result.current.get('a')?.progress).toBe(25);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useBatchDownloadStates(['a']));
    expect(downloadManager.subscribe).toHaveBeenCalled();
    unmount();
    expect(unsubMock).toHaveBeenCalled();
  });
});
