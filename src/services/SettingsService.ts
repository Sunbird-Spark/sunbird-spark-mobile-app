import { App } from '@capacitor/app';
import { KVKey, keyValueDbService, type KeyValueDbService } from './db/KeyValueDbService';

export interface SettingOption {
  label: string;
  value: string;
}

export const SYNC_DATA_OPTIONS = [
  { label: 'OFF',    value: 'off'    },
  { label: 'WIFI',   value: 'wifi'   },
  { label: 'ALWAYS', value: 'always' },
] as const;

export const DOWNLOAD_CONTENT_OPTIONS = [
  { label: 'WIFI',   value: 'wifi'   },
  { label: 'ALWAYS', value: 'always' },
] as const;

export type SyncDataValue = typeof SYNC_DATA_OPTIONS[number]['value'];
export type DownloadContentValue = typeof DOWNLOAD_CONTENT_OPTIONS[number]['value'];

const SYNC_DATA_DEFAULT: SyncDataValue = 'wifi';
const DOWNLOAD_CONTENT_DEFAULT: DownloadContentValue = 'always';

export class SettingsService {
  constructor(private kv: KeyValueDbService) {}

  async getSyncData(): Promise<SyncDataValue> {
    const stored = await this.kv.get(KVKey.TELEMETRY_SYNC_NETWORK_TYPE);
    return SYNC_DATA_OPTIONS.some(o => o.value === stored) ? (stored as SyncDataValue) : SYNC_DATA_DEFAULT;
  }

  async setSyncData(value: SyncDataValue): Promise<void> {
    await this.kv.set(KVKey.TELEMETRY_SYNC_NETWORK_TYPE, value);
  }

  async getDownloadContent(): Promise<DownloadContentValue> {
    const stored = await this.kv.get(KVKey.CONTENT_DOWNLOAD_NETWORK_TYPE);
    return DOWNLOAD_CONTENT_OPTIONS.some(o => o.value === stored) ? (stored as DownloadContentValue) : DOWNLOAD_CONTENT_DEFAULT;
  }

  async setDownloadContent(value: DownloadContentValue): Promise<void> {
    await this.kv.set(KVKey.CONTENT_DOWNLOAD_NETWORK_TYPE, value);
  }

  async getAppVersion(): Promise<{ version: string; build: string }> {
    try {
      const info = await App.getInfo();
      return { version: info.version, build: info.build };
    } catch {
      return { version: '', build: '' };
    }
  }
}

export const settingsService = new SettingsService(keyValueDbService);
