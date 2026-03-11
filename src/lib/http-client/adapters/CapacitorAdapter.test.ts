import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CapacitorAdapter } from './CapacitorAdapter';
import { CapacitorHttp } from '@capacitor/core';
import { HeaderOperation } from '../types';

vi.mock('@capacitor/core', () => {
  return {
    CapacitorHttp: {
      request: vi.fn(),
    },
  };
});

describe('CapacitorAdapter', () => {
  let adapter: CapacitorAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CapacitorAdapter({
      baseURL: 'https://api.example.com',
      apiPrefix: '/v1',
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should initialize with correct base URL', async () => {
    const mockResponse = {
      status: 200,
      headers: {},
      data: { result: 'test-data' },
    };

    (CapacitorHttp.request as unknown).mockResolvedValue(mockResponse);

    const res = await adapter.get('/test');

    expect(CapacitorHttp.request).toHaveBeenCalledWith({
      method: 'GET',
      url: 'https://api.example.com/v1/test',
      headers: {
        'Content-Type': 'application/json',
      },
      data: undefined,
    });
    expect(res.data).toEqual('test-data');
    expect(res.status).toBe(200);
  });

  it('should not prepend baseURL if url is absolute', async () => {
    const mockResponse = {
      status: 200,
      headers: {},
      data: { result: 'test-data' },
    };

    (CapacitorHttp.request as unknown).mockResolvedValue(mockResponse);

    await adapter.get('http://other.com/test');

    expect(CapacitorHttp.request).toHaveBeenCalledWith({
      method: 'GET',
      url: 'http://other.com/test',
      headers: {
        'Content-Type': 'application/json',
      },
      data: undefined,
    });
  });

  it('should map full response data if result is undefined', async () => {
    const mockResponse = {
      status: 200,
      headers: {},
      data: { foo: 'bar' }, // no result property
    };

    (CapacitorHttp.request as unknown).mockResolvedValue(mockResponse);

    const res = await adapter.get('/test');

    expect(res.data).toEqual({ foo: 'bar' });
  });

  it('should handle POST request', async () => {
    const mockResponse = {
      status: 201,
      headers: {},
      data: { result: 'created' },
    };

    (CapacitorHttp.request as unknown).mockResolvedValue(mockResponse);

    const dataPayload = { name: 'test' };
    const res = await adapter.post('/test', dataPayload);

    expect(CapacitorHttp.request).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://api.example.com/v1/test',
      headers: {
        'Content-Type': 'application/json',
      },
      data: dataPayload,
    });
    expect(res.data).toBe('created');
  });

  it('should handle PUT request', async () => {
    const mockResponse = {
      status: 200,
      headers: {},
      data: { result: 'updated' },
    };

    (CapacitorHttp.request as unknown).mockResolvedValue(mockResponse);

    const dataPayload = { name: 'updated' };
    const res = await adapter.put('/test', dataPayload);

    expect(CapacitorHttp.request).toHaveBeenCalledWith({
      method: 'PUT',
      url: 'https://api.example.com/v1/test',
      headers: {
        'Content-Type': 'application/json',
      },
      data: dataPayload,
    });
    expect(res.data).toBe('updated');
  });

  it('should handle PATCH request', async () => {
    const mockResponse = {
      status: 200,
      headers: {},
      data: { result: 'patched' },
    };

    (CapacitorHttp.request as unknown).mockResolvedValue(mockResponse);

    const dataPayload = { name: 'patched' };
    const res = await adapter.patch('/test', dataPayload);

    expect(CapacitorHttp.request).toHaveBeenCalledWith({
      method: 'PATCH',
      url: 'https://api.example.com/v1/test',
      headers: {
        'Content-Type': 'application/json',
      },
      data: dataPayload,
    });
    expect(res.data).toBe('patched');
  });

  it('should handle DELETE request', async () => {
    const mockResponse = {
      status: 200,
      headers: {},
      data: { result: 'deleted' },
    };

    (CapacitorHttp.request as unknown).mockResolvedValue(mockResponse);

    const res = await adapter.delete('/test');

    expect(CapacitorHttp.request).toHaveBeenCalledWith({
      method: 'DELETE',
      url: 'https://api.example.com/v1/test',
      headers: {
        'Content-Type': 'application/json',
      },
      data: undefined,
    });
    expect(res.data).toBe('deleted');
  });

  it('should update headers correctly', async () => {
    const operations: HeaderOperation[] = [
      { key: 'Authorization', value: 'Bearer token', action: 'add' },
      { key: 'Content-Type', action: 'remove' },
    ];

    adapter.updateHeaders(operations);

    (CapacitorHttp.request as unknown).mockResolvedValue({ status: 200, data: {} });

    await adapter.get('/test');

    expect(CapacitorHttp.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer token',
        },
      })
    );
  });

  it('should throw error on 400+ status', async () => {
    const mockResponse = {
      status: 400,
      headers: {},
      data: {
        params: {
          errmsg: 'Bad Request Message',
        },
      },
    };

    (CapacitorHttp.request as unknown).mockResolvedValue(mockResponse);

    await expect(adapter.get('/test')).rejects.toThrow('Bad Request Message');
  });

  it('should throw generic error on 400+ status if errmsg is missing', async () => {
    const mockResponse = {
      status: 500,
      headers: {},
      data: {},
    };

    (CapacitorHttp.request as unknown).mockResolvedValue(mockResponse);

    await expect(adapter.get('/test')).rejects.toThrow('Request failed (500)');
  });
});
