import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLoad, mockGet } = vi.hoisted(() => ({ mockLoad: vi.fn(), mockGet: vi.fn() }));

vi.mock('./NativeConfigService', () => ({
  NativeConfigServiceInstance: { load: mockLoad },
}));

vi.mock('./HttpService', () => ({
  HttpService: class {
    get = mockGet;
  },
}));

describe('AppInfoService', () => {
  let appInfoService: typeof import('./AppInfoService').appInfoService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* silence expected logs */
    });
    mockLoad.mockResolvedValue({ baseUrl: 'https://example.org' });
    ({ appInfoService } = await import('./AppInfoService'));
  });

  it('returns the lowercased provider list from /portal/app/v1/info', async () => {
    mockGet.mockResolvedValue({ result: { enabledSsoProviders: ['Google', 'MICROSOFT'] } });
    await expect(appInfoService.getEnabledSsoProviders()).resolves.toEqual(['google', 'microsoft']);
    expect(mockGet).toHaveBeenCalledWith('https://example.org/portal/app/v1/info');
  });

  it('returns an explicit empty array as-is (SSO disabled)', async () => {
    mockGet.mockResolvedValue({ result: { enabledSsoProviders: [] } });
    await expect(appInfoService.getEnabledSsoProviders()).resolves.toEqual([]);
  });

  it('returns null when the field is missing', async () => {
    mockGet.mockResolvedValue({ result: { version: '1.0' } });
    await expect(appInfoService.getEnabledSsoProviders()).resolves.toBeNull();
  });

  it('returns null without calling the API when baseUrl is empty', async () => {
    mockLoad.mockResolvedValue({ baseUrl: '' });
    await expect(appInfoService.getEnabledSsoProviders()).resolves.toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns null on request failure and retries on the next call', async () => {
    mockGet.mockRejectedValueOnce(new Error('network down'));
    await expect(appInfoService.getEnabledSsoProviders()).resolves.toBeNull();

    mockGet.mockResolvedValueOnce({ result: { enabledSsoProviders: ['google'] } });
    await expect(appInfoService.getEnabledSsoProviders()).resolves.toEqual(['google']);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('caches a successful result (one API call)', async () => {
    mockGet.mockResolvedValue({ result: { enabledSsoProviders: ['google'] } });
    await appInfoService.getEnabledSsoProviders();
    await appInfoService.getEnabledSsoProviders();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
