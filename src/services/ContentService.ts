import { getClient, ApiResponse } from '../lib/http-client';

export class ContentService {
  public async getContent<T = any>(): Promise<ApiResponse<T>> {
    try {
      const response = await getClient().post<T>('/content/v1/search', {
        request: {
          filters: {
            contentType: ['Course'],
            status: ['Live']
          },
          limit: 10
        }
      }, {
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