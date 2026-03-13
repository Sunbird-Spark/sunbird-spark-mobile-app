import { getClient, ApiResponse } from '../lib/http-client';

export class SystemSettingService {
  public async read<T = any>(id: string): Promise<ApiResponse<T>> {
    try {
      const response = await getClient().get<T>(`/data/v1/system/settings/get/${id}`, {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      });
      return response;
    } catch (error) {
      console.error('SystemSettingService API Error:', error);
      throw error;
    }
  }
}