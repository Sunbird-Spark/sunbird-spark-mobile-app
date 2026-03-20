export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string | string[]>;
}

export interface HeaderOperation {
  key: string;
  value?: string;
  action: 'add' | 'remove';
}

export type StatusHandlerConfig = Record<number, (res: ApiResponse<any>) => void>;

/** Async interceptor that can inspect a response and optionally retry the request */
export type ResponseInterceptor = (
  response: ApiResponse<any>,
  retry: () => Promise<ApiResponse<any>>,
  url: string,
) => Promise<ApiResponse<any>>;

export interface HttpClientConfig {
  baseURL?: string;
  apiPrefix?: string;
  defaultHeaders?: Record<string, string>;
  statusHandlers?: StatusHandlerConfig;
  responseInterceptor?: ResponseInterceptor;
}

export interface IHttpClient {
  get<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>>;
  post<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>>;
  put<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>>;
  delete<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>>;
  updateHeaders(headers: HeaderOperation[]): void;
}