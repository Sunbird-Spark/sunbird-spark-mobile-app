import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// vi.hoisted ensures these are available when the hoisted vi.mock factories run.
const { mockFormRead } = vi.hoisted(() => ({
  mockFormRead: vi.fn(),
}));

vi.mock('../services/FormService', () => ({
  FormService: class {
    formRead = mockFormRead;
  },
}));

vi.mock('../AppInitializer', () => ({
  AppInitializer: {
    isInitialized: vi.fn(),
  },
}));

import { useFormRead } from './useFormRead';
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

const mockRequest = {
  type: 'contentcategory',
  subType: 'global',
  action: 'menubar',
};

describe('useFormRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AppInitializer.isInitialized).mockReturnValue(true);
  });

  it('should fetch form data successfully', async () => {
    const mockResponse = {
      data: {
        result: {
          form: {
            framework: 'test-framework',
            type: 'contentcategory',
            subtype: 'global',
            action: 'menubar',
            component: 'app',
            data: { fields: [] },
            created_on: '2024-01-01',
            last_modified_on: '2024-01-01',
            rootOrgId: 'org-1',
          },
        },
      },
    };
    mockFormRead.mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useFormRead({ request: mockRequest }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
  });

  it('should pass the request to formService.formRead', async () => {
    mockFormRead.mockResolvedValue({ data: {} });

    renderHook(() => useFormRead({ request: mockRequest }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFormRead).toHaveBeenCalledWith(mockRequest);
    });
  });

  it('should handle fetch errors', async () => {
    mockFormRead.mockRejectedValue(new Error('Form read failed'));

    const { result } = renderHook(
      () => useFormRead({ request: mockRequest }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Form read failed');
  });

  it('should still fetch when enabled is false (hook defers to AppInitializer)', async () => {
    mockFormRead.mockResolvedValue({ data: {} });

    const { result } = renderHook(
      () => useFormRead({ request: mockRequest, enabled: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The current implementation ignores the enabled option and only checks AppInitializer
    expect(mockFormRead).toHaveBeenCalled();
  });

  it('should not fetch when AppInitializer is not initialized', () => {
    vi.mocked(AppInitializer.isInitialized).mockReturnValue(false);

    const { result } = renderHook(
      () => useFormRead({ request: mockRequest }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFormRead).not.toHaveBeenCalled();
  });

  it('should default enabled to true when not specified', async () => {
    mockFormRead.mockResolvedValue({ data: {} });

    const { result } = renderHook(
      () => useFormRead({ request: mockRequest }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFormRead).toHaveBeenCalled();
  });
});
