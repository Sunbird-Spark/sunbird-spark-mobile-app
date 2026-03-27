import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserEnrollmentList } from './useUserEnrollment';
import {
  useBatchListForLearner,
  useBatchRead,
  useContentState,
  useEnrol,
  useUnenrol,
} from './useBatch';
import {
  getEnrollmentForCollection,
  getLeafNodes,
  getContentStatusMap,
  getContentAttemptInfoMap,
  getCourseProgressProps,
  getEnrollableBatches,
  getNextContent,
  getFirstCertPreviewUrl,
} from '../services/course/enrollmentMapper';
import type {
  CollectionData,
  BatchListItem,
  ContentStateItem,
} from '../types/collectionTypes';
import type { ContentAttemptInfo } from '../services/course/enrollmentMapper';

export interface CollectionEnrollmentState {
  isLoading: boolean;

  // Enrollment
  isEnrolled: boolean;
  enrolledBatchId: string | null;
  enrollableBatches: BatchListItem[];

  // Batch details
  batchName: string | undefined;
  isBatchEnded: boolean;
  isBatchUpcoming: boolean;
  batchStartDate: string | undefined;
  batchEnrollmentType: string | undefined;

  // Progress
  contentStatusMap: Record<string, number>;
  contentAttemptInfoMap: Record<string, ContentAttemptInfo>;
  progressProps: { total: number; completed: number; percentage: number };
  leafContentIds: string[];
  nextContentId: string | null;

  // Certificate
  hasCertificate: boolean;
  certPreviewUrl: string | undefined;

  // Loading/Error states
  batchListLoading: boolean;
  batchListError: string | undefined;
  joinLoading: boolean;
  joinError: string;

  // Fetching states for background refetches
  isEnrollmentsFetching: boolean;

  // Mutations
  enrol: ReturnType<typeof useEnrol>;
  unenrol: ReturnType<typeof useUnenrol>;
}

