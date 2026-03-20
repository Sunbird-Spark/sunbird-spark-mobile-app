import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockGetUserEnrollments } = vi.hoisted(() => ({
  mockGetUserEnrollments: vi.fn(),
}));

vi.mock('../services/course/EnrollmentService', () => ({
  EnrollmentService: class {
    getUserEnrollments = mockGetUserEnrollments;
  },
}));

vi.mock('../AppInitializer', () => ({
  AppInitializer: {
    isInitialized: vi.fn(),
  },
}));

import { useUserEnrollmenList } from './useUserEnrollment';
import { AppInitializer } from '../AppInitializer';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockEnrollmentResponse = {
  data: {
    result: {
      courses: [
        {
          courseId: 'do_course_001',
          batchId: 'batch_001',
          userId: 'user_001',
          status: 1,
          progress: 50,
        },
      ],
    },
  },
  status: 200,
  headers: {},
};

describe('useUserEnrollmenList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AppInitializer.isInitialized).mockReturnValue(true);
  });

  it('should fetch user enrollments successfully', async () => {
    mockGetUserEnrollments.mockResolvedValue(mockEnrollmentResponse);

    const { result } = renderHook(
      () => useUserEnrollmenList('user_001'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockEnrollmentResponse);
  });

  it('should pass userId to enrollmentService.getUserEnrollments', async () => {
    mockGetUserEnrollments.mockResolvedValue(mockEnrollmentResponse);

    renderHook(
      () => useUserEnrollmenList('user_002'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockGetUserEnrollments).toHaveBeenCalledWith('user_002');
    });
  });

  it('should handle fetch errors', async () => {
    mockGetUserEnrollments.mockRejectedValue(new Error('Enrollment fetch failed'));

    const { result } = renderHook(
      () => useUserEnrollmenList('user_001'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Enrollment fetch failed');
  });

  it('should not fetch when userId is null', () => {
    const { result } = renderHook(
      () => useUserEnrollmenList(null),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetUserEnrollments).not.toHaveBeenCalled();
  });

  it('should not fetch when enabled option is false', () => {
    const { result } = renderHook(
      () => useUserEnrollmenList('user_001', { enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetUserEnrollments).not.toHaveBeenCalled();
  });

  it('should not fetch when AppInitializer is not initialized', () => {
    vi.mocked(AppInitializer.isInitialized).mockReturnValue(false);

    const { result } = renderHook(
      () => useUserEnrollmenList('user_001'),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetUserEnrollments).not.toHaveBeenCalled();
  });

  it('should default enabled to true when not specified', async () => {
    mockGetUserEnrollments.mockResolvedValue(mockEnrollmentResponse);

    const { result } = renderHook(
      () => useUserEnrollmenList('user_001'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetUserEnrollments).toHaveBeenCalled();
  });
});
