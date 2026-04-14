import { renderHook, act } from '@testing-library/react';
import { useCourseDownloadProgress } from './useCourseDownloadProgress';
import { downloadManager } from '../services/download_manager';
import type { DownloadListener, AggregateProgress } from '../services/download_manager/types';
import type { HierarchyContentNode } from '../types/collectionTypes';

vi.mock('../services/download_manager', () => ({
  downloadManager: {
    getAggregateProgress: vi.fn(),
    subscribe: vi.fn(),
  },
}));

const COLLECTION_MIME = 'application/vnd.ekstep.content-collection';

function makeLeaf(id: string): HierarchyContentNode {
  return {
    identifier: id,
    name: `Leaf ${id}`,
    mimeType: 'application/pdf',
    downloadUrl: `https://cdn.example.com/${id}.ecar`,
    size: 1000,
    pkgVersion: 1,
  };
}

function makeUnit(id: string, children: HierarchyContentNode[]): HierarchyContentNode {
  return {
    identifier: id,
    name: `Unit ${id}`,
    mimeType: COLLECTION_MIME,
    children,
  };
}

describe('useCourseDownloadProgress', () => {
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

  it('returns empty progress when collectionId is undefined', async () => {
    vi.mocked(downloadManager.getAggregateProgress).mockResolvedValue({
      parentIdentifier: '',
      completed: 0,
      total: 0,
      overallPercent: 0,
      activeCount: 0,
      failedCount: 0,
      pausedCount: 0,
    });

    const { result } = renderHook(() =>
      useCourseDownloadProgress(undefined, [], new Set()),
    );
    await act(async () => { });

    expect(result.current.isDownloading).toBe(false);
    expect(result.current.total).toBe(0);
  });

  it('reflects aggregate progress from DownloadManager', async () => {
    const agg: AggregateProgress = {
      parentIdentifier: 'course1',
      completed: 2,
      total: 5,
      overallPercent: 45,
      activeCount: 3,
      failedCount: 0,
      pausedCount: 0,
    };
    vi.mocked(downloadManager.getAggregateProgress).mockResolvedValue(agg);

    const children = [makeUnit('u1', [makeLeaf('a'), makeLeaf('b'), makeLeaf('c'), makeLeaf('d'), makeLeaf('e')])];

    const { result } = renderHook(() =>
      useCourseDownloadProgress('course1', children, new Set()),
    );
    await act(async () => { });

    expect(result.current.total).toBe(5);
    expect(result.current.completed).toBe(2);
    expect(result.current.overallPercent).toBe(45);
    expect(result.current.isDownloading).toBe(true);
    expect(result.current.allDownloaded).toBe(false);
  });

  it('returns allDownloaded when all items completed', async () => {
    const agg: AggregateProgress = {
      parentIdentifier: 'course1',
      completed: 3,
      total: 3,
      overallPercent: 100,
      activeCount: 0,
      failedCount: 0,
      pausedCount: 0,
    };
    vi.mocked(downloadManager.getAggregateProgress).mockResolvedValue(agg);

    const children = [makeUnit('u1', [makeLeaf('a'), makeLeaf('b'), makeLeaf('c')])];

    const { result } = renderHook(() =>
      useCourseDownloadProgress('course1', children, new Set(['a', 'b', 'c'])),
    );
    await act(async () => { });

    expect(result.current.allDownloaded).toBe(true);
    expect(result.current.isDownloading).toBe(false);
  });

  it('refreshes on progress events', async () => {
    vi.useFakeTimers();
    vi.mocked(downloadManager.getAggregateProgress)
      .mockResolvedValueOnce({
        parentIdentifier: 'course1',
        completed: 0,
        total: 2,
        overallPercent: 0,
        activeCount: 2,
        failedCount: 0,
        pausedCount: 0,
      })
      .mockResolvedValueOnce({
        parentIdentifier: 'course1',
        completed: 1,
        total: 2,
        overallPercent: 50,
        activeCount: 1,
        failedCount: 0,
        pausedCount: 0,
      });

    const children = [makeUnit('u1', [makeLeaf('a'), makeLeaf('b')])];
    const { result } = renderHook(() =>
      useCourseDownloadProgress('course1', children, new Set()),
    );
    await act(async () => {
      vi.runAllTimers();
    });
    expect(result.current.overallPercent).toBe(0);

    await act(async () => {
      capturedListener?.({ type: 'progress', identifier: 'a' });
      vi.runAllTimers();
    });

    expect(result.current.overallPercent).toBe(50);
    vi.useRealTimers();
  });

  it('unsubscribes on unmount', async () => {
    vi.mocked(downloadManager.getAggregateProgress).mockResolvedValue({
      parentIdentifier: 'course1',
      completed: 0,
      total: 0,
      overallPercent: 0,
      activeCount: 0,
      failedCount: 0,
      pausedCount: 0,
    });

    const { unmount } = renderHook(() =>
      useCourseDownloadProgress('course1', [], new Set()),
    );
    await act(async () => { });
    unmount();
    expect(unsubMock).toHaveBeenCalled();
  });
});
