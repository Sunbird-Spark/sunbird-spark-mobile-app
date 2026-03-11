// src/services/device/deviceService.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deviceService, type DeviceState } from './deviceService';

// Mock Capacitor modules
vi.mock('@capacitor/device', () => ({
  Device: {
    getInfo: vi.fn(),
    getId: vi.fn(),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(),
    isNativePlatform: vi.fn(),
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

describe('DeviceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset service state properly
    (deviceService as unknown).initialized = false;
    (deviceService as unknown).listeners.clear();
    (deviceService as unknown).state = {
      deviceId: '',
      platform: 'unknown',
      model: 'unknown',
      operatingSystem: 'unknown',
      osVersion: 'unknown',
      manufacturer: 'unknown',
      isVirtual: false,
      webViewVersion: 'unknown',
    };
  });

  describe('init', () => {
    it('should initialize device state successfully on native platform', async () => {
      const mockDeviceInfo = {
        platform: 'android',
        model: 'Pixel 6',
        operatingSystem: 'android',
        osVersion: '12',
        manufacturer: 'Google',
        isVirtual: false,
        webViewVersion: '98.0.4758.101',
      };

      const mockDeviceId = {
        identifier: 'test-device-id-123',
        uuid: 'test-uuid-456',
      };

      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Device.getInfo).mockResolvedValue(mockDeviceInfo);
      vi.mocked(Device.getId).mockResolvedValue(mockDeviceId);

      await deviceService.init();
      const state = await deviceService.getState();

      expect(state).toEqual({
        deviceId: 'test-device-id-123',
        platform: 'android',
        model: 'Pixel 6',
        operatingSystem: 'android',
        osVersion: '12',
        manufacturer: 'Google',
        isVirtual: false,
        webViewVersion: '98.0.4758.101',
      });
    });

    it('should handle non-native platform gracefully', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');

      await deviceService.init();
      const state = await deviceService.getState();

      expect(state.platform).toBe('web');
      expect(state.deviceId).toBe('');
    });

    it('should handle errors gracefully on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Device.getInfo).mockRejectedValue(new Error('Device info failed'));
      vi.mocked(Device.getId).mockRejectedValue(new Error('Device ID failed'));
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await deviceService.init();
      const state = await deviceService.getState();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize device service:',
        expect.any(Error)
      );
      expect(state.platform).toBe('android');
      expect(state.deviceId).toBe('unknown');

      consoleSpy.mockRestore();
    });

    it('should not reinitialize if already initialized', async () => {
      const mockDeviceInfo = {
        platform: 'android',
        model: 'Test Device',
        operatingSystem: 'android',
        osVersion: '11',
        manufacturer: 'Test',
        isVirtual: false,
        webViewVersion: '90.0.0.0',
      };

      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Device.getInfo).mockResolvedValue(mockDeviceInfo);
      vi.mocked(Device.getId).mockResolvedValue({ identifier: 'test-id' });

      await deviceService.init();
      await deviceService.init(); // Second call

      expect(Device.getInfo).toHaveBeenCalledTimes(1);
      expect(Device.getId).toHaveBeenCalledTimes(1);
    });

    it('should handle empty device identifier gracefully', async () => {
      const mockDeviceInfo = {
        platform: 'ios',
        model: 'iPhone 13',
        operatingSystem: 'ios',
        osVersion: '15.0',
        manufacturer: 'Apple',
        isVirtual: false,
        webViewVersion: '15.0',
      };

      const mockDeviceId = {
        identifier: '', // Empty identifier
      };

      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Device.getInfo).mockResolvedValue(mockDeviceInfo);
      vi.mocked(Device.getId).mockResolvedValue(mockDeviceId);

      await deviceService.init();
      const state = await deviceService.getState();

      expect(state.deviceId).toBe('unknown');
    });
  });

  describe('getDeviceIdOnly', () => {
    it('should return device ID only', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Device.getId).mockResolvedValue({ identifier: 'test-device-id' });
      vi.mocked(Device.getInfo).mockResolvedValue({
        platform: 'android',
        model: 'Test',
        operatingSystem: 'android',
        osVersion: '11',
        manufacturer: 'Test',
        isVirtual: false,
        webViewVersion: '90.0.0.0',
      });

      const deviceId = await deviceService.getDeviceIdOnly();
      expect(deviceId).toBe('test-device-id');
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers of state changes', async () => {
      const listener = vi.fn();
      const unsubscribe = deviceService.subscribe(listener);

      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Device.getInfo).mockResolvedValue({
        platform: 'android',
        model: 'Test',
        operatingSystem: 'android',
        osVersion: '11',
        manufacturer: 'Test',
        isVirtual: false,
        webViewVersion: '90.0.0.0',
      });
      vi.mocked(Device.getId).mockResolvedValue({ identifier: 'test-id' });

      await deviceService.init();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'test-id',
          platform: 'android',
        })
      );

      unsubscribe();
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = deviceService.subscribe(listener);

      unsubscribe();

      // Verify listener was removed (internal state check)
      expect((deviceService as unknown).listeners.has(listener)).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should return platform info', () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      expect(deviceService.getPlatform()).toBe('ios');
      expect(deviceService.isNativePlatform()).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should force reinitialize device state', async () => {
      // First initialization
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Device.getInfo).mockResolvedValue({
        platform: 'android',
        model: 'Old Device',
        operatingSystem: 'android',
        osVersion: '10',
        manufacturer: 'Old',
        isVirtual: false,
        webViewVersion: '80.0.0.0',
      });
      vi.mocked(Device.getId).mockResolvedValue({ identifier: 'old-id' });

      await deviceService.init();
      let state = await deviceService.getState();
      expect(state.model).toBe('Old Device');

      // Refresh with new data
      vi.mocked(Device.getInfo).mockResolvedValue({
        platform: 'android',
        model: 'New Device',
        operatingSystem: 'android',
        osVersion: '12',
        manufacturer: 'New',
        isVirtual: false,
        webViewVersion: '100.0.0.0',
      });
      vi.mocked(Device.getId).mockResolvedValue({ identifier: 'new-id' });

      await deviceService.refresh();
      state = await deviceService.getState();
      expect(state.model).toBe('New Device');
      expect(state.deviceId).toBe('new-id');
    });
  });

  describe('getHashedDeviceId', () => {
    it('should return hashed device ID for native platforms', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Device.getInfo).mockResolvedValue({
        platform: 'android',
        model: 'Test',
        operatingSystem: 'android',
        osVersion: '11',
        manufacturer: 'Test',
        isVirtual: false,
        webViewVersion: '90.0.0.0',
      });
      vi.mocked(Device.getId).mockResolvedValue({ identifier: 'test-device-id' });

      const hashedId = await deviceService.getHashedDeviceId();
      expect(hashedId).toBeTruthy();
      expect(typeof hashedId).toBe('string');
      expect(hashedId.length).toBe(40); // SHA1 hash length
    });

    it('should generate and persist web device ID for web platforms', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
      
      let storedWebDeviceId: string | null = null;
      
      // Mock Preferences to simulate actual storage behavior
      vi.mocked(Preferences.get).mockImplementation(async () => {
        return { value: storedWebDeviceId };
      });
      
      vi.mocked(Preferences.set).mockImplementation(async ({ value }) => {
        storedWebDeviceId = value;
      });

      const hashedId1 = await deviceService.getHashedDeviceId();
      const hashedId2 = await deviceService.getHashedDeviceId();

      expect(hashedId1).toBeTruthy();
      expect(hashedId1).toBe(hashedId2); // Should be consistent due to storage
      expect(Preferences.set).toHaveBeenCalledTimes(1); // Should only set once
      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'web_device_id',
        value: expect.stringMatching(/^web-device-\d+-[a-z0-9]+$/),
      });
    });

    it('should reuse existing web device ID', async () => {
      const existingWebId = 'web-device-1234567890-abcdef123';
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
      vi.mocked(Preferences.get).mockResolvedValue({ value: existingWebId });

      const hashedId = await deviceService.getHashedDeviceId();
      
      expect(hashedId).toBeTruthy();
      expect(Preferences.set).not.toHaveBeenCalled(); // Should not create new ID
    });

    it('should handle preferences storage errors gracefully', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
      vi.mocked(Preferences.get).mockRejectedValue(new Error('Storage error'));
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const hashedId = await deviceService.getHashedDeviceId();
      
      expect(hashedId).toBeTruthy();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist web device ID, using session-only ID:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('clearWebDeviceId', () => {
    it('should clear web device ID on web platform', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
      vi.mocked(Preferences.remove).mockResolvedValue();
      
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      await deviceService.clearWebDeviceId();

      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'web_device_id' });
      expect(consoleSpy).toHaveBeenCalledWith('Web device ID cleared');

      consoleSpy.mockRestore();
    });

    it('should not clear web device ID on native platforms', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');

      await deviceService.clearWebDeviceId();

      expect(Preferences.remove).not.toHaveBeenCalled();
    });

    it('should handle clear errors gracefully', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
      vi.mocked(Preferences.remove).mockRejectedValue(new Error('Remove failed'));
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await deviceService.clearWebDeviceId();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to clear web device ID:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});