import { describe, it, expect, beforeEach, vi } from 'vitest';
import { systemSettingsService, SystemSettingsIds } from './systemSettings.service';

describe('SystemSettingsService', () => {
  beforeEach(() => {
    systemSettingsService.clearCache();
    vi.clearAllMocks();
  });

  it('should fetch system settings from API with correct format', async () => {
    const mockResponse = {
      id: 'api.system.settings.get.googleClientId',
      ver: 'v1',
      ts: '2024-01-22 10:47:16:629+0000',
      params: {
        resmsgid: null,
        msgid: '340d4ef3f113f5db5e81859e18663214',
        err: null,
        status: 'success',
        errmsg: null,
      },
      responseCode: 'OK',
      result: {
        response: {
          id: 'googleClientId',
          field: 'googleClientId',
          value: '123456789-abc.apps.googleusercontent.com',
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await systemSettingsService.getSystemSettings({
      id: SystemSettingsIds.GOOGLE_CLIENT_ID,
    });

    expect(result.id).toBe('googleClientId');
    expect(result.field).toBe('googleClientId');
    expect(result.value).toBe('123456789-abc.apps.googleusercontent.com');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/data/v1/system/settings/get/googleClientId'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Channel-Id': 'sunbird',
        }),
      })
    );
  });

  it('should use getGoogleClientId helper method', async () => {
    const mockResponse = {
      id: 'api.system.settings.get.googleClientId',
      ver: 'v1',
      ts: '2024-01-22 10:47:16:629+0000',
      params: {
        resmsgid: null,
        msgid: '340d4ef3f113f5db5e81859e18663214',
        err: null,
        status: 'success',
        errmsg: null,
      },
      responseCode: 'OK',
      result: {
        response: {
          id: 'googleClientId',
          field: 'googleClientId',
          value: 'test-client-id.apps.googleusercontent.com',
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const clientId = await systemSettingsService.getGoogleClientId();

    expect(clientId).toBe('test-client-id.apps.googleusercontent.com');
  });

  it('should cache system settings after first fetch', async () => {
    const mockResponse = {
      id: 'api.system.settings.get.googleClientId',
      ver: 'v1',
      ts: '2024-01-22 10:47:16:629+0000',
      params: {
        resmsgid: null,
        msgid: '340d4ef3f113f5db5e81859e18663214',
        err: null,
        status: 'success',
        errmsg: null,
      },
      responseCode: 'OK',
      result: {
        response: {
          id: 'googleClientId',
          field: 'googleClientId',
          value: 'cached-client-id.apps.googleusercontent.com',
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    // First call
    await systemSettingsService.getSystemSettings({
      id: SystemSettingsIds.GOOGLE_CLIENT_ID,
    });

    // Second call should use cache
    const result = await systemSettingsService.getSystemSettings({
      id: SystemSettingsIds.GOOGLE_CLIENT_ID,
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.value).toBe('cached-client-id.apps.googleusercontent.com');
  });

  it('should throw error when API returns error status', async () => {
    const mockResponse = {
      id: 'api.system.settings.get.googleClientId',
      ver: 'v1',
      ts: '2024-01-22 10:47:16:629+0000',
      params: {
        resmsgid: null,
        msgid: '340d4ef3f113f5db5e81859e18663214',
        err: 'SERVER_ERROR',
        status: 'failed',
        errmsg: 'Setting not found',
      },
      responseCode: 'SERVER_ERROR',
      result: {},
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await expect(
      systemSettingsService.getSystemSettings({
        id: SystemSettingsIds.GOOGLE_CLIENT_ID,
      })
    ).rejects.toThrow('Unable to fetch system setting');
  });

  it('should throw error when HTTP request fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(
      systemSettingsService.getSystemSettings({
        id: SystemSettingsIds.GOOGLE_CLIENT_ID,
      })
    ).rejects.toThrow('Unable to fetch system setting');
  });
});
