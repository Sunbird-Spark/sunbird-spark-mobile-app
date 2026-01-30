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
});
