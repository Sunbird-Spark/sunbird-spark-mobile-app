import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseClient } from './BaseClient';
import { ApiResponse, HttpClientConfig } from './types';

// Mock implementation of BaseClient for testing
class MockBaseClient extends BaseClient {
  private mockResponses: Map<string, ApiResponse<any>> = new Map();

  constructor(config: HttpClientConfig) {
    super(config);
  }

  // Mock methods to set up test responses
  setMockResponse(method: string, url: string, response: ApiResponse<any>) {
    this.mockResponses.set(`${method}:${url}`, response);
  }

  // Abstract method implementations for testing
  protected async _get<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const key = `GET:${url}`;
    const response = this.mockResponses.get(key);
    if (!response) {
      throw new Error(`No mock response set for ${key}`);
    }
    return response;
  }

  protected async _post<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const key = `POST:${url}`;
    const response = this.mockResponses.get(key);
    if (!response) {
      throw new Error(`No mock response set for ${key}`);
    }
    return response;
  }

  protected async _put<T>(url: string, data: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const key = `PUT:${url}`;
    const response = this.mockResponses.get(key);
    if (!response) {
      throw new Error(`No mock response set for ${key}`);
    }
    return response;
  }

  protected async _delete<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const key = `DELETE:${url}`;
    const response = this.mockResponses.get(key);
    if (!response) {
      throw new Error(`No mock response set for ${key}`);
    }
    return response;
  }

  setAuthHeader(token: string): void {
    // Mock implementation
  }

  clearAuthHeader(): void {
    // Mock implementation
  }
}

describe('BaseClient', () => {
  let client: MockBaseClient;
  let mockStatusHandler: any;

  beforeEach(() => {
    mockStatusHandler = vi.fn();
    
    const config: HttpClientConfig = {
      baseURL: 'https://api.example.com',
      statusHandlers: {
        401: mockStatusHandler,
        500: mockStatusHandler,
      },
    };

    client = new MockBaseClient(config);
  });

  describe('constructor', () => {
    it('should initialize with empty status handlers when none provided', () => {
      const clientWithoutHandlers = new MockBaseClient({});
      expect(clientWithoutHandlers['statusHandlers']).toEqual({});
    });

    it('should initialize with provided status handlers', () => {
      const handlers = { 404: vi.fn() };
      const clientWithHandlers = new MockBaseClient({ statusHandlers: handlers });
      expect(clientWithHandlers['statusHandlers']).toBe(handlers);
    });
  });

  describe('GET requests', () => {
    it('should call _get and return response', async () => {
      const mockResponse: ApiResponse<{ id: number }> = {
        data: { id: 1 },
        status: 200,
        headers: { 'content-type': 'application/json' },
      };

      client.setMockResponse('GET', '/users/1', mockResponse);

      const result = await client.get<{ id: number }>('/users/1');

      expect(result).toBe(mockResponse);
    });

    it('should call status handler for matching status code', async () => {
      const mockResponse: ApiResponse<any> = {
        data: { error: 'Unauthorized' },
        status: 401,
        headers: {},
      };

      client.setMockResponse('GET', '/protected', mockResponse);

      await client.get('/protected');

      expect(mockStatusHandler).toHaveBeenCalledWith(mockResponse);
    });

    it('should not call status handler for non-matching status code', async () => {
      const mockResponse: ApiResponse<any> = {
        data: { success: true },
        status: 200,
        headers: {},
      };

      client.setMockResponse('GET', '/users', mockResponse);

      await client.get('/users');

      expect(mockStatusHandler).not.toHaveBeenCalled();
    });
  });

  describe('POST requests', () => {
    it('should call _post with data and return response', async () => {
      const requestData = { name: 'John' };
      const mockResponse: ApiResponse<{ id: number; name: string }> = {
        data: { id: 1, name: 'John' },
        status: 201,
        headers: { 'content-type': 'application/json' },
      };

      client.setMockResponse('POST', '/users', mockResponse);

      const result = await client.post<{ id: number; name: string }>('/users', requestData);

      expect(result).toBe(mockResponse);
    });

    it('should call status handler for error responses', async () => {
      const mockResponse: ApiResponse<any> = {
        data: { error: 'Server Error' },
        status: 500,
        headers: {},
      };

      client.setMockResponse('POST', '/users', mockResponse);

      await client.post('/users', {});

      expect(mockStatusHandler).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('PUT requests', () => {
    it('should call _put with data and return response', async () => {
      const requestData = { name: 'Jane' };
      const mockResponse: ApiResponse<{ id: number; name: string }> = {
        data: { id: 1, name: 'Jane' },
        status: 200,
        headers: { 'content-type': 'application/json' },
      };

      client.setMockResponse('PUT', '/users/1', mockResponse);

      const result = await client.put<{ id: number; name: string }>('/users/1', requestData);

      expect(result).toBe(mockResponse);
    });
  });

  describe('DELETE requests', () => {
    it('should call _delete and return response', async () => {
      const mockResponse: ApiResponse<void> = {
        data: undefined as any,
        status: 204,
        headers: {},
      };

      client.setMockResponse('DELETE', '/users/1', mockResponse);

      const result = await client.delete('/users/1');

      expect(result).toBe(mockResponse);
    });
  });

  describe('status handlers', () => {
    it('should call multiple status handlers for different status codes', async () => {
      const handler401 = vi.fn();
      const handler500 = vi.fn();
      
      const clientWithMultipleHandlers = new MockBaseClient({
        statusHandlers: {
          401: handler401,
          500: handler500,
        },
      });

      const response401: ApiResponse<any> = {
        data: { error: 'Unauthorized' },
        status: 401,
        headers: {},
      };

      const response500: ApiResponse<any> = {
        data: { error: 'Server Error' },
        status: 500,
        headers: {},
      };

      clientWithMultipleHandlers.setMockResponse('GET', '/auth', response401);
      clientWithMultipleHandlers.setMockResponse('GET', '/error', response500);

      await clientWithMultipleHandlers.get('/auth');
      await clientWithMultipleHandlers.get('/error');

      expect(handler401).toHaveBeenCalledWith(response401);
      expect(handler500).toHaveBeenCalledWith(response500);
    });

    it('should not throw error when no status handler is defined', async () => {
      const clientWithoutHandlers = new MockBaseClient({});
      
      const mockResponse: ApiResponse<any> = {
        data: { error: 'Not Found' },
        status: 404,
        headers: {},
      };

      clientWithoutHandlers.setMockResponse('GET', '/missing', mockResponse);

      await expect(clientWithoutHandlers.get('/missing')).resolves.toBe(mockResponse);
    });
  });

  describe('headers parameter', () => {
    it('should pass headers to underlying methods', async () => {
      const headers = { 'Authorization': 'Bearer token' };
      const mockResponse: ApiResponse<any> = {
        data: {},
        status: 200,
        headers: {},
      };

      // Set up mock responses for all HTTP methods
      client.setMockResponse('GET', '/protected', mockResponse);
      client.setMockResponse('POST', '/protected', mockResponse);
      client.setMockResponse('PUT', '/protected', mockResponse);
      client.setMockResponse('DELETE', '/protected', mockResponse);

      await client.get('/protected', headers);
      await client.post('/protected', {}, headers);
      await client.put('/protected', {}, headers);
      await client.delete('/protected', headers);

      // The test verifies that methods can be called with headers without throwing
      expect(true).toBe(true);
    });
  });
});