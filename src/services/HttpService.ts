import { CapacitorHttp, HttpResponse } from '@capacitor/core';

/**
 * Generic HTTP service using CapacitorHttp.
 *
 * Similar to portal's HttpService (which uses axios), but uses CapacitorHttp
 * for native HTTP on mobile. No /api prefix, no result extraction — works
 * with full URLs and returns raw response data.
 *
 * Use for routes outside /api — auth endpoints, certificate downloads, etc.
 */
export class HttpService {
  /**
   * Fetches data from a URL using GET method.
   * @param url — Full URL to fetch from
   * @param headers — Optional request headers
   * @returns Parsed response data
   */
  async get<T = unknown>(url: string, headers?: Record<string, string>): Promise<T> {
    try {
      const response: HttpResponse = await CapacitorHttp.get({
        url,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headers,
        },
      });
      return response.data as T;
    } catch (error) {
      if (!HttpService.isCancel(error)) {
        console.error(`HttpService: Failed to fetch from ${url}:`, error);
      }
      throw error;
    }
  }

  /**
   * Sends data to a URL using POST method.
   * @param url — Full URL to post to
   * @param data — Request body
   * @param headers — Optional request headers
   * @returns Parsed response data
   */
  async post<T = unknown>(url: string, data?: unknown, headers?: Record<string, string>): Promise<T> {
    try {
      const response: HttpResponse = await CapacitorHttp.post({
        url,
        data,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headers,
        },
      });
      return response.data as T;
    } catch (error) {
      if (!HttpService.isCancel(error)) {
        console.error(`HttpService: Failed to post to ${url}:`, error);
      }
      throw error;
    }
  }

  static isCancel(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.toLowerCase().includes('cancel') ||
        error.message.toLowerCase().includes('abort');
    }
    return false;
  }
}
