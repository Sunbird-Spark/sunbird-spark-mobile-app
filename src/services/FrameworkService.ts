import { getClient, ApiResponse } from '../lib/http-client';
import { buildOfflineResponse } from '../lib/http-client/offlineResponse';
import { configDbService } from './db/ConfigDbService';
import { networkService } from './network/networkService';

export class FrameworkService {
  public async read<T = any>(id: string): Promise<ApiResponse<T>> {
    const key = `cache:framework_${id}`;

    if (!networkService.isConnected()) {
      return this.readFromDb<T>(key);
    }

    try {
      const response = await getClient().get<T>(`/framework/v1/read/${id}`, {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      });

      try {
        await configDbService.set(key, 'framework', response.data as object);
      } catch (err) {
        console.warn('[FrameworkService] Failed to cache framework to SQLite:', err);
      }

      return response;
    } catch {
      return this.readFromDb<T>(key);
    }
  }

  private async readFromDb<T>(key: string): Promise<ApiResponse<T>> {
    const entry = await configDbService.get(key);
    return buildOfflineResponse<T>((entry?.data ?? null) as T);
  }
}
