import { CapacitorReadNativeSetting } from 'capacitor-read-native-setting';

export type NativeConfig = {
  baseUrl: string;
  mobileAppConsumer: string;
  mobileAppKey: string;
  mobileAppSecret: string;
  producerId: string;
};

class NativeConfigService {
  private config: NativeConfig | null = null;

  /**
   * Loads config from native Android resources (generated via gradle resValue)
   * Caches result so we don't hit the plugin multiple times
   */
  async load(): Promise<NativeConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const baseUrl = (await CapacitorReadNativeSetting.read({ key: 'base_url' })).value ?? '';
      const mobileAppConsumer = (await CapacitorReadNativeSetting.read({ key: 'mobile_app_consumer' })).value ?? '';
      const mobileAppKey = (await CapacitorReadNativeSetting.read({ key: 'mobile_app_key' })).value ?? '';
      const mobileAppSecret = (await CapacitorReadNativeSetting.read({ key: 'mobile_app_secret' })).value ?? '';
      const producerId = (await CapacitorReadNativeSetting.read({ key: 'producer_id' })).value ?? '';

      this.config = {
        baseUrl,
        mobileAppConsumer,
        mobileAppKey,
        mobileAppSecret,
        producerId
      };

      return this.config;
    } catch (error) {
      // Fallback to empty values so app doesn't crash
      this.config = {
        baseUrl: '',
        mobileAppConsumer: '',
        mobileAppKey: '',
        mobileAppSecret: '',
        producerId: ''
      };

      return this.config;
    }
  }
}

export const NativeConfigServiceInstance = new NativeConfigService();
