import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkState } from '../services/network/networkService';

const mockStart = vi.fn();
const mockGetSnapshot = vi.fn();
const mockRefresh = vi.fn();
const mockSubscribe = vi.fn();

vi.mock('../services/network/networkService', () => ({
  networkService: {
    start: (...args: any[]) => mockStart(...args),
    getSnapshot: () => mockGetSnapshot(),
    refresh: (...args: any[]) => mockRefresh(...args),
    subscribe: (listener: any) => mockSubscribe(listener),
  },
}));

import React from 'react';
import { NetworkProvider, useNetwork } from './NetworkProvider';

describe('NetworkProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSnapshot.mockReturnValue({
      connected: true,
      connectionType: 'wifi',
    } as NetworkState);

    mockStart.mockResolvedValue(undefined);
    mockRefresh.mockResolvedValue({
      connected: true,
      connectionType: 'wifi',
    } as NetworkState);

    mockSubscribe.mockImplementation((listener) => {
      listener(mockGetSnapshot());
      return vi.fn();
    });
  });

  describe('Provider initialization', () => {
    it('should start network service on mount', async () => {
      renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalledTimes(1);
      });
    });

    it('should subscribe to network service', async () => {
      renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function));
      });
    });

    it('should provide initial network state', () => {
      const { result } = renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      expect(result.current.status).toEqual({
        connected: true,
        connectionType: 'wifi',
      });
    });

    it('should calculate isOffline correctly', () => {
      mockGetSnapshot.mockReturnValue({
        connected: false,
        connectionType: 'none',
      });

      const { result } = renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      expect(result.current.isOffline).toBe(true);
    });
  });

  describe('Network state updates', () => {
    it('should update state when network changes', async () => {
      let subscriberCallback: ((state: NetworkState) => void) | null = null;

      mockSubscribe.mockImplementation((listener) => {
        subscriberCallback = listener;
        setTimeout(() => listener(mockGetSnapshot()), 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      await waitFor(() => {
        expect(result.current.status.connected).toBe(true);
      });

      act(() => {
        subscriberCallback?.({
          connected: false,
          connectionType: 'none',
        });
      });

      expect(result.current.status.connected).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });

    it('should handle multiple network state changes', async () => {
      let subscriberCallback: ((state: NetworkState) => void) | null = null;

      mockSubscribe.mockImplementation((listener) => {
        subscriberCallback = listener;
        setTimeout(() => listener(mockGetSnapshot()), 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      await waitFor(() => {
        expect(result.current.status.connected).toBe(true);
      });

      act(() => {
        subscriberCallback?.({
          connected: true,
          connectionType: 'cellular',
        });
      });

      expect(result.current.status.connectionType).toBe('cellular');

      act(() => {
        subscriberCallback?.({
          connected: false,
          connectionType: 'none',
        });
      });

      expect(result.current.isOffline).toBe(true);
    });
  });

  describe('refreshStatus', () => {
    it('should call networkService.refresh', async () => {
      const { result } = renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should update state after refresh', async () => {
      let subscriberCallback: ((state: NetworkState) => void) | null = null;

      mockSubscribe.mockImplementation((listener) => {
        subscriberCallback = listener;
        setTimeout(() => listener(mockGetSnapshot()), 0);
        return vi.fn();
      });

      mockRefresh.mockImplementation(async () => {
        const newState: NetworkState = {
          connected: false,
          connectionType: 'none',
        };
        subscriberCallback?.(newState);
        return newState;
      });

      const { result } = renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      await waitFor(() => {
        expect(result.current.status.connected).toBe(true);
      });

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.status.connected).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe when provider unmounts', async () => {
      const unsubscribe = vi.fn();
      mockSubscribe.mockImplementation((listener) => {
        listener(mockGetSnapshot());
        return unsubscribe;
      });

      const { unmount } = renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(unsubscribe).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('useNetwork hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useNetwork());
      }).toThrow('useNetwork must be used inside <NetworkProvider>');

      consoleError.mockRestore();
    });

    it('should provide all required context values', () => {
      const { result } = renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      expect(result.current).toHaveProperty('status');
      expect(result.current).toHaveProperty('isOffline');
      expect(result.current).toHaveProperty('refreshStatus');
      expect(typeof result.current.refreshStatus).toBe('function');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle online to offline flow', async () => {
      let subscriberCallback: ((state: NetworkState) => void) | null = null;

      mockSubscribe.mockImplementation((listener) => {
        subscriberCallback = listener;
        setTimeout(() => listener(mockGetSnapshot()), 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      await waitFor(() => {
        expect(result.current.status.connected).toBe(true);
      });

      act(() => {
        subscriberCallback?.({
          connected: false,
          connectionType: 'none',
        });
      });

      expect(result.current.isOffline).toBe(true);

      act(() => {
        subscriberCallback?.({
          connected: true,
          connectionType: 'wifi',
        });
      });

      expect(result.current.isOffline).toBe(false);
    });
  });
});
