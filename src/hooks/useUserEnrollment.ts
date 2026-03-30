import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { AppInitializer } from '../AppInitializer';
import { EnrollmentService } from '../services/user_enrollment/EnrollmentService';
import type { CourseEnrollmentResponse } from '../types/collectionTypes';
import type { ApiResponse } from '../lib/http-client';

const enrollmentService = new EnrollmentService();

export function useUserEnrollmentList(
  userId: string | null,
  options?: { enabled?: boolean }
): UseQueryResult<ApiResponse<CourseEnrollmentResponse>, Error> {
  const enabled = (options?.enabled ?? true) && AppInitializer.isInitialized();

  // Query 1 — enrollment API, cached for 5 minutes (no change)
  const baseQuery = useQuery({
    queryKey: ['userEnrollments', 'base', userId],
    queryFn: () => enrollmentService.getUserEnrollments(userId!),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Query 2 — local KV-cache enrichment only, no API call.
  // staleTime: 0 so it re-runs on every mount (e.g. navigating back to
  // MyLearning after consuming content offline).
  // Including dataUpdatedAt in the key ensures re-enrichment when the base
  // query refreshes after the 5-minute window.
  const enrichedQuery = useQuery({
    queryKey: ['userEnrollments', userId, baseQuery.dataUpdatedAt],
    queryFn: async (): Promise<ApiResponse<CourseEnrollmentResponse>> => {
      const base    = baseQuery.data!;
      const courses = base.data?.courses ?? [];
      const enriched = await enrollmentService.enrichWithLocalProgress(courses, userId!);
      return { ...base, data: { ...base.data, courses: enriched } };
    },
    enabled: enabled && !!userId && !!baseQuery.data,
    staleTime: 0,
  });

  // Return enriched data when available; fall back to raw base data while
  // enrichment query is still loading for the first time.
  if (enrichedQuery.data) {
    return { ...baseQuery, data: enrichedQuery.data } as UseQueryResult<ApiResponse<CourseEnrollmentResponse>, Error>;
  }
  return baseQuery;
}
