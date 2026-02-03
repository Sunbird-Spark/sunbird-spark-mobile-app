import { getClient, ApiResponse } from '../lib/http-client';

export class OrganizationService {
  public async search<T = any>(payload: any): Promise<ApiResponse<T>> {
    try {
      const response = await getClient().post<T>('/org/v2/search', payload, {
        'Content-Type': 'application/json'
      });
      return response;
    } catch (error) {
      console.error('OrganizationService API Error:', error);
      throw error;
    }
  }
}