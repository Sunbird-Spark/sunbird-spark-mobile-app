import { NativeConfigServiceInstance } from '../NativeConfigService';
import { NetworkQueueType } from './types';

interface SyncRequestConfig {
  url:       string;
  method:    'POST' | 'PATCH';
  isGzipped: boolean;
}

class SyncConfig {
  private baseUrl    = '';
  private producerId = '';
  private channelId  = '';
  private loaded     = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    const config = await NativeConfigServiceInstance.load();
    this.baseUrl    = config.baseUrl;
    this.producerId = config.producerId;
    this.loaded = true;
  }

  setChannelId(channelId: string): void {
    this.channelId = channelId;
  }

  getRequestConfig(type: NetworkQueueType): SyncRequestConfig {
    switch (type) {
      case NetworkQueueType.TELEMETRY:
        return {
          url:       this.baseUrl + '/api/data/v1/telemetry',
          method:    'POST',
          isGzipped: true,
        };
      case NetworkQueueType.COURSE_PROGRESS:
      case NetworkQueueType.COURSE_ASSESMENT:
        return {
          url:       this.baseUrl + '/api/course/v1/content/state/update',
          method:    'PATCH',
          isGzipped: false,
        };
      default: {
        const _exhaustive: never = type;
        throw new Error(`[SyncConfig] No request config for NetworkQueueType: ${_exhaustive}`);
      }
    }
  }

  getSyncThreshold(): number { return 200; }
  getSyncBatchSize(): number  { return 100; }
  getProducerId(): string     { return this.producerId; }
  getChannelId(): string      { return this.channelId; }
  getBaseUrl(): string        { return this.baseUrl; }
}

export const syncConfig = new SyncConfig();
