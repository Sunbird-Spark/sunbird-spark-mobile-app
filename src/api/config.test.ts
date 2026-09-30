import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeApiClient } from './config';
import { init, getClient, getLogoutCallback } from '../lib/http-client';
import { CapacitorAdapter } from '../lib/http-client/adapters/CapacitorAdapter';
import { NativeConfigServiceInstance } from '../services/NativeConfigService';
import { AppConsumerAuthService } from '../services/AppConsumerAuthService';
import { userService } from '../services/UserService';
import { refreshAccessToken } from '../auth/keycloakApi';
import type { ApiResponse, HttpClientConfig, ResponseInterceptor } from '../lib/http-client/types';

const { mockAuthService, adapterConfigs } = vi.hoisted(() => ({
  mockAuthService: {
    isCurrentTokenValid: vi.fn(),
    getAuthenticatedToken: vi.fn(),
  },
  adapterConfigs: [] as HttpClientConfig[],
}));

vi.mock('../lib/http-client', () => ({
  init: vi.fn(),
  getClient: vi.fn(),
  getLogoutCallback: vi.fn(),
}));

vi.mock('../lib/http-client/adapters/CapacitorAdapter', () => ({
  CapacitorAdapter: class {
    config: HttpClientConfig;
    constructor(config: HttpClientConfig) {
      this.config = config;
      adapterConfigs.push(config);
    }
  },
}));

vi.mock('../services/NativeConfigService', () => ({
  NativeConfigServiceInstance: { load: vi.fn() },
}));

vi.mock('../services/AppConsumerAuthService', () => ({
  AppConsumerAuthService: { getInstance: vi.fn(() => mockAuthService) },
}));

vi.mock('../services/UserService', () => ({
  userService: {
    getRefreshToken: vi.fn(),
    getAccessToken: vi.fn(),
    getLoginProvider: vi.fn(),
    isTokenExpired: vi.fn(),
    saveAccount: vi.fn(),
    clearAccount: vi.fn(),
  },
}));

vi.mock('../auth/keycloakApi', () => ({ refreshAccessToken: vi.fn() }));

const makeResponse = (status: number): ApiResponse<{ err: string }> => ({
  data: { err: 'denied' },
  status,
  headers: {},
});

const updateHeaders = vi.fn();

/** Runs initializeApiClient and returns the interceptor the adapter was built with. */
async function buildInterceptor(): Promise<ResponseInterceptor> {
  adapterConfigs.length = 0;
  await initializeApiClient();
  const interceptor = adapterConfigs[0].responseInterceptor;
  if (!interceptor) throw new Error('no interceptor registered');
  return interceptor;
}

