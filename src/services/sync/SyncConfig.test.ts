import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkQueueType } from './types';

vi.mock('../NativeConfigService', () => ({
  NativeConfigServiceInstance: {
    load: vi.fn().mockResolvedValue({
      baseUrl: 'https://api.example.com',
      producerId: 'producer-1',
      mobileAppConsumer: 'consumer',
      mobileAppKey: 'key',
      mobileAppSecret: 'secret',
    }),
  },
}));

import { syncConfig } from './SyncConfig';
import { NativeConfigServiceInstance } from '../NativeConfigService';

describe('SyncConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset loaded state between tests
    (syncConfig as any).loaded = false;
    (syncConfig as any).baseUrl = '';
    (syncConfig as any).producerId = '';
    (syncConfig as any).channelId = '';
  });

  describe('load', () => {
    it('loads config from NativeConfigService', async () => {
      await syncConfig.load();
      expect(NativeConfigServiceInstance.load).toHaveBeenCalledOnce();
      expect(syncConfig.getBaseUrl()).toBe('https://api.example.com');
      expect(syncConfig.getProducerId()).toBe('producer-1');
    });

    it('does not reload when already loaded', async () => {
      await syncConfig.load();
      await syncConfig.load();
      expect(NativeConfigServiceInstance.load).toHaveBeenCalledOnce();
    });
  });

  describe('setChannelId / getChannelId', () => {
    it('stores and returns channel id', () => {
      syncConfig.setChannelId('channel-abc');
      expect(syncConfig.getChannelId()).toBe('channel-abc');
    });
  });

  describe('getRequestConfig', () => {
    it('returns telemetry config for TELEMETRY type', () => {
      (syncConfig as any).baseUrl = 'https://api.example.com';
      const config = syncConfig.getRequestConfig(NetworkQueueType.TELEMETRY);
      expect(config.url).toBe('https://api.example.com/api/data/v1/telemetry');
      expect(config.method).toBe('POST');
      expect(config.isGzipped).toBe(true);
    });

    it('returns course state config for COURSE_PROGRESS type', () => {
      (syncConfig as any).baseUrl = 'https://api.example.com';
      const config = syncConfig.getRequestConfig(NetworkQueueType.COURSE_PROGRESS);
      expect(config.url).toBe('https://api.example.com/api/course/v1/content/state/update');
      expect(config.method).toBe('PATCH');
      expect(config.isGzipped).toBe(false);
    });

    it('returns course state config for COURSE_ASSESMENT type', () => {
      (syncConfig as any).baseUrl = 'https://api.example.com';
      const config = syncConfig.getRequestConfig(NetworkQueueType.COURSE_ASSESMENT);
      expect(config.url).toBe('https://api.example.com/api/course/v1/content/state/update');
      expect(config.method).toBe('PATCH');
      expect(config.isGzipped).toBe(false);
    });
  });

  describe('threshold and batch size', () => {
    it('returns sync threshold of 200', () => {
      expect(syncConfig.getSyncThreshold()).toBe(200);
    });

    it('returns sync batch size of 100', () => {
      expect(syncConfig.getSyncBatchSize()).toBe(100);
    });
  });
});
