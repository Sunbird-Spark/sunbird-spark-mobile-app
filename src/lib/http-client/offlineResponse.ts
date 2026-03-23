import type { ApiResponse } from './types';

/**
 * Wraps data from SQLite into the same ApiResponse shape that HTTP calls return,
 * so offline reads are transparent to callers (hooks, React Query, etc.).
 */
export function buildOfflineResponse<T>(data: T): ApiResponse<T> {
  return { data, status: 200, headers: {} };
}