describe('api/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adapterConfigs.length = 0;
    vi.mocked(NativeConfigServiceInstance.load).mockResolvedValue({
      baseUrl: 'https://api.example.org',
    } as never);
    vi.mocked(getClient).mockReturnValue({ updateHeaders } as never);
    vi.mocked(getLogoutCallback).mockReturnValue(null);
    mockAuthService.isCurrentTokenValid.mockReturnValue(true);
    mockAuthService.getAuthenticatedToken.mockResolvedValue('kong-token');
    vi.mocked(userService.getRefreshToken).mockReturnValue('rt');
    vi.mocked(userService.getAccessToken).mockReturnValue('at');
    vi.mocked(userService.getLoginProvider).mockReturnValue('keycloak');
    vi.mocked(userService.isTokenExpired).mockReturnValue(false);
    vi.mocked(userService.saveAccount).mockResolvedValue(undefined);
    vi.mocked(userService.clearAccount).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── initializeApiClient ────────────────────────────────────────────────────

  describe('initializeApiClient', () => {
    it('initialises the client with the native baseUrl and mobile default headers', async () => {
      await initializeApiClient();

      expect(NativeConfigServiceInstance.load).toHaveBeenCalledOnce();
      expect(init).toHaveBeenCalledOnce();
      expect(vi.mocked(init).mock.calls[0][0]).toBeInstanceOf(CapacitorAdapter);
      expect(adapterConfigs[0]).toMatchObject({
        baseURL: 'https://api.example.org',
        defaultHeaders: {
          'X-Source': 'mobile',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      expect(typeof adapterConfigs[0].responseInterceptor).toBe('function');
    });

    it('falls back to an empty baseURL when native config has none', async () => {
      vi.mocked(NativeConfigServiceInstance.load).mockResolvedValue({} as never);
      await initializeApiClient();
      expect(adapterConfigs[0].baseURL).toBe('');
    });
  });

  // ── pass-through paths ─────────────────────────────────────────────────────

  describe('responseInterceptor pass-through', () => {
    it('returns 2xx responses untouched without refreshing', async () => {
      const interceptor = await buildInterceptor();
      const retry = vi.fn();
      const response = makeResponse(200);

      await expect(interceptor(response, retry, '/api/course/list')).resolves.toBe(response);
      expect(retry).not.toHaveBeenCalled();
      expect(refreshAccessToken).not.toHaveBeenCalled();
      expect(mockAuthService.getAuthenticatedToken).not.toHaveBeenCalled();
    });

    it.each(['/mobile/auth/v1/refresh/token', '/api/consumer/mobile_device/token'])(
      'never intercepts the auth endpoint %s',
      async (url) => {
        const interceptor = await buildInterceptor();
        mockAuthService.isCurrentTokenValid.mockReturnValue(false);
        const retry = vi.fn();
        const response = makeResponse(401);

        await expect(interceptor(response, retry, url)).resolves.toBe(response);
        expect(retry).not.toHaveBeenCalled();
        expect(mockAuthService.getAuthenticatedToken).not.toHaveBeenCalled();
      }
    );

    it('returns a 403 with a valid Kong token as a genuine permission error', async () => {
      const interceptor = await buildInterceptor();
      mockAuthService.isCurrentTokenValid.mockReturnValue(true);
      const retry = vi.fn();
      const response = makeResponse(403);

      await expect(interceptor(response, retry, '/api/course/admin')).resolves.toBe(response);
      expect(retry).not.toHaveBeenCalled();
      expect(refreshAccessToken).not.toHaveBeenCalled();
    });

    it('does refresh a 403 when the Kong token is invalid', async () => {
      const interceptor = await buildInterceptor();
      mockAuthService.isCurrentTokenValid.mockReturnValue(false);
      const retried = makeResponse(200);
      const retry = vi.fn().mockResolvedValue(retried);

      await expect(interceptor(makeResponse(403), retry, '/api/course/list')).resolves.toBe(
        retried
      );
      expect(mockAuthService.getAuthenticatedToken).toHaveBeenCalledOnce();
    });
  });

  // ── refresh + retry ────────────────────────────────────────────────────────

  describe('401 refresh handling', () => {
    it('refreshes the expired Kong token, sets the header and retries', async () => {
      const interceptor = await buildInterceptor();
      mockAuthService.isCurrentTokenValid.mockReturnValue(false);
      vi.mocked(userService.isTokenExpired).mockReturnValue(false);
      const retried = makeResponse(200);
      const retry = vi.fn().mockResolvedValue(retried);

      await expect(interceptor(makeResponse(401), retry, '/api/course/list')).resolves.toBe(
        retried
      );
      expect(updateHeaders).toHaveBeenCalledWith([
        { key: 'Authorization', value: 'Bearer kong-token', action: 'add' },
      ]);
      expect(retry).toHaveBeenCalledOnce();
    });

    it('refreshes the expired user token, stores it and sets the user header', async () => {
      const interceptor = await buildInterceptor();
      vi.mocked(userService.isTokenExpired).mockReturnValue(true);
      vi.mocked(refreshAccessToken).mockResolvedValue({
        access_token: 'new-at',
        refresh_token: 'new-rt',
      });
      const retry = vi.fn().mockResolvedValue(makeResponse(200));

      await interceptor(makeResponse(401), retry, '/api/course/list');

      expect(refreshAccessToken).toHaveBeenCalledWith('rt', 'at');
      expect(userService.saveAccount).toHaveBeenCalledWith(
        { access_token: 'new-at', refresh_token: 'new-rt' },
        'keycloak'
      );
      expect(updateHeaders).toHaveBeenCalledWith([
        { key: 'X-Authenticated-User-Token', value: 'new-at', action: 'add' },
      ]);
      expect(retry).toHaveBeenCalledOnce();
    });

    it('defaults the login provider to keycloak when none is stored', async () => {
      const interceptor = await buildInterceptor();
      vi.mocked(userService.isTokenExpired).mockReturnValue(true);
      vi.mocked(userService.getLoginProvider).mockReturnValue(null);
      vi.mocked(refreshAccessToken).mockResolvedValue({ access_token: 'new-at' });

      await interceptor(makeResponse(401), vi.fn().mockResolvedValue(makeResponse(200)), '/api/x');

      expect(userService.saveAccount).toHaveBeenCalledWith({ access_token: 'new-at' }, 'keycloak');
    });

    it('returns the original response when nothing was expired (no refresh happened)', async () => {
      const interceptor = await buildInterceptor();
      mockAuthService.isCurrentTokenValid.mockReturnValue(true);
      vi.mocked(userService.isTokenExpired).mockReturnValue(false);
      const retry = vi.fn();
      const response = makeResponse(401);

      await expect(interceptor(response, retry, '/api/course/list')).resolves.toBe(response);
      expect(retry).not.toHaveBeenCalled();
    });

    it('skips the user-token refresh when there is no stored session', async () => {
      const interceptor = await buildInterceptor();
      mockAuthService.isCurrentTokenValid.mockReturnValue(false);
      vi.mocked(userService.getRefreshToken).mockReturnValue(null);
      vi.mocked(userService.isTokenExpired).mockReturnValue(true);
      const retry = vi.fn().mockResolvedValue(makeResponse(200));

      await interceptor(makeResponse(401), retry, '/api/course/list');

      expect(refreshAccessToken).not.toHaveBeenCalled();
      expect(retry).toHaveBeenCalledOnce();
    });
  });

  // ── refresh failures ───────────────────────────────────────────────────────

  describe('refresh failures', () => {
    it('returns the original response when the Kong refresh fails', async () => {
      const interceptor = await buildInterceptor();
      mockAuthService.isCurrentTokenValid.mockReturnValue(false);
      mockAuthService.getAuthenticatedToken.mockRejectedValue(new Error('kong down'));
      const retry = vi.fn();
      const response = makeResponse(401);

      await expect(interceptor(response, retry, '/api/course/list')).resolves.toBe(response);
      expect(retry).not.toHaveBeenCalled();
      expect(refreshAccessToken).not.toHaveBeenCalled();
    });

    it('invokes the logout callback and returns the original response on user-token failure', async () => {
      const interceptor = await buildInterceptor();
      const logout = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getLogoutCallback).mockReturnValue(logout);
      vi.mocked(userService.isTokenExpired).mockReturnValue(true);
      vi.mocked(refreshAccessToken).mockRejectedValue(new Error('refresh rejected'));
      const retry = vi.fn();
      const response = makeResponse(401);

      await expect(interceptor(response, retry, '/api/course/list')).resolves.toBe(response);
      expect(logout).toHaveBeenCalledOnce();
      expect(userService.clearAccount).not.toHaveBeenCalled();
      expect(retry).not.toHaveBeenCalled();
    });

    it('swallows an error thrown by the logout callback', async () => {
      const interceptor = await buildInterceptor();
      vi.mocked(getLogoutCallback).mockReturnValue(
        vi.fn().mockRejectedValue(new Error('logout blew up'))
      );
      vi.mocked(userService.isTokenExpired).mockReturnValue(true);
      vi.mocked(refreshAccessToken).mockRejectedValue(new Error('refresh rejected'));
      const response = makeResponse(401);

      await expect(interceptor(response, vi.fn(), '/api/course/list')).resolves.toBe(response);
    });

    it('clears the account and removes the user header when no logout callback is registered', async () => {
      const interceptor = await buildInterceptor();
      vi.mocked(getLogoutCallback).mockReturnValue(null);
      vi.mocked(userService.isTokenExpired).mockReturnValue(true);
      vi.mocked(refreshAccessToken).mockRejectedValue(new Error('refresh rejected'));

      await interceptor(makeResponse(401), vi.fn(), '/api/course/list');

      expect(userService.clearAccount).toHaveBeenCalledOnce();
      expect(updateHeaders).toHaveBeenCalledWith([
        { key: 'X-Authenticated-User-Token', value: '', action: 'remove' },
      ]);
    });

    it('ignores a failure while removing the user header during fallback cleanup', async () => {
      const interceptor = await buildInterceptor();
      vi.mocked(getLogoutCallback).mockReturnValue(null);
      vi.mocked(userService.isTokenExpired).mockReturnValue(true);
      vi.mocked(refreshAccessToken).mockRejectedValue(new Error('refresh rejected'));
      updateHeaders.mockImplementationOnce(() => {
        throw new Error('client gone');
      });
      const response = makeResponse(401);

      await expect(interceptor(response, vi.fn(), '/api/course/list')).resolves.toBe(response);
      expect(userService.clearAccount).toHaveBeenCalledOnce();
    });

    it('gives up and returns the original response when the refresh exceeds the 10s timeout', async () => {
      const interceptor = await buildInterceptor();
      vi.useFakeTimers();
      mockAuthService.isCurrentTokenValid.mockReturnValue(false);
      mockAuthService.getAuthenticatedToken.mockReturnValue(new Promise(() => {}));
      const retry = vi.fn();
      const response = makeResponse(401);

      const pending = interceptor(response, retry, '/api/course/list');
      await vi.advanceTimersByTimeAsync(10_000);

      await expect(pending).resolves.toBe(response);
      expect(retry).not.toHaveBeenCalled();
    });
  });

  // ── single-flight guard ────────────────────────────────────────────────────

  describe('single-flight refresh guard', () => {
    it('refreshes only once when two requests fail concurrently, retrying both', async () => {
      const interceptor = await buildInterceptor();
      vi.mocked(userService.isTokenExpired).mockReturnValue(true);

      let resolveRefresh: (tokens: { access_token: string }) => void = () => {};
      vi.mocked(refreshAccessToken).mockReturnValue(
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
      );

      const retryA = vi.fn().mockResolvedValue(makeResponse(200));
      const retryB = vi.fn().mockResolvedValue(makeResponse(200));

      const first = interceptor(makeResponse(401), retryA, '/api/a');
      // Let the first call reach its await so refreshPromise is set.
      await Promise.resolve();
      await Promise.resolve();
      const second = interceptor(makeResponse(401), retryB, '/api/b');

      resolveRefresh({ access_token: 'new-at' });
      const [resA, resB] = await Promise.all([first, second]);

      expect(refreshAccessToken).toHaveBeenCalledOnce();
      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);
      expect(retryA).toHaveBeenCalledOnce();
      expect(retryB).toHaveBeenCalledOnce();
    });

    it('returns both original responses without retrying when the shared refresh fails', async () => {
      const interceptor = await buildInterceptor();
      mockAuthService.isCurrentTokenValid.mockReturnValue(false);

      let rejectKong: (e: Error) => void = () => {};
      mockAuthService.getAuthenticatedToken.mockReturnValue(
        new Promise((_resolve, reject) => {
          rejectKong = reject;
        })
      );

      const retryA = vi.fn();
      const retryB = vi.fn();
      const responseA = makeResponse(401);
      const responseB = makeResponse(401);

      const first = interceptor(responseA, retryA, '/api/a');
      await Promise.resolve();
      await Promise.resolve();
      const second = interceptor(responseB, retryB, '/api/b');

      rejectKong(new Error('kong down'));

      await expect(first).resolves.toBe(responseA);
      await expect(second).resolves.toBe(responseB);
      expect(mockAuthService.getAuthenticatedToken).toHaveBeenCalledOnce();
      expect(retryA).not.toHaveBeenCalled();
      expect(retryB).not.toHaveBeenCalled();
    });

    it('starts a fresh refresh for a later 401 once the guard has cleared', async () => {
      const interceptor = await buildInterceptor();
      mockAuthService.isCurrentTokenValid.mockReturnValue(false);
      const retry = vi.fn().mockResolvedValue(makeResponse(200));

      await interceptor(makeResponse(401), retry, '/api/a');
      await interceptor(makeResponse(401), retry, '/api/b');

      expect(mockAuthService.getAuthenticatedToken).toHaveBeenCalledTimes(2);
    });
  });
});
