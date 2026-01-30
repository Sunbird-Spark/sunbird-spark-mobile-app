// services/http.service.ts
import { HttpMethod, HttpRequest, HttpResponse, HttpRequestBuilder } from '../types/http';

// Re-export for backward compatibility
export { HttpMethod, HttpRequestBuilder };
export type { HttpRequest, HttpResponse };

export class HttpService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string> = {};

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  async execute<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    const url = request.url.startsWith('http') 
      ? request.url 
      : `${this.baseUrl}${request.url}`;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.defaultHeaders,
      ...request.headers
    };

    const requestConfig: RequestInit = {
      method: request.method,
      headers
    };

    if (request.body && request.method !== HttpMethod.GET) {
      requestConfig.body = JSON.stringify(request.body);
    }

    try {
      const response = await fetch(url, requestConfig);
      
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text() as unknown as T;
      }

      return {
        body: responseBody,
        status: response.status,
        headers: responseHeaders,
        ok: response.ok
      };
    } catch (error) {
      const originalMessage = error instanceof Error ? error.message : String(error);
      const requestInfo = `${request.method} ${url}`;
      const enhancedError = new Error(
        `HTTP request failed for ${requestInfo}: ${originalMessage}`
      );
      
      // Preserve original error as a property for debugging
      if (error instanceof Error) {
        (enhancedError as any).originalError = error;
      }
      
      throw enhancedError;
    }
  }

  // Convenience methods
  async get<T>(url: string, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    const request = new HttpRequestBuilder()
      .withPath(url)
      .withType(HttpMethod.GET)
      .withHeaders(headers || {})
      .build();
    
    return this.execute<T>(request);
  }

  async post<T>(url: string, body: any, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    const request = new HttpRequestBuilder()
      .withPath(url)
      .withType(HttpMethod.POST)
      .withBody(body)
      .withHeaders(headers || {})
      .build();
    
    return this.execute<T>(request);
  }
}
