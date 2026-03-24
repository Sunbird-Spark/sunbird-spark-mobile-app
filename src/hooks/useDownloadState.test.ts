import { renderHook, act } from '@testing-library/react';
import { useDownloadState } from './useDownloadState';
import { downloadManager } from '../services/download_manager';
import type { DownloadListener } from '../services/download_manager/types';

vi.mock('../services/download_manager', () => ({
  downloadManager: {
    getProgress: vi.fn(),
    subscribe: vi.fn(),
  },
}));

describe('useDownloadState', () => {
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

  it('returns null when identifier is undefined', () => {
    vi.mocked(downloadManager.getProgress).mockResolvedValue(null);
    const { result } = renderHook(() => useDownloadState(undefined));
    expect(result.current).toBeNull();
  });

  it('fetches initial progress on mount', async () => {
    const progress = {
      identifier: 'do_1',
      state: 'DOWNLOADING' as const,
      progress: 50,
      bytesDownloaded: 500,
      totalBytes: 1000,
    };
    vi.mocked(downloadManager.getProgress).mockResolvedValue(progress);

    const { result } = renderHook(() => useDownloadState('do_1'));

    // Wait for async state update
    await act(async () => {});

    expect(result.current).toEqual(progress);
    expect(downloadManager.subscribe).toHaveBeenCalled();
  });

  it('updates when matching event fires', async () => {
    vi.mocked(downloadManager.getProgress)
      .mockResolvedValueOnce({
        identifier: 'do_1',
        state: 'QUEUED' as const,
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 0,
      })
      .mockResolvedValueOnce({
        identifier: 'do_1',
        state: 'DOWNLOADING' as const,
        progress: 30,
        bytesDownloaded: 300,
        totalBytes: 1000,
      });

    const { result } = renderHook(() => useDownloadState('do_1'));
    await act(async () => {});

    // Simulate event
    await act(async () => {
      capturedListener?.({ type: 'state_change', identifier: 'do_1' });
    });

    expect(result.current?.state).toBe('DOWNLOADING');
  });

  it('unsubscribes on unmount', () => {
    vi.mocked(downloadManager.getProgress).mockResolvedValue(null);
    const { unmount } = renderHook(() => useDownloadState('do_1'));
    unmount();
    expect(unsubMock).toHaveBeenCalled();
  });
});
