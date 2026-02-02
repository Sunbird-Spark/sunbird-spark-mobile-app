import { Http } from '@capacitor-community/http';
import { BaseClient } from '../BaseClient';
import { ApiResponse, HttpClientConfig } from '../types';

export class CapacitorAdapter extends BaseClient {
  private config: HttpClientConfig;
  private authToken: string | null = null;

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

  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers = {
      ...this.config.defaultHeaders,
      ...customHeaders,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private async executeRequest<T>(
    method: string,
    url: string,
    options: { data?: any; headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const headers = this.getHeaders(options.headers);

    try {
      let res: any;
      
      switch (method.toUpperCase()) {
        case 'GET':
          res = await Http.get({ url: fullUrl, headers });
          break;
        case 'POST':
          res = await Http.post({ url: fullUrl, data: options.data, headers });
          break;
        case 'PUT':
          res = await Http.put({ url: fullUrl, data: options.data, headers });
          break;
        case 'DELETE':
          res = await Http.del({ url: fullUrl, headers });
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return this.mapResponse<T>(res);
    } catch (error: any) {
      // If the error already looks like an HTTP response (e.g., 4xx/5xx), normalize it
      if (error && typeof error === 'object' && 'status' in error) {
        return this.mapResponse<T>(error);
      }

      // Otherwise, throw a meaningful error
      const message = error?.message || String(error);
      throw new Error(`HTTP ${method.toUpperCase()} ${fullUrl} failed: ${message}`);
    }
  }

  protected async _get<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('GET', url, { headers });
  }

  protected async _post<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('POST', url, { data, headers });
  }

  protected async _put<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('PUT', url, { data, headers });
  }

  protected async _delete<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('DELETE', url, { headers });
  }

  private buildUrl(path: string) {
    return `${this.config.baseURL}${path}`;
  }

  setAuthHeader(token: string): void {
    this.authToken = token;
  }

  clearAuthHeader(): void {
    this.authToken = null;
  }
}
