import { CapacitorHttp } from '@capacitor/core';
import { ApiResponse } from '../lib/http-client';
import { NativeConfigServiceInstance } from './NativeConfigService';

export class SystemSettingService {
  public async read<T = any>(id: string): Promise<ApiResponse<T>> {
    try {
      const config = await NativeConfigServiceInstance.load();
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      
      // Use CapacitorHttp directly with dynamic base URL + learner path
      const response = await CapacitorHttp.get({
        url: `${config.baseUrl}/learner/data/v1/system/settings/get/${id}`,
        headers
      });
      
      // Map response to match expected format
      const result = response.data?.result || response.data;
      return {
        data: result as T,
        status: response.status,
        headers: response.headers as Record<string, any>,
      };
    } catch (error) {
      console.error('SystemSettingService API Error:', error);
      throw error;
    }
  }
}