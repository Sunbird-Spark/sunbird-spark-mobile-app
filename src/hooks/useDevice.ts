// src/hooks/useDevice.ts
import { useEffect, useState } from 'react';
import { deviceService, type DeviceState } from '../services/device';

/**
 * React hook to access device information
 * Automatically subscribes to device state changes
 */
export const useDevice = () => {
  const [deviceState, setDeviceState] = useState<DeviceState>({
    deviceId: '',
    platform: 'unknown',
    model: 'unknown',
    operatingSystem: 'unknown',
    osVersion: 'unknown',
    manufacturer: 'unknown',
    isVirtual: false,
    webViewVersion: 'unknown',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeDevice = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize the service
        await deviceService.init();

        // Subscribe to state changes
        unsubscribe = deviceService.subscribe((state) => {
          setDeviceState(state);
          setIsLoading(false);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize device service');
        setIsLoading(false);
      }
    };

    initializeDevice();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return {
    deviceState,
    isLoading,
    error,
    // Convenience getters
    deviceId: deviceState.deviceId,
    platform: deviceState.platform,
    isNative: deviceService.isNativePlatform(),
    // Utility methods
    refresh: () => deviceService.refresh(),
  };
};