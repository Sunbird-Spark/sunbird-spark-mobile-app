import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useViewerSummary,
  useInvalidateViewerSummary,
  useMergeViewerSummaryRecord,
  useOptimisticViewerSummaryPatch,
} from './useViewerSummary';

const { mockUseAuth, mockViewerService, mockIsInitialized } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockViewerService: { summaryList: vi.fn() },
  mockIsInitialized: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../services/viewer', () => ({ viewerService: mockViewerService }));
vi.mock('../AppInitializer', () => ({ AppInitializer: { isInitialized: mockIsInitialized } }));

function record(overrides: Record<string, unknown>) {
  return { userId: 'u1', active: true, status: 1, progress: 0, contentStatus: {}, ...overrides };
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useViewerSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userId: 'u1' });
    mockIsInitialized.mockReturnValue(true);
  });

  it('fetches and normalises the summary list for the current user', async () => {
    mockViewerService.summaryList.mockResolvedValue({
      data: { response: [{ userId: 'u1', courseId: 'lp1', batchId: 'ctx1', active: true, status: 1, progress: 0, contentStatus: {} }] },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useViewerSummary(), { wrapper: createWrapper(queryClient) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0]).toEqual(
      expect.objectContaining({ collectionId: 'lp1', contextId: 'ctx1' })
    );
  });

  it('does not fetch when there is no userId', () => {
    mockUseAuth.mockReturnValue({ userId: null });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(() => useViewerSummary(), { wrapper: createWrapper(queryClient) });
    expect(mockViewerService.summaryList).not.toHaveBeenCalled();
  });
});

describe('useInvalidateViewerSummary', () => {
  it('invalidates the viewerSummary cache key scoped to the current user', async () => {
    mockUseAuth.mockReturnValue({ userId: 'u1' });
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useInvalidateViewerSummary(), { wrapper: createWrapper(queryClient) });
    await result.current();

    expect(spy).toHaveBeenCalledWith({ queryKey: ['viewerSummary', 'u1'] });
  });
});

describe('useMergeViewerSummaryRecord', () => {
  it('replaces the matching cached record by collectionId+contextId', () => {
    mockUseAuth.mockReturnValue({ userId: 'u1' });
    const queryClient = new QueryClient();
    queryClient.setQueryData(['viewerSummary', 'u1'], [
      record({ collectionId: 'lp1', contextId: 'ctx1', progress: 10 }),
    ]);

    const { result } = renderHook(() => useMergeViewerSummaryRecord(), { wrapper: createWrapper(queryClient) });
    result.current(record({ collectionId: 'lp1', contextId: 'ctx1', progress: 90 }));

    const data = queryClient.getQueryData<any[]>(['viewerSummary', 'u1']);
    expect(data?.[0].progress).toBe(90);
  });

  it('preserves the previous assessmentStatus when the incoming record omits it', () => {
    mockUseAuth.mockReturnValue({ userId: 'u1' });
    const queryClient = new QueryClient();
    queryClient.setQueryData(['viewerSummary', 'u1'], [
      record({ collectionId: 'lp1', contextId: 'ctx1', assessmentStatus: { q1: { score: 5, max_score: 10 } } }),
    ]);

    const { result } = renderHook(() => useMergeViewerSummaryRecord(), { wrapper: createWrapper(queryClient) });
    result.current(record({ collectionId: 'lp1', contextId: 'ctx1' }));

    const data = queryClient.getQueryData<any[]>(['viewerSummary', 'u1']);
    expect(data?.[0].assessmentStatus).toEqual({ q1: { score: 5, max_score: 10 } });
  });

  it('appends a new record when nothing matches yet', () => {
    mockUseAuth.mockReturnValue({ userId: 'u1' });
    const queryClient = new QueryClient();
    queryClient.setQueryData(['viewerSummary', 'u1'], [record({ collectionId: 'other', contextId: 'ctxA' })]);

    const { result } = renderHook(() => useMergeViewerSummaryRecord(), { wrapper: createWrapper(queryClient) });
    result.current(record({ collectionId: 'lp1', contextId: 'ctx1' }));

    const data = queryClient.getQueryData<any[]>(['viewerSummary', 'u1']);
    expect(data).toHaveLength(2);
  });
});

describe('useOptimisticViewerSummaryPatch', () => {
  it('patches contentStatus on the record matching collectionId', () => {
    mockUseAuth.mockReturnValue({ userId: 'u1' });
    const queryClient = new QueryClient();
    queryClient.setQueryData(['viewerSummary', 'u1'], [record({ collectionId: 'course1', contextId: 'lp1:course1' })]);

    const { result } = renderHook(() => useOptimisticViewerSummaryPatch(), { wrapper: createWrapper(queryClient) });
    result.current('course1', 'leaf1', 2);

    const data = queryClient.getQueryData<any[]>(['viewerSummary', 'u1']);
    expect(data?.[0].contentStatus).toEqual({ leaf1: 2 });
  });

  it('also patches any other record already tracking that contentId (the LP-root record)', () => {
    mockUseAuth.mockReturnValue({ userId: 'u1' });
    const queryClient = new QueryClient();
    queryClient.setQueryData(['viewerSummary', 'u1'], [
      record({ collectionId: 'course1', contextId: 'lp1:course1', contentStatus: { leaf1: 1 } }),
      record({ collectionId: 'lp1', contextId: 'ctx1', contentStatus: { leaf1: 1 } }),
    ]);

    const { result } = renderHook(() => useOptimisticViewerSummaryPatch(), { wrapper: createWrapper(queryClient) });
    result.current('course1', 'leaf1', 2);

    const data = queryClient.getQueryData<any[]>(['viewerSummary', 'u1']);
    expect(data?.[0].contentStatus.leaf1).toBe(2);
    expect(data?.[1].contentStatus.leaf1).toBe(2); // LP-root record patched too
  });

  it('appends a new minimal record when nothing matches collectionId yet (first-ever write)', () => {
    mockUseAuth.mockReturnValue({ userId: 'u1' });
    const queryClient = new QueryClient();
    queryClient.setQueryData(['viewerSummary', 'u1'], [record({ collectionId: 'other', contextId: 'ctxA' })]);

    const { result } = renderHook(() => useOptimisticViewerSummaryPatch(), { wrapper: createWrapper(queryClient) });
    result.current('course1', 'leaf1', 1);

    const data = queryClient.getQueryData<any[]>(['viewerSummary', 'u1']);
    expect(data).toHaveLength(2);
    expect(data?.[1].collectionId).toBe('course1');
    expect(data?.[1].contentStatus).toEqual({ leaf1: 1 });
  });

  it('keeps the best (highest) score across attempts when an assessment score is patched', () => {
    mockUseAuth.mockReturnValue({ userId: 'u1' });
    const queryClient = new QueryClient();
    queryClient.setQueryData(['viewerSummary', 'u1'], [
      record({ collectionId: 'course1', contextId: 'lp1:course1', assessmentStatus: { q1: { score: 8, max_score: 10, attempts: 1 } } }),
    ]);

    const { result } = renderHook(() => useOptimisticViewerSummaryPatch(), { wrapper: createWrapper(queryClient) });
    result.current('course1', 'q1', 2, { score: 5, max_score: 10 }); // weaker retry

    const data = queryClient.getQueryData<any[]>(['viewerSummary', 'u1']);
    expect(data?.[0].assessmentStatus.q1).toEqual({ score: 8, max_score: 10, attempts: 2 });
  });
});
