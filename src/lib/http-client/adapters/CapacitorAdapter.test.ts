import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CapacitorAdapter } from './CapacitorAdapter';
import { CapacitorHttp } from '@capacitor/core';

vi.mock('@capacitor/core', () => ({
  CapacitorHttp: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}));

describe('CapacitorAdapter', () => {
  let adapter: CapacitorAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CapacitorAdapter({ baseURL: 'http://test.com' });
  });

  describe('constructor', () => {
    it('should initialize with baseURL and default apiPrefix', () => {
      const adapter = new CapacitorAdapter({ baseURL: 'http://test.com' });
      expect(adapter).toBeInstanceOf(CapacitorAdapter);
    });

    it('should initialize with custom apiPrefix', () => {
      const adapter = new CapacitorAdapter({ 
        baseURL: 'http://test.com', 
        apiPrefix: '/custom' 
      });
      expect(adapter).toBeInstanceOf(CapacitorAdapter);
    });

    it('should initialize without baseURL', () => {
      const adapter = new CapacitorAdapter({ apiPrefix: '/api' });
      expect(adapter).toBeInstanceOf(CapacitorAdapter);
    });

    it('should initialize with default headers', () => {
      const adapter = new CapacitorAdapter({ 
        baseURL: 'http://test.com',
        defaultHeaders: { 'X-Default': 'value' }
      });
      expect(adapter).toBeInstanceOf(CapacitorAdapter);
    });
  });

  describe('GET requests', () => {
    it('should return ApiResponse on successful get', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {},
      });

      const result = await adapter.get('/test');
      expect(result).toEqual({ data: { id: 1 }, status: 200, headers: {} });
    });

    it('should handle response with result field', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { result: { id: 1, name: 'test' } },
        status: 200,
        headers: {},
      });

      const result = await adapter.get('/test');
      expect(result).toEqual({ 
        data: { id: 1, name: 'test' }, 
        status: 200, 
        headers: {} 
      });
    });

    it('should handle response without result field', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { id: 1, name: 'test' },
        status: 200,
        headers: {},
      });

      const result = await adapter.get('/test');
      expect(result).toEqual({ 
        data: { id: 1, name: 'test' }, 
        status: 200, 
        headers: {} 
      });
    });

    it('should handle null result field', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { result: null, other: 'data' },
        status: 200,
        headers: {},
      });

      const result = await adapter.get('/test');
      expect(result).toEqual({ 
        data: { result: null, other: 'data' }, 
        status: 200, 
        headers: {} 
      });
    });

    it('should handle undefined result field', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { result: undefined, other: 'data' },
        status: 200,
        headers: {},
      });

      const result = await adapter.get('/test');
      expect(result).toEqual({ 
        data: { result: undefined, other: 'data' }, 
        status: 200, 
        headers: {} 
      });
    });

    it('should build URL correctly with leading slash', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {},
      });

      await adapter.get('/test');

      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        headers: {},
      });
    });

    it('should build URL correctly without leading slash', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {},
      });

      await adapter.get('test');

      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        headers: {},
      });
    });

    it('should handle HTTP errors as responses', async () => {
      const errorResponse = {
        data: { error: 'Not found' },
        status: 404,
        headers: {},
      };

      (CapacitorHttp.get as any).mockRejectedValue(errorResponse);

      const result = await adapter.get('/test');
      expect(result).toEqual(errorResponse);
    });

    it('should throw non-HTTP errors', async () => {
      const networkError = new Error('Network error');
      (CapacitorHttp.get as any).mockRejectedValue(networkError);

      await expect(adapter.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('POST requests', () => {
    it('should handle POST with object data', async () => {
      (CapacitorHttp.post as any).mockResolvedValue({
        data: { id: 1 },
        status: 201,
        headers: {},
      });

      const result = await adapter.post('/test', { name: 'test' });

      expect(CapacitorHttp.post).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        data: '{"name":"test"}',
        headers: {},
      });
      expect(result).toEqual({ data: { id: 1 }, status: 201, headers: {} });
    });

    it('should handle POST with string data', async () => {
      (CapacitorHttp.post as any).mockResolvedValue({
        data: { id: 1 },
        status: 201,
        headers: {},
      });

      const result = await adapter.post('/test', 'string data');

      expect(CapacitorHttp.post).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        data: 'string data',
        headers: {},
      });
      expect(result).toEqual({ data: { id: 1 }, status: 201, headers: {} });
    });

    it('should handle POST with null data', async () => {
      (CapacitorHttp.post as any).mockResolvedValue({
        data: { id: 1 },
        status: 201,
        headers: {},
      });

      const result = await adapter.post('/test', null);

      expect(CapacitorHttp.post).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        data: undefined,
        headers: {},
      });
      expect(result).toEqual({ data: { id: 1 }, status: 201, headers: {} });
    });

    it('should handle POST with undefined data', async () => {
      (CapacitorHttp.post as any).mockResolvedValue({
        data: { id: 1 },
        status: 201,
        headers: {},
      });

      const result = await adapter.post('/test', undefined);

      expect(CapacitorHttp.post).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        data: undefined,
        headers: {},
      });
      expect(result).toEqual({ data: { id: 1 }, status: 201, headers: {} });
    });
  });

  describe('PUT requests', () => {
    it('should handle PUT with data', async () => {
      (CapacitorHttp.put as any).mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {},
      });

      const result = await adapter.put('/test', { name: 'updated' });

      expect(CapacitorHttp.put).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        data: '{"name":"updated"}',
        headers: {},
      });
      expect(result).toEqual({ data: { id: 1 }, status: 200, headers: {} });
    });
  });

  describe('DELETE requests', () => {
    it('should handle DELETE', async () => {
      (CapacitorHttp.del as any).mockResolvedValue({
        data: null,
        status: 204,
        headers: {},
      });

      const result = await adapter.delete('/test');

      expect(CapacitorHttp.del).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        headers: {},
      });
      expect(result).toEqual({ data: null, status: 204, headers: {} });
    });
  });

  describe('headers management', () => {
    it('should trigger status handler on specific status', async () => {
      const handler = vi.fn();
      adapter = new CapacitorAdapter({
        baseURL: 'http://test.com',
        statusHandlers: { 403: handler },
      });

      (CapacitorHttp.get as any).mockResolvedValue({
        data: null,
        status: 403,
        headers: {},
      });

      const result = await adapter.get('/test');
      expect(handler).toHaveBeenCalledWith(result);
    });

    it('should clean headers by removing null values', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {},
      });

      adapter.updateHeaders([
        { key: 'X-Valid', value: 'valid-value', action: 'add' },
        { key: 'X-Null', value: null as any, action: 'add' },
        { key: 'X-Undefined', value: undefined as any, action: 'add' },
      ]);

      await adapter.get('/test');

      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        headers: {
          'X-Valid': 'valid-value',
        },
      });
    });

    it('should convert non-string header values to strings', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {},
      });

      adapter.updateHeaders([
        { key: 'X-Number', value: 123 as any, action: 'add' },
        { key: 'X-Boolean', value: true as any, action: 'add' },
      ]);

      await adapter.get('/test');

      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        headers: {
          'X-Number': '123',
          'X-Boolean': 'true',
        },
      });
    });

    it('should add and remove headers using updateHeaders', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {},
      });

      // Add headers
      adapter.updateHeaders([
        { key: 'X-Custom-Header', value: 'custom-value', action: 'add' },
        { key: 'X-Another-Header', value: 'another-value', action: 'add' },
      ]);

      await adapter.get('/test');

      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        headers: {
          'X-Custom-Header': 'custom-value',
          'X-Another-Header': 'another-value',
        },
      });

      // Remove one header
      adapter.updateHeaders([
        { key: 'X-Custom-Header', action: 'remove' },
      ]);

      await adapter.get('/test2');

      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: 'http://test.com/api/test2',
        headers: {
          'X-Another-Header': 'another-value',
        },
      });
    });

    it('should preserve auth header when using updateHeaders', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {},
      });

      // Use updateHeaders to set auth header instead of setAuthHeader
      adapter.updateHeaders([
        { key: 'Authorization', value: 'Bearer test-token', action: 'add' },
      ]);
      adapter.updateHeaders([
        { key: 'X-Custom-Header', value: 'custom-value', action: 'add' },
      ]);

      await adapter.get('/test');

      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        headers: {
          'Authorization': 'Bearer test-token',
          'X-Custom-Header': 'custom-value',
        },
      });
    });

    it('should merge default headers with custom headers', async () => {
      adapter = new CapacitorAdapter({
        baseURL: 'http://test.com',
        defaultHeaders: { 'X-Default': 'default-value' }
      });

      (CapacitorHttp.get as any).mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {},
      });

      adapter.updateHeaders([
        { key: 'X-Custom', value: 'custom-value', action: 'add' },
      ]);

      await adapter.get('/test', { 'X-Request': 'request-value' });

      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        headers: {
          'X-Default': 'default-value',
          'X-Custom': 'custom-value',
          'X-Request': 'request-value',
        },
      });
    });

    it('should handle updateHeaders with empty value for add action', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {},
      });

      adapter.updateHeaders([
        { key: 'X-Empty', value: '', action: 'add' },
      ]);

      await adapter.get('/test');

      // Empty string is falsy, so header won't be added
      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        headers: {},
      });
    });

    it('should not add header when value is falsy for add action', async () => {
      (CapacitorHttp.get as any).mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {},
      });

      adapter.updateHeaders([
        { key: 'X-Falsy', value: '', action: 'add' },
        { key: 'X-Valid', value: 'valid', action: 'add' },
      ]);

      await adapter.get('/test');

      // Empty string is falsy, so only valid header is added
      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: 'http://test.com/api/test',
        headers: {
          'X-Valid': 'valid',
        },
      });
    });
  });
});
