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

import { useQRScannerPreference } from './useQRScannerPreference';
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

describe('useQRScannerPreference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AppInitializer.isInitialized).mockReturnValue(true);
  });

  it('should return isEnabled as true when form API returns isEnabled: true', async () => {
    const mockResponse = {
      data: {
        form: {
          data: {
            isEnabled: true,
          },
        },
      },
    };
    mockFormRead.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useQRScannerPreference(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnabled).toBe(true);
  });

  it('should return isEnabled as false when form API returns isEnabled: false', async () => {
    const mockResponse = {
      data: {
        form: {
          data: {
            isEnabled: false,
          },
        },
      },
    };
    mockFormRead.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useQRScannerPreference(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnabled).toBe(false);
  });

  it('should default to false when isEnabled field is missing', async () => {
    const mockResponse = {
      data: {
        form: {
          data: {},
        },
      },
    };
    mockFormRead.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useQRScannerPreference(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnabled).toBe(false);
  });

  it('should default to false when form.data is undefined', async () => {
    const mockResponse = {
      data: {
        form: {},
      },
    };
    mockFormRead.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useQRScannerPreference(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnabled).toBe(false);
  });

  it('should default to false when form is undefined', async () => {
    const mockResponse = {
      data: {},
    };
    mockFormRead.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useQRScannerPreference(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnabled).toBe(false);
  });

  it('should default to false when data is undefined', async () => {
    const mockResponse = {};
    mockFormRead.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useQRScannerPreference(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnabled).toBe(false);
  });

  it('should default to false on API error', async () => {
    mockFormRead.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useQRScannerPreference(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnabled).toBe(false);
  });

  it('should call formRead with correct request parameters', async () => {
    mockFormRead.mockResolvedValue({ data: {} });

    renderHook(() => useQRScannerPreference(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFormRead).toHaveBeenCalledWith({
        type: 'user',
        subType: 'scanner',
        action: 'view',
        component: 'app',
      });
    });
  });

  it('should not fetch when AppInitializer is not initialized', () => {
    vi.mocked(AppInitializer.isInitialized).mockReturnValue(false);

    const { result } = renderHook(() => useQRScannerPreference(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockFormRead).not.toHaveBeenCalled();
  });
});
