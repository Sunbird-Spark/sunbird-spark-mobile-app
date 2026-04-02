import { renderHook, act } from '@testing-library/react';
import { useBatchDownloadStates } from './useBatchDownloadStates';
import { downloadManager } from '../services/download_manager';
import type { DownloadListener } from '../services/download_manager/types';

vi.mock('../services/download_manager', () => ({
  downloadManager: {
    getBatchProgress: vi.fn().mockResolvedValue(new Map()),
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
    vi.mocked(downloadManager.getBatchProgress).mockResolvedValue(new Map());
  });

  it('returns empty map for empty identifiers', () => {
    const { result } = renderHook(() => useBatchDownloadStates([]));
    expect(result.current.size).toBe(0);
  });

  it('fetches progress for identifiers on mount', async () => {
    const mockMap = new Map([
      ['a', {
        identifier: 'a',
        state: 'DOWNLOADING' as any,
        progress: 50,
      } as any],
      ['b', {
        identifier: 'b',
        state: 'QUEUED' as any,
        progress: 0,
      } as any]
    ]);
    vi.mocked(downloadManager.getBatchProgress).mockResolvedValue(mockMap);

    const { result } = renderHook(() => useBatchDownloadStates(['a', 'b']));
    await act(async () => { });

    expect(result.current.size).toBe(2);
    expect(result.current.get('a')?.state).toBe('DOWNLOADING');
    expect(result.current.get('b')?.state).toBe('QUEUED');
  });

  it('refreshes on download events', async () => {
    const { result } = renderHook(() => useBatchDownloadStates(['a']));
    await act(async () => { });
    expect(result.current.size).toBe(0);

    vi.mocked(downloadManager.getBatchProgress).mockResolvedValue(new Map([
      ['a', {
        identifier: 'a',
        state: 'DOWNLOADING' as any,
        progress: 25,
      } as any]
    ]));

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

  it('refreshes on all_done event', async () => {
    vi.mocked(downloadManager.getBatchProgress).mockResolvedValue(
      new Map([['a', { identifier: 'a', state: 'COMPLETED' as any, progress: 100 } as any]])
    );

    const { result } = renderHook(() => useBatchDownloadStates(['a']));
    await act(async () => {
      capturedListener?.({ type: 'all_done' } as any);
    });

    expect(result.current.get('a')?.state).toBe('COMPLETED');
  });

  it('refreshes on queue_changed event', async () => {
    const { result } = renderHook(() => useBatchDownloadStates(['a']));
    await act(async () => { });

    vi.mocked(downloadManager.getBatchProgress).mockResolvedValue(
      new Map([['a', { identifier: 'a', state: 'QUEUED' as any, progress: 0 } as any]])
    );

    await act(async () => {
      capturedListener?.({ type: 'queue_changed' } as any);
    });

    expect(result.current.get('a')?.state).toBe('QUEUED');
  });

  it('refreshes on content_deleted event', async () => {
    const { result } = renderHook(() => useBatchDownloadStates(['a']));
    await act(async () => { });

    await act(async () => {
      capturedListener?.({ type: 'content_deleted', identifier: 'a' } as any);
    });

    expect(downloadManager.getBatchProgress).toHaveBeenCalled();
    expect(result.current.size).toBe(0);
  });

  it('does not refresh on unrelated event types', async () => {
    renderHook(() => useBatchDownloadStates(['a']));
    await act(async () => { });

    const callCount = vi.mocked(downloadManager.getBatchProgress).mock.calls.length;

    await act(async () => {
      capturedListener?.({ type: 'unknown_event' } as any);
    });

    expect(vi.mocked(downloadManager.getBatchProgress).mock.calls.length).toBe(callCount);
  });
});
