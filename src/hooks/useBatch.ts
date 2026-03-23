import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { AppInitializer } from '../AppInitializer';
import { BatchService } from '../services/course/BatchService';
import type {
  BatchListResponse,
  BatchReadResponse,
  ContentStateReadRequest,
  ContentStateReadResponse,
  ContentStateUpdateRequest,
} from '../types/collectionTypes';
import type { ApiResponse } from '../lib/http-client';

const batchService = new BatchService();

// ─── Params ──────────────────────────────────────────────────────────────────
export type EnrolParams = { courseId: string; userId: string; batchId: string };

// ─── useBatchListForLearner ──────────────────────────────────────────────────
export function useBatchListForLearner(
  courseId: string | undefined,
  options?: { enabled?: boolean }
): UseQueryResult<ApiResponse<BatchListResponse>, Error> {
  const enabled = (options?.enabled ?? true) && AppInitializer.isInitialized();
  return useQuery({
    queryKey: ['batchList', courseId],
    queryFn: () => batchService.batchList(courseId!),
    enabled: enabled && !!courseId,
  });
}

// ─── useBatchRead ────────────────────────────────────────────────────────────
export function useBatchRead(
  batchId: string | undefined,
  options?: { enabled?: boolean }
): UseQueryResult<ApiResponse<BatchReadResponse>, Error> {
  const enabled = (options?.enabled ?? true) && AppInitializer.isInitialized();
  return useQuery({
    queryKey: ['batchRead', batchId],
    queryFn: () => batchService.batchRead(batchId!),
    enabled: enabled && !!batchId,
  });
}

// ─── useContentState ─────────────────────────────────────────────────────────
export function useContentState(
  request: ContentStateReadRequest | null,
  options?: { enabled?: boolean }
): UseQueryResult<ApiResponse<ContentStateReadResponse>, Error> {
  const enabled = (options?.enabled ?? true) && AppInitializer.isInitialized();
  return useQuery({
    queryKey: [
      'contentState',
      request?.userId,
      request?.courseId,
      request?.batchId,
      request?.contentIds?.join(',') ?? '',
    ],
    queryFn: () => batchService.contentStateRead(request!),
    enabled: enabled && !!request && request.contentIds.length > 0,
  });
}

// ─── useEnrol ────────────────────────────────────────────────────────────────
export function useEnrol(): UseMutationResult<ApiResponse<unknown>, Error, EnrolParams> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, userId, batchId }: EnrolParams) =>
      batchService.enrol(courseId, userId, batchId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userEnrollments', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['batchList', variables.courseId] });
    },
  });
}

// ─── useUnenrol ──────────────────────────────────────────────────────────────
export function useUnenrol(): UseMutationResult<ApiResponse<unknown>, Error, EnrolParams> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, userId, batchId }: EnrolParams) =>
      batchService.unenrol(courseId, userId, batchId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userEnrollments', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['contentState'] });
    },
  });
}

// ─── useContentStateUpdateMutation ───────────────────────────────────────────
export function useContentStateUpdateMutation(): UseMutationResult<
  ApiResponse<unknown>,
  Error,
  ContentStateUpdateRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ContentStateUpdateRequest) =>
      batchService.contentStateUpdate(request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['contentState', variables.userId, variables.courseId, variables.batchId],
      });
    },
  });
}
