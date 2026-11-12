import { HttpService } from './HttpService';
import { NativeConfigServiceInstance } from './NativeConfigService';

const httpService = new HttpService();

interface AppInfoResponse {
  result?: {
    enabledSsoProviders?: unknown;
  };
}

class AppInfoService {
  private enabledSsoProviders: string[] | null = null;

  /**
   * SSO providers enabled on the portal backend (`ENABLED_SSO_PROVIDERS`),
   * lowercased. An empty array means SSO is disabled. Returns `null` when the
   * list is unavailable (no baseUrl, request failed, or an older backend that
   * doesn't send the field). Only successful results are cached, so a failure
   * is retried on the next call.
   */
  async getEnabledSsoProviders(): Promise<string[] | null> {
    if (this.enabledSsoProviders) return this.enabledSsoProviders;

    try {
      const { baseUrl } = await NativeConfigServiceInstance.load();
      if (!baseUrl) return null;

      const response = await httpService.get<AppInfoResponse>(`${baseUrl}/portal/app/v1/info`);
      const providers = response?.result?.enabledSsoProviders;
      if (!Array.isArray(providers)) return null;

      this.enabledSsoProviders = providers.map((p) => String(p).toLowerCase());
      return this.enabledSsoProviders;
    } catch (error) {
      console.error('AppInfoService: Failed to fetch enabled SSO providers:', error);
      return null;
    }
  }
}

export const appInfoService = new AppInfoService();
