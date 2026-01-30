// types/http.ts
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

export interface HttpRequest {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
}

export interface HttpResponse<T = any> {
  body: T;
  status: number;
  headers: Record<string, string>;
  ok: boolean;
}

export class HttpRequestBuilder {
  private request: Partial<HttpRequest> = {};

  withPath(url: string): HttpRequestBuilder {
    this.request.url = url;
    return this;
  }

  withType(method: HttpMethod): HttpRequestBuilder {
    this.request.method = method;
    return this;
  }

  withHeaders(headers: Record<string, string>): HttpRequestBuilder {
    this.request.headers = { ...this.request.headers, ...headers };
    return this;
  }

  withBody(body: any): HttpRequestBuilder {
    this.request.body = body;
    return this;
  }

  build(): HttpRequest {
    if (!this.request.url || !this.request.method) {
      throw new Error('URL and method are required');
    }
    return this.request as HttpRequest;
  }
}
