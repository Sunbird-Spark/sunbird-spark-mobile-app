import { renderHook, act } from '@testing-library/react';
import { useLocalContentSet } from './useLocalContentSet';
import { contentDbService } from '../services/db/ContentDbService';
import { downloadManager } from '../services/download_manager';
import type { DownloadListener } from '../services/download_manager/types';

vi.mock('../services/db/ContentDbService', () => ({
  contentDbService: {
    getByIdentifiers: vi.fn(),
  },
}));

vi.mock('../services/download_manager', () => ({
  downloadManager: {
    subscribe: vi.fn(),
  },
}));

describe('useLocalContentSet', () => {
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

  it('returns empty set for empty identifiers', async () => {
    const { result } = renderHook(() => useLocalContentSet([]));
    await act(async () => {});
    expect(result.current.size).toBe(0);
  });

  it('returns set of locally available identifiers with Default visibility', async () => {
    vi.mocked(contentDbService.getByIdentifiers).mockResolvedValue([
      { identifier: 'a', content_state: 2, visibility: 'Default' },
      { identifier: 'b', content_state: 1, visibility: 'Default' },
      { identifier: 'c', content_state: 2, visibility: 'Default' },
      { identifier: 'd', content_state: 2, visibility: 'Parent' },
    ] as any);

    const { result } = renderHook(() => useLocalContentSet(['a', 'b', 'c', 'd']));
    await act(async () => {});

    expect(result.current.has('a')).toBe(true);
    expect(result.current.has('b')).toBe(false);
    expect(result.current.has('c')).toBe(true);
    expect(result.current.has('d')).toBe(false); // Parent visibility excluded by default
    expect(result.current.size).toBe(2);
  });

  it('includes Parent visibility items when includeParentVisibility is true', async () => {
    vi.mocked(contentDbService.getByIdentifiers).mockResolvedValue([
      { identifier: 'a', content_state: 2, visibility: 'Default' },
      { identifier: 'b', content_state: 2, visibility: 'Parent' },
      { identifier: 'c', content_state: 1, visibility: 'Parent' },
    ] as any);

    const { result } = renderHook(() =>
      useLocalContentSet(['a', 'b', 'c'], { includeParentVisibility: true }),
    );
    await act(async () => {});

    expect(result.current.has('a')).toBe(true);
    expect(result.current.has('b')).toBe(true); // Parent included
    expect(result.current.has('c')).toBe(false); // content_state !== 2
    expect(result.current.size).toBe(2);
  });

  it('refreshes on state_change event', async () => {
    vi.mocked(contentDbService.getByIdentifiers)
      .mockResolvedValueOnce([{ identifier: 'a', content_state: 1, visibility: 'Default' }] as any)
      .mockResolvedValueOnce([{ identifier: 'a', content_state: 2, visibility: 'Default' }] as any);

    const { result } = renderHook(() => useLocalContentSet(['a']));
    await act(async () => {});
    expect(result.current.has('a')).toBe(false);

    await act(async () => {
      capturedListener?.({ type: 'state_change', identifier: 'a' });
    });

    expect(result.current.has('a')).toBe(true);
  });

  it('refreshes on all_done event', async () => {
    vi.mocked(contentDbService.getByIdentifiers)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([{ identifier: 'a', content_state: 2, visibility: 'Default' }] as any);

    const { result } = renderHook(() => useLocalContentSet(['a']));
    await act(async () => {});
    expect(result.current.size).toBe(0);

    await act(async () => {
      capturedListener?.({ type: 'all_done' });
    });

    expect(result.current.has('a')).toBe(true);
  });

  it('does not refresh on progress events', async () => {
    vi.mocked(contentDbService.getByIdentifiers).mockResolvedValue([] as any);

    const { result } = renderHook(() => useLocalContentSet(['a']));
    await act(async () => {});

    vi.mocked(contentDbService.getByIdentifiers).mockClear();

    await act(async () => {
      capturedListener?.({ type: 'progress', identifier: 'a' });
    });

    expect(contentDbService.getByIdentifiers).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', async () => {
    vi.mocked(contentDbService.getByIdentifiers).mockResolvedValue([] as any);
    const { unmount } = renderHook(() => useLocalContentSet(['a']));
    await act(async () => {});
    unmount();
    expect(unsubMock).toHaveBeenCalled();
  });
});
