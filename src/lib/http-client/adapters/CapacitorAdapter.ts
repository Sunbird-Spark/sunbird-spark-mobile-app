import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { BaseClient } from '../BaseClient';
import { ApiResponse, HeaderOperation, HttpClientConfig } from '../types';
import * as _ from 'lodash';

export class CapacitorAdapter extends BaseClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig) {
    super(config);
    // Combine baseURL and apiPrefix.
    // If baseURL is provided, it's the host. apiPrefix is the path.
    // If baseURL is empty/undefined, we just use apiPrefix as the baseURL for relative requests.
    const prefix = config.apiPrefix ?? '/portal';
    this.baseURL = config.baseURL ? `${config.baseURL}${prefix}` : prefix;

    this.defaultHeaders = config.defaultHeaders || {};
  }

  private mapResponse<T>(response: HttpResponse): ApiResponse<T> {
    const result = _.get(response.data, 'result');
    // If result exists and is not null/undefined, return result. Otherwise return full data.
    const data = !_.isNil(result) ? result : response.data;

    return {
      data: data as T,
      status: response.status,
      headers: response.headers as Record<string, any>,
    };
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const fullUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `${this.baseURL}${url}`;

    const mergedHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    try {
      const response = await CapacitorHttp.request({
        method,
        url: fullUrl,
        headers: mergedHeaders,
        data: data,
      });

      if (response.status >= 400) {
        const body = response.data;
        const params = body?.params;
        const errmsg = typeof params?.errmsg === 'string'
          ? params.errmsg
          : `Request failed (${response.status})`;
        throw new Error(errmsg);
      }

      return this.mapResponse<T>(response);
    } catch (error) {
      throw error;
    }
  }

  protected async _get<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request('GET', url, undefined, headers);
  }

  protected async _post<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request('POST', url, data, headers);
  }

  protected async _put<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request('PUT', url, data, headers);
  }

  protected async _patch<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request('PATCH', url, data, headers);
  }

  protected async _delete<T>(url: string, data?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request('DELETE', url, data, headers);
  }

  public updateHeaders(headers: HeaderOperation[]): void {
    _.forEach(headers, ({ key, value, action }) => {
      if (action === 'add') {
        if (value) {
          this.defaultHeaders[key] = value;
        }
      } else if (action === 'remove') {
        delete this.defaultHeaders[key];
      }
    });
  }
}
