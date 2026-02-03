import { getClient, ApiResponse } from '../lib/http-client';

export class FrameworkService {
  public async read<T = any>(id: string): Promise<ApiResponse<T>> {
    try {
      const response = await getClient().get<T>(`/framework/v1/read/${id}`, {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      });
      return response;
    } catch (error) {
      console.error('FrameworkService API Error:', error);
      throw error;
    }
  }
}