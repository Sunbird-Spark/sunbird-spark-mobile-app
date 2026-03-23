import { App } from '@capacitor/app';
import { KVKey, keyValueDbService, type KeyValueDbService } from './db/KeyValueDbService';

export interface SettingOption {
  label: string;
  value: string;
}

export const SYNC_DATA_OPTIONS: SettingOption[] = [
  { label: 'OFF',    value: 'off'    },
  { label: 'WIFI',   value: 'wifi'   },
  { label: 'ALWAYS', value: 'always' },
];

export const DOWNLOAD_CONTENT_OPTIONS: SettingOption[] = [
  { label: 'WIFI',   value: 'wifi'   },
  { label: 'ALWAYS', value: 'always' },
];

const SYNC_DATA_DEFAULT     = 'wifi';
const DOWNLOAD_CONTENT_DEFAULT = 'always';

export class SettingsService {
  constructor(private kv: KeyValueDbService) {}

  async getSyncData(): Promise<string> {
    const stored = await this.kv.get(KVKey.SYNC_DATA);
    return stored ?? SYNC_DATA_DEFAULT;
  }

  async setSyncData(value: string): Promise<void> {
    await this.kv.set(KVKey.SYNC_DATA, value);
  }

  async getDownloadContent(): Promise<string> {
    const stored = await this.kv.get(KVKey.DOWNLOAD_CONTENT);
    return stored ?? DOWNLOAD_CONTENT_DEFAULT;
  }

  async setDownloadContent(value: string): Promise<void> {
    await this.kv.set(KVKey.DOWNLOAD_CONTENT, value);
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
