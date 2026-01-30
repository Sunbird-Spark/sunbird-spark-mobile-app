import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentService } from './ContentService';
import { IHttpClient, init, ApiResponse } from '../lib/http-client';

describe('ContentService', () => {
  let mockClient: IHttpClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      setAuthHeader: vi.fn(),
      clearAuthHeader: vi.fn(),
    };

    // Register mock as the global HTTP client
    init(mockClient);
  });

  it('should call client.get with "/content"', async () => {
    const mockResponse: ApiResponse<string[]> = {
      data: ['item1', 'item2'],
      status: 200,
      headers: {},
    };

    (mockClient.get as any).mockResolvedValue(mockResponse);

    const service = new ContentService();
    const result = await service.getContent<string[]>();

    expect(mockClient.get).toHaveBeenCalledWith('/content');
    expect(result).toEqual(mockResponse);
  });

  it('should pass generic type correctly', async () => {
    const mockResponse: ApiResponse<{ id: number }> = {
      data: { id: 1 },
      status: 200,
      headers: {},
    };

    (mockClient.get as any).mockResolvedValue(mockResponse);

    const service = new ContentService();
    const result = await service.getContent<{ id: number }>();

    expect(result.data.id).toBe(1);
  });
});
