import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockBatchList,
  mockBatchRead,
  mockContentStateRead,
  mockEnrol,
  mockUnenrol,
  mockContentStateUpdate,
} = vi.hoisted(() => ({
  mockBatchList: vi.fn(),
  mockBatchRead: vi.fn(),
  mockContentStateRead: vi.fn(),
  mockEnrol: vi.fn(),
  mockUnenrol: vi.fn(),
  mockContentStateUpdate: vi.fn(),
}));

vi.mock('../services/course/BatchService', () => ({
  BatchService: class {
    batchList = mockBatchList;
    batchRead = mockBatchRead;
    contentStateRead = mockContentStateRead;
    enrol = mockEnrol;
    unenrol = mockUnenrol;
    contentStateUpdate = mockContentStateUpdate;
  },
}));

vi.mock('../AppInitializer', () => ({
  AppInitializer: { isInitialized: vi.fn() },
}));

import {
  useBatchListForLearner,
  useBatchRead,
  useContentState,
  useEnrol,
  useUnenrol,
  useContentStateUpdateMutation,
} from './useBatch';
import { AppInitializer } from '../AppInitializer';

let queryClient: QueryClient;
let invalidateSpy: ReturnType<typeof vi.spyOn>;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

const apiOk = (data: unknown) => ({ data, status: 200, headers: {} });

const CONTENT_STATE_REQUEST = {
  userId: 'user-1',
  courseId: 'do_course',
  batchId: 'batch-1',
  contentIds: ['do_1', 'do_2'],
  fields: ['progress', 'status'],
};

describe('useBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AppInitializer.isInitialized).mockReturnValue(true);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  });

  describe('useBatchListForLearner', () => {
    it('fetches the batch list for a course', async () => {
      const response = apiOk({ response: { content: [{ batchId: 'batch-1' }] } });
      mockBatchList.mockResolvedValue(response);

      const { result } = renderHook(() => useBatchListForLearner('do_course'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockBatchList).toHaveBeenCalledWith('do_course');
      expect(result.current.data).toEqual(response);
    });

    it('stays idle without a courseId', () => {
      const { result } = renderHook(() => useBatchListForLearner(undefined), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockBatchList).not.toHaveBeenCalled();
    });

    it('stays idle when explicitly disabled', () => {
      const { result } = renderHook(
        () => useBatchListForLearner('do_course', { enabled: false }),
        { wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockBatchList).not.toHaveBeenCalled();
    });

    it('stays idle before the app is initialized', () => {
      vi.mocked(AppInitializer.isInitialized).mockReturnValue(false);

      const { result } = renderHook(() => useBatchListForLearner('do_course'), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockBatchList).not.toHaveBeenCalled();
    });

    it('surfaces a fetch error', async () => {
      mockBatchList.mockRejectedValue(new Error('batch list failed'));

      const { result } = renderHook(() => useBatchListForLearner('do_course'), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('batch list failed');
    });
  });

  describe('useBatchRead', () => {
    it('reads a single batch', async () => {
      const response = apiOk({ response: { name: 'Batch One' } });
      mockBatchRead.mockResolvedValue(response);

      const { result } = renderHook(() => useBatchRead('batch-1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockBatchRead).toHaveBeenCalledWith('batch-1');
      expect(result.current.data).toEqual(response);
    });

    it('stays idle without a batchId', () => {
      const { result } = renderHook(() => useBatchRead(undefined), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockBatchRead).not.toHaveBeenCalled();
    });

    it('surfaces a read error', async () => {
      mockBatchRead.mockRejectedValue(new Error('batch read failed'));

      const { result } = renderHook(() => useBatchRead('batch-1'), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('batch read failed');
    });
  });

  describe('useContentState', () => {
    it('reads content state for the requested contents', async () => {
      const response = apiOk({ contentList: [{ contentId: 'do_1', status: 2 }] });
      mockContentStateRead.mockResolvedValue(response);

      const { result } = renderHook(() => useContentState(CONTENT_STATE_REQUEST), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockContentStateRead).toHaveBeenCalledWith(CONTENT_STATE_REQUEST);
      expect(result.current.data).toEqual(response);
    });

    it('stays idle for a null request', () => {
      const { result } = renderHook(() => useContentState(null), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockContentStateRead).not.toHaveBeenCalled();
    });

    it('stays idle when there are no contentIds', () => {
      const { result } = renderHook(
        () => useContentState({ ...CONTENT_STATE_REQUEST, contentIds: [] }),
        { wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockContentStateRead).not.toHaveBeenCalled();
    });
  });

  describe('useEnrol', () => {
    const params = { courseId: 'do_course', userId: 'user-1', batchId: 'batch-1' };

    it('enrols and invalidates the enrollment + batch-list caches', async () => {
      mockEnrol.mockResolvedValue(apiOk({ response: 'SUCCESS' }));

      const { result } = renderHook(() => useEnrol(), { wrapper });

      await act(async () => { await result.current.mutateAsync(params); });

      expect(mockEnrol).toHaveBeenCalledWith('do_course', 'user-1', 'batch-1');
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['userEnrollments', 'base', 'user-1'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['userEnrollments', 'user-1'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['batchList', 'do_course'] });
    });

    it('surfaces an enrol failure and invalidates nothing', async () => {
      mockEnrol.mockRejectedValue(new Error('already enrolled'));

      const { result } = renderHook(() => useEnrol(), { wrapper });

      act(() => { result.current.mutate(params); });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('already enrolled');
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('useUnenrol', () => {
    const params = { courseId: 'do_course', userId: 'user-1', batchId: 'batch-1' };

    it('unenrols and invalidates the enrollment + contentState caches', async () => {
      mockUnenrol.mockResolvedValue(apiOk({ response: 'SUCCESS' }));

      const { result } = renderHook(() => useUnenrol(), { wrapper });

      await act(async () => { await result.current.mutateAsync(params); });

      expect(mockUnenrol).toHaveBeenCalledWith('do_course', 'user-1', 'batch-1');
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['userEnrollments', 'base', 'user-1'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contentState'] });
    });

    it('surfaces an unenrol failure', async () => {
      mockUnenrol.mockRejectedValue(new Error('not enrolled'));

      const { result } = renderHook(() => useUnenrol(), { wrapper });

      act(() => { result.current.mutate(params); });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('not enrolled');
    });
  });

  describe('useContentStateUpdateMutation', () => {
    const request = {
      userId: 'user-1',
      courseId: 'do_course',
      batchId: 'batch-1',
      contents: [{ contentId: 'do_1', status: 2 }],
    };

    it('updates content state and invalidates the scoped contentState key', async () => {
      mockContentStateUpdate.mockResolvedValue(apiOk({ response: 'SUCCESS' }));

      const { result } = renderHook(() => useContentStateUpdateMutation(), { wrapper });

      await act(async () => { await result.current.mutateAsync(request); });

      expect(mockContentStateUpdate).toHaveBeenCalledWith(request);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['contentState', 'user-1', 'do_course', 'batch-1'],
      });
    });

    it('surfaces an update failure without invalidating', async () => {
      mockContentStateUpdate.mockRejectedValue(new Error('update failed'));

      const { result } = renderHook(() => useContentStateUpdateMutation(), { wrapper });

      act(() => { result.current.mutate(request); });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('update failed');
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });
});