export function useCollectionEnrollment(
  collectionId: string | undefined,
  collectionData: CollectionData | null | undefined,
  batchIdParam?: string,
): CollectionEnrollmentState {
  const { userId, isAuthenticated } = useAuth();

  // 1. Fetch user's enrollments
  const enrollmentsQuery = useUserEnrollmentList(userId, {
    enabled: isAuthenticated && !!userId,
  });

  // 2. Find enrollment for this course
  const enrollment = useMemo(() => {
    if (!collectionId || !enrollmentsQuery.data?.data?.courses) return undefined;
    return getEnrollmentForCollection(enrollmentsQuery.data.data.courses, collectionId);
  }, [collectionId, enrollmentsQuery.data]);

  const isEnrolled = !!enrollment;
  const enrolledBatchId = batchIdParam ?? enrollment?.batchId ?? null;

  // 3. Fetch available batches (for non-enrolled users)
  const batchListQuery = useBatchListForLearner(collectionId, {
    enabled: !isEnrolled && !!collectionId,
  });

  const enrollableBatches = useMemo(() => {
    const batches = batchListQuery.data?.data?.response?.content ?? [];
    return getEnrollableBatches(batches);
  }, [batchListQuery.data]);

  // 4. Extract leaf nodes and IDs from hierarchy.
  //    Leaf nodes carry maxAttempts used for assessment attempt enforcement.
  const leafNodes = useMemo(() => {
    if (!collectionData?.children?.length) return [];
    return collectionData.children.flatMap(getLeafNodes);
  }, [collectionData]);

  const leafContentIds = useMemo(() => leafNodes.map((n) => n.identifier), [leafNodes]);

  const maxAttemptsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const node of leafNodes) {
      if (typeof node.maxAttempts === 'number' && node.maxAttempts > 0) {
        map[node.identifier] = node.maxAttempts;
      }
    }
    return map;
  }, [leafNodes]);

  // 5. Fetch content state (progress) for enrolled users
  const contentStateQuery = useContentState(
    isEnrolled && userId && collectionId && enrolledBatchId
      ? {
        userId,
        courseId: collectionId,
        batchId: enrolledBatchId,
        contentIds: leafContentIds,
        fields: ['progress', 'score', 'status'],
      }
      : null,
    { enabled: isEnrolled && leafContentIds.length > 0 },
  );

  // 6. Derive progress
  const contentList: ContentStateItem[] = contentStateQuery.data?.data?.contentList ?? [];
  const contentStatusMap = useMemo(() => getContentStatusMap(contentList), [contentList]);
  const contentAttemptInfoMap = useMemo(
    () => getContentAttemptInfoMap(contentList, maxAttemptsMap),
    [contentList, maxAttemptsMap],
  );

  const progressProps = useMemo(
    () => getCourseProgressProps(leafContentIds, contentStatusMap),
    [leafContentIds, contentStatusMap],
  );

  // 7. Find next incomplete content (for Resume)
  const nextContentId = useMemo(() => {
    if (!collectionData?.children?.length) return null;
    for (const child of collectionData.children) {
      const found = getNextContent(child, contentStatusMap);
      if (found) return found.identifier;
    }
    return null;
  }, [collectionData, contentStatusMap]);

  // 8. Certificate — read batch detail for certTemplates
  const batchReadQuery = useBatchRead(enrolledBatchId ?? undefined, {
    enabled: isEnrolled && !!enrolledBatchId,
  });

  const hasCertificate = useMemo(() => {
    const templates = batchReadQuery.data?.data?.response?.certTemplates;
    return !!templates && Object.keys(templates).length > 0;
  }, [batchReadQuery.data]);

  const certPreviewUrl = useMemo(() => {
    return getFirstCertPreviewUrl(
      batchReadQuery.data?.data?.response?.certTemplates,
    );
  }, [batchReadQuery.data]);

  // 9. Batch dates — captured once on mount
  const [now] = useState(Date.now);

  // Offline fallback: batch status/name stored in enrolled_courses.details
  const offlineBatchStatus = enrollment?.batch?.status; // 0=upcoming, 1=ongoing, 2=ended

  const batchName = (batchReadQuery.data?.data?.response?.name as string | undefined)
    ?? enrollment?.batch?.name;

  const isBatchEnded = useMemo(() => {
    const endDateStr = batchReadQuery.data?.data?.response?.endDate as string | undefined;
    if (endDateStr) {
      const endMs = new Date(endDateStr).getTime();
      return Number.isFinite(endMs) && endMs < now;
    }
    // Offline fallback: status 2 = ended
    return offlineBatchStatus === 2;
  }, [batchReadQuery.data, offlineBatchStatus, now]);

  const isBatchUpcoming = useMemo(() => {
    const startDateStr = batchReadQuery.data?.data?.response?.startDate as string | undefined;
    if (startDateStr) return new Date(startDateStr).getTime() > now;
    // Offline fallback: status 0 = upcoming
    return offlineBatchStatus === 0;
  }, [batchReadQuery.data, offlineBatchStatus, now]);

  const batchStartDate = batchReadQuery.data?.data?.response?.startDate as string | undefined;
  const batchEnrollmentType = batchReadQuery.data?.data?.response?.enrollmentType as string | undefined;

  // 10. Mutations
  const enrol = useEnrol();
  const unenrol = useUnenrol();

  const isLoading =
    enrollmentsQuery.isLoading ||
    batchListQuery.isLoading ||
    contentStateQuery.isLoading;

  return {
    isLoading,
    isEnrolled,
    enrolledBatchId,
    enrollableBatches,
    batchName,
    isBatchEnded,
    isBatchUpcoming,
    batchStartDate,
    batchEnrollmentType,
    contentStatusMap,
    contentAttemptInfoMap,
    progressProps,
    leafContentIds,
    nextContentId,
    hasCertificate,
    certPreviewUrl,
    batchListLoading: batchListQuery.isLoading,
    batchListError: batchListQuery.error?.message,
    joinLoading: enrol.isPending,
    joinError: enrol.error?.message ?? '',
    isEnrollmentsFetching: enrollmentsQuery.isFetching,
    enrol,
    unenrol,
  };
}
