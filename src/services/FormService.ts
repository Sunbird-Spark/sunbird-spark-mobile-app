import { getClient, ApiResponse } from '../lib/http-client';

export class FormService {
  public async read<T = any>(payload: any): Promise<ApiResponse<T>> {
    try {
      const response = await getClient().post<T>('/data/v1/form/read', payload, {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      });
      return response;
    } catch (error) {
      console.error('FormService API Error:', error);
      throw error;
    }
  }
}
