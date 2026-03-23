import { getClient, ApiResponse } from '../lib/http-client';
import { buildOfflineResponse } from '../lib/http-client/offlineResponse';
import { FormReadRequest, FormReadResponse } from '../types/formTypes';
import { configDbService } from './db/ConfigDbService';
import { networkService } from './network/networkService';

export class FormService {
  public async formRead(
    request: FormReadRequest
  ): Promise<ApiResponse<FormReadResponse>> {
    const key = `form_${request.type}_${request.subType ?? ''}_${request.action}`;

    if (!networkService.isConnected()) {
      return this.readFromDb(key);
    }

    try {
      const response = await getClient().post<FormReadResponse>('/data/v1/form/read', {
        request: {
          type: request.type,
          subType: request.subType ?? '',
          action: request.action,
          component: request.component ?? '*',
          rootOrgId: request.rootOrgId ?? '*',
          framework: request.framework ?? '*',
        },
      });

      try {
        await configDbService.set(key, 'form', response.data as object);
      } catch (err) {
        console.warn('[FormService] Failed to cache form to SQLite:', err);
      }

      return response;
    } catch {
      return this.readFromDb(key);
    }
  }

  private async readFromDb(key: string): Promise<ApiResponse<FormReadResponse>> {
    const entry = await configDbService.get(key);
    return buildOfflineResponse<FormReadResponse>((entry?.data ?? null) as FormReadResponse);
  }
}
