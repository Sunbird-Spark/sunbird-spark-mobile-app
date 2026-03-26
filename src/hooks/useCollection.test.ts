import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// vi.hoisted ensures these are available when the hoisted vi.mock factories run.
const { mockGet, mockNetworkService, mockContentDbService } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockNetworkService: {
    isConnected: vi.fn().mockReturnValue(true),
  },
  mockContentDbService: {
    getByIdentifier: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../lib/http-client', () => ({
  getClient: () => ({ get: mockGet }),
}));

vi.mock('../AppInitializer', () => ({
  AppInitializer: {
    isInitialized: vi.fn(),
  },
}));

vi.mock('../services/network/networkService', () => ({
  networkService: mockNetworkService,
}));

vi.mock('../services/db/ContentDbService', () => ({
  contentDbService: mockContentDbService,
}));

vi.mock('../services/db/DatabaseService', () => ({
  databaseService: {
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useCollection } from './useCollection';
import { AppInitializer } from '../AppInitializer';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AppInitializer.isInitialized).mockReturnValue(true);
    mockNetworkService.isConnected.mockReturnValue(true);
    mockContentDbService.getByIdentifier.mockResolvedValue(null);
  });

  it('should fetch and map collection data successfully', async () => {
    const apiResponse = {
      data: {
        content: {
          identifier: 'do_123',
          name: 'Test Course',
          description: 'A description',
          posterImage: 'https://example.com/img.jpg',
          leafNodesCount: 10,
          primaryCategory: 'Course',
          audience: ['Teachers'],
          trackable: { enabled: 'Yes' },
          userConsent: 'Yes',
          createdBy: 'user-1',
          channel: 'channel-1',
          children: [
            { identifier: 'unit-1', name: 'Unit 1', children: [] },
            { identifier: 'unit-2', name: 'Unit 2', children: [] },
          ],
        },
      },
    };
    mockGet.mockResolvedValue(apiResponse);

    const { result } = renderHook(() => useCollection('do_123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      id: 'do_123',
      title: 'Test Course',
      description: 'A description',
      image: 'https://example.com/img.jpg',
      lessons: 10,
      units: 2,
      audience: ['Teachers'],
      primaryCategory: 'Course',
      trackable: { enabled: 'Yes' },
      userConsent: 'Yes',
      children: apiResponse.data.content.children,
      createdBy: 'user-1',
      channel: 'channel-1',
      hierarchyRoot: apiResponse.data.content,
    });

    expect(mockGet).toHaveBeenCalledWith('/course/v1/hierarchy/do_123');
  });

  it('should return null when collectionId is undefined', async () => {
    const { result } = renderHook(() => useCollection(undefined), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('should return null when API returns no content', async () => {
    mockGet.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useCollection('do_123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it('should not fetch when AppInitializer is not initialized', () => {
    vi.mocked(AppInitializer.isInitialized).mockReturnValue(false);

    const { result } = renderHook(() => useCollection('do_123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('should handle fetch errors by falling back to offline cache', async () => {
    // When API fails, the hook catches the error and falls through to
    // the offline cache (readCachedHierarchy). With no cached data it returns null.
    mockGet.mockRejectedValue(new Error('Network error'));
    mockContentDbService.getByIdentifier.mockResolvedValue(null);

    const { result } = renderHook(() => useCollection('do_123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Falls back to null when both API and cache fail
    expect(result.current.data).toBeNull();
  });

  it('should map defaults when optional fields are missing', async () => {
    const apiResponse = {
      data: {
        content: {
          identifier: 'do_456',
          // name missing → should default to 'Untitled'
          // leafNodesCount missing → should default to 0
          // audience missing → should default to []
          // children missing → should default to []
        },
      },
    };
    mockGet.mockResolvedValue(apiResponse);

    const { result } = renderHook(() => useCollection('do_456'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.title).toBe('Untitled');
    expect(result.current.data?.lessons).toBe(0);
    expect(result.current.data?.audience).toEqual([]);
    expect(result.current.data?.units).toBe(0);
    expect(result.current.data?.children).toEqual([]);
  });
});
