interface SystemSetting {
  id: string;
  field: string;
  value: string;
}

interface SystemSettingsResponse {
  id: string;
  ver: string;
  ts: string;
  params: {
    resmsgid: string | null;
    msgid: string;
    err: string | null;
    status: string;
    errmsg?: string | null;
  };
  responseCode: string;
  result: {
    response: SystemSetting;
  };
}

export enum SystemSettingsIds {
  GOOGLE_CLIENT_ID = 'googleClientId',
}

class SystemSettingsService {
  private cache: Map<string, SystemSetting> = new Map();
  private baseUrl: string;
  private channelId: string;

  constructor() {
    // Detect base URL from window location or use fallback
    if (typeof window !== 'undefined') {
      this.baseUrl = window.location.origin;
    } else {
      this.baseUrl = '';
    }
    
    // Default channel ID
    this.channelId = 'sunbird';
  }

  /**
   * Get a specific system setting by ID
   * Calls: GET /api/data/v1/system/settings/get/{settingId}
   */
  async getSystemSettings(params: { id: string }): Promise<SystemSetting> {
    // Check cache first
    if (this.cache.has(params.id)) {
      return this.cache.get(params.id)!;
    }

    try {
      const url = `${this.baseUrl}/api/data/v1/system/settings/get/${params.id}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Channel-Id': this.channelId,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SystemSettingsResponse = await response.json();

      // Check if response is successful
      if (data.params.status !== 'success') {
        throw new Error(data.params.errmsg || 'Failed to fetch system settings');
      }

      const setting = data.result.response;

      // Cache the result
      this.cache.set(params.id, setting);
      
      return setting;
    } catch (error) {
      console.error(`Error fetching system setting for id: ${params.id}`, error);
      throw new Error(`Unable to fetch system setting for id: ${params.id}`);
    }
  }

  /**
   * Get Google Client ID
   * @returns Promise<string> - The Google Client ID value
   */
  async getGoogleClientId(): Promise<string> {
    const setting = await this.getSystemSettings({ id: SystemSettingsIds.GOOGLE_CLIENT_ID });
    return setting.value;
  }

  clearCache() {
    this.cache.clear();
  }
}

export const systemSettingsService = new SystemSettingsService();
