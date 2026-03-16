import { getClient, ApiResponse } from '../lib/http-client';

export class ChannelService {
  public async read<T = any>(id: string): Promise<ApiResponse<T>> {
    try {
      const response = await getClient().get<T>(`/channel/v1/read/${id}`, {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      });
      return response;
    } catch (error) {
      console.error('ChannelService API Error:', error);
      throw error;
    }
  }
}