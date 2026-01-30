import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpService, HttpMethod } from './HttpService';

// Mock fetch globally
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

describe('HttpService', () => {
  let httpService: HttpService;
  const baseUrl = 'https://api.example.com';

  beforeEach(() => {
    httpService = new HttpService(baseUrl);
    mockFetch.mockClear();
  });

  describe('JSON parsing error handling', () => {
    it('should throw specific error when JSON parsing fails', async () => {
      // Mock a response with JSON content-type but invalid JSON body
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockRejectedValue(new Error('Unexpected token in JSON')),
        forEach: vi.fn()
      };
      
      // Mock headers.forEach for response headers processing
      mockResponse.headers.forEach = vi.fn();
      
      mockFetch.mockResolvedValue(mockResponse);

      const request = {
        url: '/test',
        method: HttpMethod.GET,
        headers: {},
        body: null
      };

      await expect(httpService.execute(request)).rejects.toThrow(
        'Failed to parse JSON response for GET https://api.example.com/test. Response status: 200. JSON parsing error: Unexpected token in JSON'
      );
    });

    it('should preserve original JSON parsing error for debugging', async () => {
      const originalError = new Error('Unexpected token in JSON');
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockRejectedValue(originalError),
        forEach: vi.fn()
      };
      
      mockResponse.headers.forEach = vi.fn();
      mockFetch.mockResolvedValue(mockResponse);

      const request = {
        url: '/test',
        method: HttpMethod.GET,
        headers: {},
        body: null
      };

      try {
        await httpService.execute(request);
        expect.fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.originalError).toBeDefined();
        expect(error.originalError.message).toBe('Unexpected token in JSON');
      }
    });
  });

  describe('successful responses', () => {
    it('should parse JSON response correctly', async () => {
      const responseData = { id: 1, name: 'Test' };
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(responseData),
        forEach: vi.fn()
      };
      
      mockResponse.headers.forEach = vi.fn();
      mockFetch.mockResolvedValue(mockResponse);

      const request = {
        url: '/test',
        method: HttpMethod.GET,
        headers: {},
        body: null
      };

      const result = await httpService.execute(request);
      
      expect(result.body).toEqual(responseData);
      expect(result.status).toBe(200);
      expect(result.ok).toBe(true);
    });

    it('should handle text response when content-type is not JSON', async () => {
      const responseText = 'Plain text response';
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/plain']]),
        text: vi.fn().mockResolvedValue(responseText),
        forEach: vi.fn()
      };
      
      mockResponse.headers.forEach = vi.fn();
      mockFetch.mockResolvedValue(mockResponse);

      const request = {
        url: '/test',
        method: HttpMethod.GET,
        headers: {},
        body: null
      };

      const result = await httpService.execute(request);
      
      expect(result.body).toBe(responseText);
      expect(result.status).toBe(200);
      expect(result.ok).toBe(true);
    });
  });

  describe('convenience methods', () => {
    it('should make GET request using convenience method', async () => {
      const responseData = { success: true };
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(responseData),
        forEach: vi.fn()
      };
      
      mockResponse.headers.forEach = vi.fn();
      mockFetch.mockResolvedValue(mockResponse);

      const result = await httpService.get('/users');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result.body).toEqual(responseData);
    });

    it('should make POST request using convenience method', async () => {
      const requestBody = { name: 'New User' };
      const responseData = { id: 1, ...requestBody };
      const mockResponse = {
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(responseData),
        forEach: vi.fn()
      };
      
      mockResponse.headers.forEach = vi.fn();
      mockFetch.mockResolvedValue(mockResponse);

      const result = await httpService.post('/users', requestBody);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody)
        })
      );
      expect(result.body).toEqual(responseData);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValue(networkError);

      const request = {
        url: '/test',
        method: HttpMethod.GET,
        headers: {},
        body: null
      };

      await expect(httpService.execute(request)).rejects.toThrow(
        'HTTP request failed for GET https://api.example.com/test: Network error'
      );
    });
  });
});