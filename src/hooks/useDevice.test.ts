// src/hooks/useDevice.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDevice } from './useDevice';

// Mock the device service
vi.mock('../services/device', () => ({
  deviceService: {
    init: vi.fn(),
    subscribe: vi.fn(),
    isNativePlatform: vi.fn(),
    refresh: vi.fn(),
  },
}));

import { deviceService } from '../services/device';

describe('useDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and provide device state', async () => {
    const mockDeviceState = {
      deviceId: 'test-device-id',
      platform: 'android',
      model: 'Test Device',
      operatingSystem: 'android',
      osVersion: '12',
      manufacturer: 'Test',
      isVirtual: false,
      webViewVersion: '100.0.0.0',
    };

    vi.mocked(deviceService.init).mockResolvedValue();
    vi.mocked(deviceService.subscribe).mockImplementation((callback) => {
      // Simulate immediate callback with device state
      setTimeout(() => callback(mockDeviceState), 0);
      return vi.fn(); // Return unsubscribe function
    });
    vi.mocked(deviceService.isNativePlatform).mockReturnValue(true);

    const { result } = renderHook(() => useDevice());

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.deviceId).toBe('');

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.deviceState).toEqual(mockDeviceState);
    expect(result.current.deviceId).toBe('test-device-id');
    expect(result.current.platform).toBe('android');
    expect(result.current.isNative).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle initialization errors', async () => {
    const errorMessage = 'Failed to initialize device';
    vi.mocked(deviceService.init).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useDevice());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should cleanup subscription on unmount', async () => {
    const unsubscribeMock = vi.fn();
    vi.mocked(deviceService.init).mockResolvedValue();
    vi.mocked(deviceService.subscribe).mockImplementation((callback) => {
      // Simulate immediate callback
      setTimeout(() => callback({
        deviceId: 'test',
        platform: 'android',
        model: 'test',
        operatingSystem: 'android',
        osVersion: 'test',
        manufacturer: 'test',
        isVirtual: false,
        webViewVersion: 'test',
      }), 0);
      return unsubscribeMock;
    });

    const { unmount } = renderHook(() => useDevice());

    // Wait for the hook to initialize
    await waitFor(() => {
      expect(deviceService.subscribe).toHaveBeenCalled();
    });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('should provide refresh functionality', async () => {
    vi.mocked(deviceService.init).mockResolvedValue();
    vi.mocked(deviceService.subscribe).mockImplementation((callback) => {
      // Simulate immediate callback
      setTimeout(() => callback({
        deviceId: 'test',
        platform: 'android',
        model: 'test',
        operatingSystem: 'android',
        osVersion: 'test',
        manufacturer: 'test',
        isVirtual: false,
        webViewVersion: 'test',
      }), 0);
      return vi.fn();
    });
    vi.mocked(deviceService.refresh).mockResolvedValue();

    const { result } = renderHook(() => useDevice());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.refresh();

    expect(deviceService.refresh).toHaveBeenCalled();
  });
});