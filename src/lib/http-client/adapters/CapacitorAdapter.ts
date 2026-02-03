import { CapacitorHttp } from '@capacitor/core';
import { BaseClient } from '../BaseClient';
import { ApiResponse, HeaderOperation, HttpClientConfig } from '../types';
import _ from 'lodash';

export class CapacitorAdapter extends BaseClient {
  private config: HttpClientConfig;
  private customHeaders: Record<string, string> = {};

  constructor(config: HttpClientConfig) {
    super(config);
    
    // Combine baseURL and apiPrefix.
    // If baseURL is provided, it's the host. apiPrefix is the path.
    // If baseURL is empty/undefined, we just use apiPrefix as the baseURL for relative requests.
    const prefix = config.apiPrefix ?? '/api';
    const baseURL = config.baseURL ? `${config.baseURL}${prefix}` : prefix;
    
    this.config = {
      ...config,
      baseURL,
    };
  }

  private mapResponse<T>(capacitorResponse: any): ApiResponse<T> {
    const result = _.get(capacitorResponse.data, 'result');
    // If result exists and is not null/undefined, return result. Otherwise return full data.
    const data = !_.isNil(result) ? result : capacitorResponse.data;
    
    const mappedResponse = {
      data: data as T,
      status: capacitorResponse.status,
      headers: capacitorResponse.headers as Record<string, any>,
    };
    
    return mappedResponse;
  }

  private async request<T>(requestFn: () => Promise<any>): Promise<ApiResponse<T>> {
    try {
      const response = await requestFn();
      return this.mapResponse(response);
    } catch (error: any) {
      // If the error already looks like an HTTP response (e.g., 4xx/5xx), normalize it
      if (error && typeof error === 'object' && 'status' in error) {
        return this.mapResponse(error);
      }
      throw error;
    }
  }

  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers = {
      ...this.config.defaultHeaders,
      ...this.customHeaders,
      ...customHeaders,
    };
    
    // Clean headers - remove null/undefined values and ensure all values are strings
    const cleanHeaders: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      if (value != null && value !== undefined) {
        cleanHeaders[key] = String(value);
      }
    });
    
    return cleanHeaders;
  }

  private buildUrl(path: string): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${this.config.baseURL}${normalizedPath}`;
    return fullUrl;
  }

  protected async _get<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const cleanHeaders = this.getHeaders(headers);
    
    return this.request(() => 
      CapacitorHttp.get({ 
        url: fullUrl, 
        headers: cleanHeaders
      })
    );
  }

  protected async _post<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const cleanHeaders = this.getHeaders(headers);
    
    // Ensure data is properly serialized
    const requestData = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : undefined;
    
    return this.request(() => 
      CapacitorHttp.post({ 
        url: fullUrl, 
        data: requestData,
        headers: cleanHeaders
      })
    );
  }

  protected async _put<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const cleanHeaders = this.getHeaders(headers);
    
    // Ensure data is properly serialized
    const requestData = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : undefined;
    
    return this.request(() => 
      CapacitorHttp.put({ 
        url: fullUrl, 
        data: requestData,
        headers: cleanHeaders
      })
    );
  }

  protected async _delete<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const cleanHeaders = this.getHeaders(headers);
    
    return this.request(() => 
      CapacitorHttp.del({ 
        url: fullUrl, 
        headers: cleanHeaders
      })
    );
  }

  public updateHeaders(headers: HeaderOperation[]): void {
    _.forEach(headers, ({ key, value, action }) => {
      if (action === 'add') {
        if (value) {
          _.set(this.customHeaders, key, value);
        }
      } else if (action === 'remove') {
        _.unset(this.customHeaders, key);
      }
    });
  }
}