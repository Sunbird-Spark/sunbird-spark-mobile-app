import { renderHook, act } from '@testing-library/react';
import { useStorageInfo } from './useStorageInfo';
import { contentDbService } from '../services/db/ContentDbService';
import { downloadManager } from '../services/download_manager';
import type { DownloadListener } from '../services/download_manager/types';

vi.mock('../services/db/ContentDbService', () => ({
  contentDbService: {
    getDownloadedContent: vi.fn(),
  },
}));

vi.mock('../services/download_manager', () => ({
  downloadManager: {
    subscribe: vi.fn(),
  },
}));

describe('useStorageInfo', () => {
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

  it('returns initial storage info', async () => {
    vi.mocked(contentDbService.getDownloadedContent).mockResolvedValue([
      { identifier: 'do_1', size_on_device: 5000 },
      { identifier: 'do_2', size_on_device: 3000 },
    ] as any);

    const { result } = renderHook(() => useStorageInfo());
    await act(async () => {});

    expect(result.current).toEqual({ totalBytes: 8000, itemCount: 2 });
  });

  it('refreshes on state_change event', async () => {
    vi.mocked(contentDbService.getDownloadedContent)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ identifier: 'do_1', size_on_device: 1000 }] as any);

    const { result } = renderHook(() => useStorageInfo());
    await act(async () => {});
    expect(result.current.itemCount).toBe(0);

    await act(async () => {
      capturedListener?.({ type: 'state_change', identifier: 'do_1' });
    });

    expect(result.current).toEqual({ totalBytes: 1000, itemCount: 1 });
  });

  it('unsubscribes on unmount', () => {
    vi.mocked(contentDbService.getDownloadedContent).mockResolvedValue([]);
    const { unmount } = renderHook(() => useStorageInfo());
    unmount();
    expect(unsubMock).toHaveBeenCalled();
  });

  it('treats missing size_on_device as 0', async () => {
    vi.mocked(contentDbService.getDownloadedContent).mockResolvedValue([
      { identifier: 'do_1', size_on_device: undefined },
      { identifier: 'do_2', size_on_device: 2000 },
    ] as any);

    const { result } = renderHook(() => useStorageInfo());
    await act(async () => {});

    expect(result.current).toEqual({ totalBytes: 2000, itemCount: 2 });
  });

  it('refreshes on all_done event', async () => {
    vi.mocked(contentDbService.getDownloadedContent)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ identifier: 'do_1', size_on_device: 500 }] as any);

    const { result } = renderHook(() => useStorageInfo());
    await act(async () => {});
    expect(result.current.itemCount).toBe(0);

    await act(async () => {
      capturedListener?.({ type: 'all_done' } as any);
    });

    expect(result.current.itemCount).toBe(1);
  });

  it('does not refresh on unrelated event types', async () => {
    vi.mocked(contentDbService.getDownloadedContent).mockResolvedValue([]);

    const { result } = renderHook(() => useStorageInfo());
    await act(async () => {});

    await act(async () => {
      capturedListener?.({ type: 'progress', identifier: 'do_1' } as any);
    });

    expect(contentDbService.getDownloadedContent).toHaveBeenCalledTimes(1);
    expect(result.current.itemCount).toBe(0);
  });
});
