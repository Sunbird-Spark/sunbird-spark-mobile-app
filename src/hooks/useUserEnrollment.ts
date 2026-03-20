import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { AppInitializer } from '../AppInitializer';
import { EnrollmentService } from '../services/user_enrollment/EnrollmentService';
import type { CourseEnrollmentResponse } from '../types/collectionTypes';
import type { ApiResponse } from '../lib/http-client';

const enrollmentService = new EnrollmentService();

export function useUserEnrollmenList(
  userId: string | null,
  options?: { enabled?: boolean }
): UseQueryResult<ApiResponse<CourseEnrollmentResponse>, Error> {
  const enabled = (options?.enabled ?? true) && AppInitializer.isInitialized();
  return useQuery({
    queryKey: ['userEnrollments', userId],
    queryFn: () => enrollmentService.getUserEnrollments(userId!),
    enabled: enabled && !!userId,
  });
}