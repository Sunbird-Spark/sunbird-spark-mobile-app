import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NativeConfigServiceInstance } from './NativeConfigService';
import { CapacitorReadNativeSetting } from 'capacitor-read-native-setting';

// Mock dependencies
vi.mock('capacitor-read-native-setting', () => ({
  CapacitorReadNativeSetting: {
    read: vi.fn(),
  },
}));

describe('NativeConfigService', () => {
  let mockReadNativeSetting: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadNativeSetting = CapacitorReadNativeSetting;
    
    // Reset cached config
    (NativeConfigServiceInstance as any).config = null;
    
    // Reset the mock completely
    mockReadNativeSetting.read.mockReset();
  });

  describe('load', () => {
    it('should return cached config if already loaded', async () => {
      const cachedConfig = {
        baseUrl: 'cached-url',
        mobileAppConsumer: 'cached-consumer',
        mobileAppKey: 'cached-key',
        mobileAppSecret: 'cached-secret',
        producerId: 'cached-producer',
        appVersion: 'cached-version',
      };

      (NativeConfigServiceInstance as any).config = cachedConfig;

      const result = await NativeConfigServiceInstance.load();
      expect(result).toBe(cachedConfig);
      expect(mockReadNativeSetting.read).not.toHaveBeenCalled();
    });

    it('should read native settings on native platform', async () => {
      mockReadNativeSetting.read
        .mockResolvedValueOnce({ value: 'https://api.sunbird.org' })
        .mockResolvedValueOnce({ value: 'mobile_device' })
        .mockResolvedValueOnce({ value: 'mobile_app' })
        .mockResolvedValueOnce({ value: 'secret123' })
        .mockResolvedValueOnce({ value: 'sunbird.app' })
        .mockResolvedValueOnce({ value: '1.0.0' });

      const result = await NativeConfigServiceInstance.load();

      expect(result).toEqual({
        baseUrl: 'https://api.sunbird.org',
        mobileAppConsumer: 'mobile_device',
        mobileAppKey: 'mobile_app',
        mobileAppSecret: 'secret123',
        producerId: 'sunbird.app',
        appVersion: '1.0.0',
      });

      expect(mockReadNativeSetting.read).toHaveBeenCalledTimes(6);
      expect(mockReadNativeSetting.read).toHaveBeenCalledWith({ key: 'base_url' });
      expect(mockReadNativeSetting.read).toHaveBeenCalledWith({ key: 'mobile_app_consumer' });
      expect(mockReadNativeSetting.read).toHaveBeenCalledWith({ key: 'mobile_app_key' });
      expect(mockReadNativeSetting.read).toHaveBeenCalledWith({ key: 'mobile_app_secret' });
      expect(mockReadNativeSetting.read).toHaveBeenCalledWith({ key: 'producer_id' });
      expect(mockReadNativeSetting.read).toHaveBeenCalledWith({ key: 'app_version' });
    });

    it('should handle null values from native settings', async () => {
      mockReadNativeSetting.read
        .mockResolvedValueOnce({ value: null })
        .mockResolvedValueOnce({ value: null })
        .mockResolvedValueOnce({ value: null })
        .mockResolvedValueOnce({ value: null })
        .mockResolvedValueOnce({ value: null })
        .mockResolvedValueOnce({ value: null });

      const result = await NativeConfigServiceInstance.load();

      expect(result).toEqual({
        baseUrl: '',
        mobileAppConsumer: '',
        mobileAppKey: '',
        mobileAppSecret: '',
        producerId: '',
        appVersion: '',
      });
    });

    it('should handle undefined values from native settings', async () => {
      mockReadNativeSetting.read
        .mockResolvedValueOnce({ value: undefined })
        .mockResolvedValueOnce({ value: undefined })
        .mockResolvedValueOnce({ value: undefined })
        .mockResolvedValueOnce({ value: undefined })
        .mockResolvedValueOnce({ value: undefined })
        .mockResolvedValueOnce({ value: undefined });

      const result = await NativeConfigServiceInstance.load();

      expect(result).toEqual({
        baseUrl: '',
        mobileAppConsumer: '',
        mobileAppKey: '',
        mobileAppSecret: '',
        producerId: '',
        appVersion: '',
      });
    });

    it('should return fallback config when native reading fails', async () => {
      mockReadNativeSetting.read.mockRejectedValue(new Error('Native read failed'));

      const result = await NativeConfigServiceInstance.load();

      expect(result).toEqual({
        baseUrl: '',
        mobileAppConsumer: '',
        mobileAppKey: '',
        mobileAppSecret: '',
        producerId: '',
        appVersion: '',
      });
    });

    it('should cache config after first load', async () => {
      mockReadNativeSetting.read
        .mockResolvedValueOnce({ value: 'https://api.sunbird.org' })
        .mockResolvedValueOnce({ value: 'mobile_device' })
        .mockResolvedValueOnce({ value: 'mobile_app' })
        .mockResolvedValueOnce({ value: 'secret123' })
        .mockResolvedValueOnce({ value: 'sunbird.app' })
        .mockResolvedValueOnce({ value: '1.0.0' });

      const result1 = await NativeConfigServiceInstance.load();
      const result2 = await NativeConfigServiceInstance.load();

      expect(result1).toBe(result2);
      expect(mockReadNativeSetting.read).toHaveBeenCalledTimes(6);
    });

    it('should handle iOS platform', async () => {
      mockReadNativeSetting.read
        .mockResolvedValueOnce({ value: 'https://ios.api.sunbird.org' })
        .mockResolvedValueOnce({ value: 'ios_consumer' })
        .mockResolvedValueOnce({ value: 'ios_key' })
        .mockResolvedValueOnce({ value: 'ios_secret' })
        .mockResolvedValueOnce({ value: 'ios.producer' })
        .mockResolvedValueOnce({ value: '2.0.0' });

      const result = await NativeConfigServiceInstance.load();

      expect(result).toEqual({
        baseUrl: 'https://ios.api.sunbird.org',
        mobileAppConsumer: 'ios_consumer',
        mobileAppKey: 'ios_key',
        mobileAppSecret: 'ios_secret',
        producerId: 'ios.producer',
        appVersion: '2.0.0',
      });
    });

    it('should handle partial native setting failures', async () => {
      mockReadNativeSetting.read
        .mockResolvedValueOnce({ value: 'https://api.sunbird.org' })
        .mockRejectedValueOnce(new Error('Failed to read consumer'))
        .mockResolvedValueOnce({ value: 'mobile_app' })
        .mockResolvedValueOnce({ value: 'secret123' })
        .mockResolvedValueOnce({ value: 'sunbird.app' })
        .mockResolvedValueOnce({ value: '1.0.0' });

      const result = await NativeConfigServiceInstance.load();

      expect(result).toEqual({
        baseUrl: '',
        mobileAppConsumer: '',
        mobileAppKey: '',
        mobileAppSecret: '',
        producerId: '',
        appVersion: '',
      });
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(NativeConfigServiceInstance).toBeDefined();
      expect(typeof NativeConfigServiceInstance.load).toBe('function');
    });

    it('should maintain state across calls', async () => {
      // First, ensure we start with a clean state
      (NativeConfigServiceInstance as any).config = null;

      mockReadNativeSetting.read
        .mockResolvedValueOnce({ value: 'https://api.sunbird.org' })
        .mockResolvedValueOnce({ value: 'mobile_device' })
        .mockResolvedValueOnce({ value: 'mobile_app' })
        .mockResolvedValueOnce({ value: 'secret123' })
        .mockResolvedValueOnce({ value: 'sunbird.app' })
        .mockResolvedValueOnce({ value: '1.0.0' });

      await NativeConfigServiceInstance.load();
      const config = (NativeConfigServiceInstance as any).config;

      expect(config).toBeDefined();
      expect(config.baseUrl).toBe('https://api.sunbird.org');
    });
  });
});