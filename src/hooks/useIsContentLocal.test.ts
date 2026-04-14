import { renderHook, act } from '@testing-library/react';
import { useIsContentLocal } from './useIsContentLocal';
import { contentDbService } from '../services/db/ContentDbService';
import { downloadManager } from '../services/download_manager';
import type { DownloadListener } from '../services/download_manager/types';

vi.mock('../services/db/ContentDbService', () => ({
  contentDbService: {
    getByIdentifier: vi.fn(),
  },
}));

vi.mock('../services/download_manager', () => ({
  downloadManager: {
    subscribe: vi.fn(),
  },
}));

describe('useIsContentLocal', () => {
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

  it('returns isLocal:false and isCheckPending:false when identifier is undefined', () => {
    const { result } = renderHook(() => useIsContentLocal(undefined));
    expect(result.current.isLocal).toBe(false);
    expect(result.current.isCheckPending).toBe(false);
  });

  it('starts with isCheckPending:true before DB resolves', () => {
    vi.mocked(contentDbService.getByIdentifier).mockReturnValue(new Promise(() => { }));
    const { result } = renderHook(() => useIsContentLocal('do_1'));
    expect(result.current.isCheckPending).toBe(true);
    expect(result.current.isLocal).toBe(false);
  });

  it('returns isLocal:true when content_state is 2 AND visibility is Default', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_1',
      content_state: 2,
      visibility: 'Default',
    } as any);

    const { result } = renderHook(() => useIsContentLocal('do_1'));
    await act(async () => { });

    expect(result.current.isLocal).toBe(true);
    expect(result.current.isCheckPending).toBe(false);
  });

  it('returns isLocal:false when content_state is 2 but visibility is Parent', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_1',
      content_state: 2,
      visibility: 'Parent',
    } as any);

    const { result } = renderHook(() => useIsContentLocal('do_1'));
    await act(async () => { });

    expect(result.current.isLocal).toBe(false); // Should be false because it's only a parent-visibility content
  });

  it('returns isLocal:false when content_state is not 2', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue({
      identifier: 'do_1',
      content_state: 1,
      visibility: 'Default',
    } as any);

    const { result } = renderHook(() => useIsContentLocal('do_1'));
    await act(async () => { });

    expect(result.current.isLocal).toBe(false);
    expect(result.current.isCheckPending).toBe(false);
  });

  it('returns isLocal:false when content not in DB', async () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue(null);

    const { result } = renderHook(() => useIsContentLocal('do_1'));
    await act(async () => { });

    expect(result.current.isLocal).toBe(false);
    expect(result.current.isCheckPending).toBe(false);
  });

  it('re-checks on state_change event for matching identifier', async () => {
    vi.mocked(contentDbService.getByIdentifier)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ identifier: 'do_1', content_state: 2, visibility: 'Default' } as any);

    const { result } = renderHook(() => useIsContentLocal('do_1'));
    await act(async () => { });
    expect(result.current.isLocal).toBe(false);

    await act(async () => {
      capturedListener?.({ type: 'state_change', identifier: 'do_1' });
    });

    expect(result.current.isLocal).toBe(true);
  });

  it('re-checks on content_deleted event for matching identifier', async () => {
    vi.mocked(contentDbService.getByIdentifier)
      .mockResolvedValueOnce({ identifier: 'do_1', content_state: 2, visibility: 'Default' } as any)
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() => useIsContentLocal('do_1'));
    await act(async () => { });
    expect(result.current.isLocal).toBe(true);

    await act(async () => {
      capturedListener?.({ type: 'content_deleted', identifier: 'do_1' });
    });

    expect(result.current.isLocal).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    vi.mocked(contentDbService.getByIdentifier).mockResolvedValue(null);
    const { unmount } = renderHook(() => useIsContentLocal('do_1'));
    unmount();
    expect(unsubMock).toHaveBeenCalled();
  });
});
