import {
  ApiResponse,
  HttpClientConfig,
  IHttpClient,
  StatusHandlerConfig,
  HeaderOperation,
  ResponseInterceptor,
} from './types';

export abstract class BaseClient implements IHttpClient {
  protected statusHandlers: StatusHandlerConfig;
  protected responseInterceptor?: ResponseInterceptor;

  constructor(config: HttpClientConfig) {
    this.statusHandlers = config.statusHandlers || {};
    this.responseInterceptor = config.responseInterceptor;
  }

  protected onResponse(response: ApiResponse<any>): void {
    const handler = this.statusHandlers[response.status];
    if (handler) {
      handler(response);
    }
  }

  /**
   * Handles response with optional async interceptor for 401/403.
   * The retry function calls the raw adapter method directly — it bypasses
   * handleResponse, so the interceptor can never run twice for the same request.
   */
  private async handleResponse<T>(
    response: ApiResponse<T>,
    retry: () => Promise<ApiResponse<T>>,
    url: string,
  ): Promise<ApiResponse<T>> {
    // Fire sync status handlers (logging, metrics, etc.)
    this.onResponse(response);

    // If interceptor exists and status is 401 or 403, let it handle refresh + retry
    if (this.responseInterceptor && (response.status === 401 || response.status === 403)) {
      return this.responseInterceptor(response, retry, url) as Promise<ApiResponse<T>>;
    }

    return response;
  }

  // Abstract methods to be implemented by adapters
  protected abstract _get<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>>;
  protected abstract _post<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>>;
  protected abstract _put<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>>;
  protected abstract _delete<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>>;

  public abstract updateHeaders(headers: HeaderOperation[]): void;

  // Public API methods — retry calls raw adapter directly (bypasses interceptor)
  public async get<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const retry = () => this._get<T>(url, headers);
    const response = await retry();
    return this.handleResponse(response, retry, url);
  }

  public async post<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const retry = () => this._post<T>(url, data, headers);
    const response = await retry();
    return this.handleResponse(response, retry, url);
  }

  public async put<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const retry = () => this._put<T>(url, data, headers);
    const response = await retry();
    return this.handleResponse(response, retry, url);
  }

  public async delete<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const retry = () => this._delete<T>(url, headers);
    const response = await retry();
    return this.handleResponse(response, retry, url);
  }
}
