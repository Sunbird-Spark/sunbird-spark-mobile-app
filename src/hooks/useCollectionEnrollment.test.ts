import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authState,
  networkState,
  mockUseUserEnrollmentList,
  mockUseBatchListForLearner,
  mockUseBatchRead,
  mockUseContentState,
  mockUseEnrol,
  mockUseUnenrol,
  mockRefetch,
} = vi.hoisted(() => ({
  authState: { userId: 'user-1' as string | null, isAuthenticated: true },
  networkState: { isOffline: false },
  mockUseUserEnrollmentList: vi.fn(),
  mockUseBatchListForLearner: vi.fn(),
  mockUseBatchRead: vi.fn(),
  mockUseContentState: vi.fn(),
  mockUseEnrol: vi.fn(),
  mockUseUnenrol: vi.fn(),
  mockRefetch: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('../providers/NetworkProvider', () => ({ useNetwork: () => networkState }));

vi.mock('./useUserEnrollment', () => ({
  useUserEnrollmentList: mockUseUserEnrollmentList,
}));

vi.mock('./useBatch', () => ({
  useBatchListForLearner: mockUseBatchListForLearner,
  useBatchRead: mockUseBatchRead,
  useContentState: mockUseContentState,
  useEnrol: mockUseEnrol,
  useUnenrol: mockUseUnenrol,
}));

import { useCollectionEnrollment } from './useCollectionEnrollment';
import type { CollectionData } from '../types/collectionTypes';

const COLLECTION_ID = 'do_course';

const query = (over: Record<string, unknown> = {}) => ({
  data: undefined,
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: mockRefetch,
  ...over,
});

const mutation = (over: Record<string, unknown> = {}) => ({
  isPending: false,
  error: null,
  mutate: vi.fn(),
  ...over,
});

const collectionData = {
  id: COLLECTION_ID,
  children: [
    {
      identifier: 'unit-1',
      mimeType: 'application/vnd.ekstep.content-collection',
      children: [
        { identifier: 'do_1', mimeType: 'video/mp4' },
        {
          identifier: 'do_2',
          mimeType: 'application/vnd.sunbird.questionset',
          contentType: 'SelfAssess',
          maxAttempts: 2,
        },
      ],
    },
  ],
} as unknown as CollectionData;

const enrollments = (courses: unknown[]) =>
  query({ data: { data: { courses } } });

const ENROLLMENT = {
  courseId: COLLECTION_ID,
  batchId: 'batch-1',
  batch: { status: 1, name: 'Offline Batch Name' },
};

const render = (
  data: CollectionData | null | undefined = collectionData,
  batchIdParam?: string,
) => renderHook(() => useCollectionEnrollment(COLLECTION_ID, data, batchIdParam));

describe('useCollectionEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.userId = 'user-1';
    authState.isAuthenticated = true;
    networkState.isOffline = false;
    mockUseUserEnrollmentList.mockReturnValue(enrollments([]));
    mockUseBatchListForLearner.mockReturnValue(query());
    mockUseBatchRead.mockReturnValue(query());
    mockUseContentState.mockReturnValue(query());
    mockUseEnrol.mockReturnValue(mutation());
    mockUseUnenrol.mockReturnValue(mutation());
  });

  describe('enrollment resolution', () => {
    it('reports not-enrolled when the user has no enrollment for the collection', () => {
      const { result } = render();

      expect(result.current.isEnrolled).toBe(false);
      expect(result.current.enrolledBatchId).toBeNull();
      // batch list is only fetched for non-enrolled users
      expect(mockUseBatchListForLearner).toHaveBeenCalledWith(COLLECTION_ID, { enabled: true });
      // content state query is disabled without an enrollment
      expect(mockUseContentState).toHaveBeenCalledWith(null, { enabled: false });
    });

    it('reports enrolled and builds the content-state request', () => {
      mockUseUserEnrollmentList.mockReturnValue(enrollments([ENROLLMENT]));

      const { result } = render();

      expect(result.current.isEnrolled).toBe(true);
      expect(result.current.enrolledBatchId).toBe('batch-1');
      expect(mockUseBatchListForLearner).toHaveBeenCalledWith(COLLECTION_ID, { enabled: false });
      expect(mockUseContentState).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          courseId: COLLECTION_ID,
          batchId: 'batch-1',
          contentIds: ['do_1', 'do_2'],
          fields: ['progress', 'score', 'status'],
          maxAttemptsMap: { do_2: 2 },
        },
        { enabled: true },
      );
    });

    it('prefers an explicit batchIdParam over the enrolled batch', () => {
      mockUseUserEnrollmentList.mockReturnValue(enrollments([ENROLLMENT]));

      const { result } = render(collectionData, 'batch-override');

      expect(result.current.enrolledBatchId).toBe('batch-override');
      expect(mockUseBatchRead).toHaveBeenCalledWith('batch-override', { enabled: true });
    });

    it('passes the auth state through to the enrollment query', () => {
      authState.isAuthenticated = false;
      authState.userId = null;

      render();

      expect(mockUseUserEnrollmentList).toHaveBeenCalledWith(null, { enabled: false });
    });
  });

  describe('enrollable batches', () => {
    it('keeps only ongoing batches with an open enrollment window', () => {
      const future = new Date(Date.now() + 86_400_000).toISOString();
      const past = new Date(Date.now() - 86_400_000).toISOString();
      mockUseBatchListForLearner.mockReturnValue(
        query({
          data: {
            data: {
              response: {
                content: [
                  { batchId: 'open', status: 1, enrollmentEndDate: future },
                  { batchId: 'closed', status: 1, enrollmentEndDate: past },
                  { batchId: 'upcoming', status: 0 },
                ],
              },
            },
          },
        }),
      );

      const { result } = render();

      expect(result.current.enrollableBatches.map((b) => b.batchId)).toEqual(['open']);
    });

    it('returns an empty list when the batch list has not loaded', () => {
      const { result } = render();
      expect(result.current.enrollableBatches).toEqual([]);
    });

    it('surfaces the batch-list loading and error state', () => {
      mockUseBatchListForLearner.mockReturnValue(
        query({ isLoading: true, error: new Error('batch list down') }),
      );

      const { result } = render();

      expect(result.current.batchListLoading).toBe(true);
      expect(result.current.batchListError).toBe('batch list down');
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('hierarchy + progress', () => {
    it('flattens leaf content ids, skipping collection nodes', () => {
      const { result } = render();
      expect(result.current.leafContentIds).toEqual(['do_1', 'do_2']);
    });

    it('returns no leaves for an empty collection', () => {
      const { result } = render(null);
      expect(result.current.leafContentIds).toEqual([]);
      expect(result.current.nextContentId).toBeNull();
      expect(result.current.progressProps).toEqual({ total: 0, completed: 0, percentage: 0 });
    });

    it('derives the status map, progress and attempt info from content state', () => {
      mockUseUserEnrollmentList.mockReturnValue(enrollments([ENROLLMENT]));
      mockUseContentState.mockReturnValue(
        query({
          data: {
            data: {
              contentList: [
                { contentId: 'do_1', status: 2 },
                {
                  contentId: 'do_2',
                  status: 1,
                  score: [
                    { totalScore: 4, totalMaxScore: 10 },
                    { totalScore: 8, totalMaxScore: 10 },
                  ],
                },
              ],
            },
          },
        }),
      );

      const { result } = render();

      expect(result.current.contentStatusMap).toEqual({ do_1: 2, do_2: 1 });
      expect(result.current.progressProps).toEqual({ total: 2, completed: 1, percentage: 50 });
      expect(result.current.contentAttemptInfoMap.do_2).toEqual({
        attemptCount: 2,
        bestScore: { totalScore: 8, totalMaxScore: 10 },
      });
      expect(result.current.nextContentId).toBe('do_2');
    });

    it('reports no next content once everything is complete', () => {
      mockUseUserEnrollmentList.mockReturnValue(enrollments([ENROLLMENT]));
      mockUseContentState.mockReturnValue(
        query({
          data: {
            data: {
              contentList: [
                { contentId: 'do_1', status: 2 },
                { contentId: 'do_2', status: 2 },
              ],
            },
          },
        }),
      );

      const { result } = render();

      expect(result.current.nextContentId).toBeNull();
      expect(result.current.progressProps.percentage).toBe(100);
    });
  });

  describe('offline → online refetch', () => {
    it('refetches content state when the device comes back online while enrolled', () => {
      mockUseUserEnrollmentList.mockReturnValue(enrollments([ENROLLMENT]));
      networkState.isOffline = true;

      const { rerender } = render();
      expect(mockRefetch).not.toHaveBeenCalled();

      networkState.isOffline = false;
      rerender();

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('does not refetch when the device was already online', () => {
      mockUseUserEnrollmentList.mockReturnValue(enrollments([ENROLLMENT]));

      const { rerender } = render();
      rerender();

      expect(mockRefetch).not.toHaveBeenCalled();
    });

    it('does not refetch when the user is not enrolled', () => {
      networkState.isOffline = true;
      const { rerender } = render();

      networkState.isOffline = false;
      rerender();

      expect(mockRefetch).not.toHaveBeenCalled();
    });
  });

  describe('batch details', () => {
    beforeEach(() => {
      mockUseUserEnrollmentList.mockReturnValue(enrollments([ENROLLMENT]));
    });

    it('exposes certificate info when the batch has templates', () => {
      mockUseBatchRead.mockReturnValue(
        query({
          data: {
            data: {
              response: {
                name: 'Batch One',
                startDate: '2020-01-01',
                endDate: '2999-01-01',
                enrollmentType: 'open',
                certTemplates: { tpl1: { previewUrl: 'https://cert/preview.svg' } },
              },
            },
          },
        }),
      );

      const { result } = render();

      expect(result.current.hasCertificate).toBe(true);
      expect(result.current.certPreviewUrl).toBe('https://cert/preview.svg');
      expect(result.current.batchName).toBe('Batch One');
      expect(result.current.batchStartDate).toBe('2020-01-01');
      expect(result.current.batchEnrollmentType).toBe('open');
      expect(result.current.isBatchEnded).toBe(false);
      expect(result.current.isBatchUpcoming).toBe(false);
    });

    it('reports no certificate when certTemplates is empty', () => {
      mockUseBatchRead.mockReturnValue(
        query({ data: { data: { response: { certTemplates: {} } } } }),
      );

      const { result } = render();

      expect(result.current.hasCertificate).toBe(false);
      expect(result.current.certPreviewUrl).toBeUndefined();
    });

    it('marks the batch as ended from a past endDate', () => {
      mockUseBatchRead.mockReturnValue(
        query({ data: { data: { response: { endDate: '2000-01-01' } } } }),
      );

      const { result } = render();

      expect(result.current.isBatchEnded).toBe(true);
    });

    it('marks the batch as upcoming from a future startDate', () => {
      mockUseBatchRead.mockReturnValue(
        query({ data: { data: { response: { startDate: '2999-01-01' } } } }),
      );

      const { result } = render();

      expect(result.current.isBatchUpcoming).toBe(true);
    });

    it('falls back to the cached enrollment batch details when offline', () => {
      mockUseUserEnrollmentList.mockReturnValue(
        enrollments([{ ...ENROLLMENT, batch: { status: 2, name: 'Offline Batch Name' } }]),
      );

      const { result } = render();

      expect(result.current.batchName).toBe('Offline Batch Name');
      expect(result.current.isBatchEnded).toBe(true);
      expect(result.current.isBatchUpcoming).toBe(false);
    });

    it('falls back to the cached upcoming status when offline', () => {
      mockUseUserEnrollmentList.mockReturnValue(
        enrollments([{ ...ENROLLMENT, batch: { status: 0, name: 'Soon' } }]),
      );

      const { result } = render();

      expect(result.current.isBatchUpcoming).toBe(true);
      expect(result.current.isBatchEnded).toBe(false);
    });
  });

  describe('mutations and loading', () => {
    it('surfaces the enrol mutation pending/error state', () => {
      const enrol = mutation({ isPending: true, error: new Error('enrol failed') });
      mockUseEnrol.mockReturnValue(enrol);

      const { result } = render();

      expect(result.current.joinLoading).toBe(true);
      expect(result.current.joinError).toBe('enrol failed');
      expect(result.current.enrol).toBe(enrol);
      expect(result.current.unenrol).toBe(mockUseUnenrol.mock.results[0].value);
    });

    it('defaults joinError to an empty string', () => {
      const { result } = render();
      expect(result.current.joinError).toBe('');
    });

    it('is loading while the enrollment query is loading', () => {
      mockUseUserEnrollmentList.mockReturnValue(query({ isLoading: true, isFetching: true }));

      const { result } = render();

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isEnrollmentsFetching).toBe(true);
    });
  });
});
