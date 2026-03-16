import { getClient, ApiResponse } from '../lib/http-client';

export class ContentService {
  public async getContent<T = any>(payload: any): Promise<ApiResponse<T>> {
    try {
      const response = await getClient().post<T>('/content/v1/search', payload, {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      });
      return response;
    } catch (error) {
      console.error('ContentService API Error:', error);
      throw error;
    }
  }
}