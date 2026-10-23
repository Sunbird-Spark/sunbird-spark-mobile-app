import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLearningPathEnrollment } from './useLearningPathEnrollment';

const {
  mockUseAuth,
  mockUseUserEnrollmentList,
  mockUseBatchListForLearner,
  mockUseBatchRead,
  mockUseEnrol,
  mockUseUnenrol,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseUserEnrollmentList: vi.fn(),
  mockUseBatchListForLearner: vi.fn(),
  mockUseBatchRead: vi.fn(),
  mockUseEnrol: vi.fn(),
  mockUseUnenrol: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('./useUserEnrollment', () => ({ useUserEnrollmentList: mockUseUserEnrollmentList }));
vi.mock('./useBatch', () => ({
  useBatchListForLearner: mockUseBatchListForLearner,
  useBatchRead: mockUseBatchRead,
  useEnrol: mockUseEnrol,
  useUnenrol: mockUseUnenrol,
}));

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useLearningPathEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userId: 'u1' });
    mockUseUserEnrollmentList.mockReturnValue({ data: { data: { courses: [] } } });
    mockUseBatchListForLearner.mockReturnValue({
      data: { data: { response: { content: [] } } },
      isLoading: false,
      error: undefined,
    });
    mockUseBatchRead.mockReturnValue({ data: undefined });
    mockUseEnrol.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, error: undefined });
    mockUseUnenrol.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, error: undefined });
  });

  it('is not enrolled when there is no enrolment record and no summary record', () => {
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useLearningPathEnrollment('lp1', undefined, [], true), {
      wrapper: createWrapper(queryClient),
    });
    expect(result.current.isEnrolled).toBe(false);
  });

  it('is enrolled when the learner-service enrolment list has a record for this path', () => {
    mockUseUserEnrollmentList.mockReturnValue({
      data: { data: { courses: [{ courseId: 'lp1', batchId: 'ctx1' }] } },
    });
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useLearningPathEnrollment('lp1', undefined, [], true), {
      wrapper: createWrapper(queryClient),
    });
    expect(result.current.isEnrolled).toBe(true);
    expect(result.current.effectiveContextId).toBe('ctx1');
  });

  it('is enrolled when only a Viewer Service summary record exists (enrolment list not yet caught up)', () => {
    const summaryRecords = [
      { userId: 'u1', collectionId: 'lp1', contextId: 'ctx1', active: true, status: 1, progress: 0, contentStatus: {} },
    ];
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useLearningPathEnrollment('lp1', undefined, summaryRecords, true), {
      wrapper: createWrapper(queryClient),
    });
    expect(result.current.isEnrolled).toBe(true);
    expect(result.current.effectiveContextId).toBe('ctx1');
  });

  it('the route contextId param wins over the enrolment record batchId', () => {
    mockUseUserEnrollmentList.mockReturnValue({
      data: { data: { courses: [{ courseId: 'lp1', batchId: 'ctx-from-enrolment' }] } },
    });
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useLearningPathEnrollment('lp1', 'ctx-from-route', [], true), {
      wrapper: createWrapper(queryClient),
    });
    expect(result.current.effectiveContextId).toBe('ctx-from-route');
  });

  it('invalidates the viewerSummary cache after a successful enrol', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    mockUseEnrol.mockReturnValue({ mutateAsync, isPending: false, error: undefined });
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useLearningPathEnrollment('lp1', undefined, [], true), {
      wrapper: createWrapper(queryClient),
    });
    await result.current.enrol.mutateAsync({ courseId: 'lp1', userId: 'u1', batchId: 'ctx1' });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ queryKey: ['viewerSummary', 'u1'] })
    );
  });
});
