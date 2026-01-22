import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkState } from '../services/network/networkService';

const mockInit = vi.fn();
const mockSubscribe = vi.fn();

vi.mock('../services/network/networkService', () => ({
  networkService: {
    init: (...args: any[]) => mockInit(...args),
    subscribe: (listener: any) => mockSubscribe(listener),
  },
}));

import React from 'react';
import { NetworkProvider, useNetwork } from './NetworkProvider';

describe('NetworkProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockInit.mockResolvedValue(undefined);

    // Subscribe immediately calls the listener with current state
    mockSubscribe.mockImplementation((listener) => {
      listener({
        connected: true,
        connectionType: 'wifi',
      } as NetworkState);
      return vi.fn();
    });
  });

  describe('Provider initialization', () => {
    it('should initialize network service on mount', async () => {
      renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      await waitFor(() => {
        expect(mockInit).toHaveBeenCalledTimes(1);
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

    it('should provide initial network state', async () => {
      const { result } = renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      // Wait for subscription to provide state
      await waitFor(() => {
        expect(result.current.status).toEqual({
          connected: true,
          connectionType: 'wifi',
        });
      });
    });

    it('should calculate isOffline correctly', async () => {
      // Set up mock to return offline state
      mockSubscribe.mockImplementationOnce((listener) => {
        listener({
          connected: false,
          connectionType: 'none',
        } as NetworkState);
        return vi.fn();
      });

      const { result } = renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      await waitFor(() => {
        expect(result.current.isOffline).toBe(true);
      });
    });
  });

  describe('Network state updates', () => {
    it('should update state when network changes', async () => {
      let subscriberCallback: ((state: NetworkState) => void) | null = null;

      mockSubscribe.mockImplementation((listener) => {
        subscriberCallback = listener;
        setTimeout(() => listener({
          connected: true,
          connectionType: 'wifi',
        } as NetworkState), 0);
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
        setTimeout(() => listener({
          connected: true,
          connectionType: 'wifi',
        } as NetworkState), 0);
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

  describe('useNetwork hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useNetwork());
      }).toThrow('useNetwork must be used inside <NetworkProvider>');

      consoleError.mockRestore();
    });

    it('should provide all required context values', async () => {
      const { result } = renderHook(() => useNetwork(), {
        wrapper: NetworkProvider,
      });

      await waitFor(() => {
        expect(result.current).toHaveProperty('status');
        expect(result.current).toHaveProperty('isOffline');
        expect(typeof result.current.isOffline).toBe('boolean');
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle online to offline flow', async () => {
      let subscriberCallback: ((state: NetworkState) => void) | null = null;

      mockSubscribe.mockImplementation((listener) => {
        subscriberCallback = listener;
        setTimeout(() => listener({
          connected: true,
          connectionType: 'wifi',
        } as NetworkState), 0);
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
