import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CapacitorAdapter } from './CapacitorAdapter';
import { Http } from '@capacitor-community/http';

vi.mock('@capacitor-community/http', () => ({
  Http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}));

describe('CapacitorAdapter', () => {
  let adapter: CapacitorAdapter;

  beforeEach(() => {
    adapter = new CapacitorAdapter({ baseURL: 'http://test.com' });
  });

  it('should return ApiResponse on successful get', async () => {
    (Http.get as any).mockResolvedValue({
      data: { id: 1 },
      status: 200,
      headers: {},
    });

    const result = await adapter.get('/test');
    expect(result).toEqual({ data: { id: 1 }, status: 200, headers: {} });
  });

  it('should trigger status handler on specific status', async () => {
    const handler = vi.fn();
    adapter = new CapacitorAdapter({
      baseURL: 'http://test.com',
      statusHandlers: { 403: handler },
    });

    (Http.get as any).mockResolvedValue({
      data: null,
      status: 403,
      headers: {},
    });

    const result = await adapter.get('/test');
    expect(handler).toHaveBeenCalledWith(result);
  });

  it('should add and remove headers using updateHeaders', async () => {
    (Http.get as any).mockResolvedValue({
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

    expect(Http.get).toHaveBeenCalledWith({
      url: 'http://test.com/test',
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

    expect(Http.get).toHaveBeenCalledWith({
      url: 'http://test.com/test2',
      headers: {
        'X-Another-Header': 'another-value',
      },
    });
  });

  it('should preserve auth header when using updateHeaders', async () => {
    (Http.get as any).mockResolvedValue({
      data: { id: 1 },
      status: 200,
      headers: {},
    });

    adapter.setAuthHeader('test-token');
    adapter.updateHeaders([
      { key: 'X-Custom-Header', value: 'custom-value', action: 'add' },
    ]);

    await adapter.get('/test');

    expect(Http.get).toHaveBeenCalledWith({
      url: 'http://test.com/test',
      headers: {
        'Authorization': 'Bearer test-token',
        'X-Custom-Header': 'custom-value',
      },
    });
  });
});
