import { Http } from '@capacitor-community/http';
import { BaseClient } from '../BaseClient';
import { ApiResponse, HttpClientConfig } from '../types';

export class CapacitorAdapter extends BaseClient {
  private config: HttpClientConfig;

  constructor(config: HttpClientConfig) {
    super(config);
    this.config = config;
  }

  private mapResponse<T>(res: any): ApiResponse<T> {
    return {
      data: res.data,
      status: res.status,
      headers: res.headers || {},
    };
  }

  protected async _get<T>(url: string, headers?: Record<string,string>) {
    const res = await Http.get({ url: this.buildUrl(url), headers });
    return this.mapResponse<T>(res);
  }

  protected async _post<T>(url: string, data: any, headers?: Record<string,string>) {
    const res = await Http.post({ url: this.buildUrl(url), data, headers });
    return this.mapResponse<T>(res);
  }

  protected async _put<T>(url: string, data: any, headers?: Record<string,string>) {
    const res = await Http.put({ url: this.buildUrl(url), data, headers });
    return this.mapResponse<T>(res);
  }

  protected async _delete<T>(url: string, headers?: Record<string,string>) {
    const res = await Http.del({ url: this.buildUrl(url), headers });
    return this.mapResponse<T>(res);
  }

  private buildUrl(path: string) {
    return `${this.config.baseURL}${path}`;
  }

  setAuthHeader() {}
  clearAuthHeader() {}
}
