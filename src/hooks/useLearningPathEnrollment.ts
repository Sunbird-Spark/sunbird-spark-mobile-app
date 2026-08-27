import { useMemo, useState } from 'react';
import { useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useUserEnrollmentList } from './useUserEnrollment';
import { useBatchListForLearner, useBatchRead, useEnrol, useUnenrol, EnrolParams } from './useBatch';
import {
  getEnrollableBatches,
  getEnrollmentForCollection,
  getFirstCertPreviewUrl,
} from '../services/course/enrollmentMapper';
import { getPathSummary } from '../services/viewer/summaryMapper';
import type { BatchListItem } from '../types/collectionTypes';
import type { ApiResponse } from '../lib/http-client';
import type { ViewerSummaryRecord } from '../types/viewerServiceTypes';

export interface LearningPathEnrollmentState {
  isEnrolled: boolean;
  /** The batch id writes/reads for this path should target — route param, else the learner's own enrolment record. */
  effectiveContextId: string | undefined;
  enrollableBatches: BatchListItem[];
  batchListLoading: boolean;
  batchListError: string | undefined;
  isBatchEnded: boolean;
  isBatchUpcoming: boolean;
  batchEndDate: string | undefined;
  certPreviewUrl: string | undefined;
  enrol: UseMutationResult<ApiResponse<unknown>, Error, EnrolParams>;
  unenrol: UseMutationResult<ApiResponse<unknown>, Error, EnrolParams>;
}

/**
 * Learning Path analogue of `useCollectionEnrollment`: the learner enrols in
 * a batch on the Learning Path itself. Enrolment/batch APIs are still the
 * learner service — only progress reads move to the Viewer Service.
 */
export function useLearningPathEnrollment(
  pathId: string | undefined,
  contextIdParam: string | undefined,
  summaryRecords: ViewerSummaryRecord[],
  isAuthenticated: boolean
): LearningPathEnrollmentState {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const pathSummary = useMemo(
    () => getPathSummary(summaryRecords, pathId, contextIdParam),
    [summaryRecords, pathId, contextIdParam]
  );

  // The Viewer Service summary above only exists once progress activity has
  // been recorded — a freshly-enrolled learner has none yet. The Learner
  // Service enrolment list is the source of truth the enrol/join API itself
  // checks, so it can't drift out of sync with "already enrolled" the way a
  // summary-only check can (see bug: Enrol card shown to already-enrolled
  // learners, whose join attempt then bounces off the backend).
  const { data: enrollmentsResponse } = useUserEnrollmentList(userId, { enabled: isAuthenticated && !!userId });
  const enrollmentRecord = useMemo(
    () => getEnrollmentForCollection(enrollmentsResponse?.data?.courses, pathId),
    [enrollmentsResponse, pathId]
  );

  const isEnrolled = !!enrollmentRecord || !!pathSummary;
  const effectiveContextId = contextIdParam ?? enrollmentRecord?.batchId ?? pathSummary?.contextId;

  const batchListQuery = useBatchListForLearner(pathId, { enabled: isAuthenticated && !isEnrolled });
  const enrollableBatches = useMemo(
    () => getEnrollableBatches(batchListQuery.data?.data?.response?.content ?? []),
    [batchListQuery.data]
  );

  const batchReadQuery = useBatchRead(isEnrolled ? effectiveContextId : undefined, {
    enabled: isEnrolled && !!effectiveContextId,
  });
  // Captured once on mount (matches useCollectionEnrollment's pattern) — calling
  // Date.now() directly inside useMemo is an impure render call.
  const [now] = useState(Date.now);
  const batchEndDate = batchReadQuery.data?.data?.response?.endDate;
  const isBatchEnded = useMemo(() => {
    if (!batchEndDate) return false;
    const endMs = new Date(batchEndDate).getTime();
    return Number.isFinite(endMs) && endMs < now;
  }, [batchEndDate, now]);
  const isBatchUpcoming = useMemo(() => {
    const startDateStr = batchReadQuery.data?.data?.response?.startDate;
    if (!startDateStr) return false;
    return new Date(startDateStr).getTime() > now;
  }, [batchReadQuery.data?.data?.response?.startDate, now]);

  const certPreviewUrl = useMemo(
    () => getFirstCertPreviewUrl(batchReadQuery.data?.data?.response?.certTemplates),
    [batchReadQuery.data]
  );

  const enrol = useEnrol();
  const unenrol = useUnenrol();

  // The Viewer Service summary cache doesn't invalidate on the learner-service
  // enrol/unenrol mutations above (they only invalidate `userEnrollments` and
  // `batchList`) — without this, a freshly-enrolled learner's Overview page
  // would show "Not enrolled" until the next unrelated summary refetch.
  const enrolWithSummaryInvalidation: UseMutationResult<ApiResponse<unknown>, Error, EnrolParams> = {
    ...enrol,
    mutateAsync: async (variables: EnrolParams) => {
      const result = await enrol.mutateAsync(variables);
      await queryClient.invalidateQueries({ queryKey: ['viewerSummary', variables.userId] });
      return result;
    },
  };
  const unenrolWithSummaryInvalidation: UseMutationResult<ApiResponse<unknown>, Error, EnrolParams> = {
    ...unenrol,
    mutateAsync: async (variables: EnrolParams) => {
      const result = await unenrol.mutateAsync(variables);
      await queryClient.invalidateQueries({ queryKey: ['viewerSummary', variables.userId] });
      return result;
    },
  };

  return {
    isEnrolled,
    effectiveContextId,
    enrollableBatches,
    batchListLoading: batchListQuery.isLoading,
    batchListError: batchListQuery.error?.message,
    isBatchEnded,
    isBatchUpcoming,
    batchEndDate,
    certPreviewUrl,
    enrol: enrolWithSummaryInvalidation,
    unenrol: unenrolWithSummaryInvalidation,
  };
}
