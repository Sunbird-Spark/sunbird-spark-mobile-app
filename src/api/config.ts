import { init, getClient } from '../lib/http-client';
import { CapacitorAdapter } from '../lib/http-client/adapters/CapacitorAdapter';
import { NativeConfigServiceInstance } from '../services/NativeConfigService';
import { AppConsumerAuthService } from '../services/AppConsumerAuthService';
import { userService } from '../services/UserService';
import { refreshAccessToken } from '../auth/keycloakApi';
import type { ResponseInterceptor } from '../lib/http-client/types';

const REFRESH_TIMEOUT_MS = 10_000;
const AUTH_HEADER_KEY = 'X-Authenticated-User-Token';

/** URLs that should never trigger the interceptor (prevents infinite recursion) */
const isAuthEndpoint = (url: string): boolean =>
  url.includes('/refresh/token') || url.includes('/consumer/mobile_device');

let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempts to refresh expired tokens. Returns true if any token was refreshed.
 * - Kong token: refreshed on both 401 and 403 (gateway-level rejection)
 * - User token: refreshed on 401 only (403 = genuine permission issue)
 */
const doTokenRefresh = async (status: number): Promise<boolean> => {
  let didRefresh = false;
  const authService = AppConsumerAuthService.getInstance();

  // Step 1: Refresh Kong token if expired (handles both 401 and 403)
  if (!authService.isCurrentTokenValid()) {
    try {
      const newKongToken = await authService.getAuthenticatedToken();
      getClient().updateHeaders([
        { key: 'Authorization', value: `Bearer ${newKongToken}`, action: 'add' },
      ]);
      didRefresh = true;
    } catch {
      // Kong refresh failed — can't reach backend at all
      return false;
    }
  }

  // Step 2: Refresh user token only on 401 (not 403 — 403 is a permission issue)
  if (status === 401) {
    const refreshToken = userService.getRefreshToken();
    const accessToken = userService.getAccessToken();

    if (refreshToken && accessToken && userService.isTokenExpired()) {
      try {
        const tokens = await refreshAccessToken(refreshToken, accessToken);
        await userService.saveAccount(tokens, userService.getLoginProvider() ?? 'keycloak');
        getClient().updateHeaders([
          { key: AUTH_HEADER_KEY, value: tokens.access_token, action: 'add' },
        ]);
        didRefresh = true;
      } catch {
        // User token refresh failed — clear session
        await userService.clearAccount();
        try {
          getClient().updateHeaders([
            { key: AUTH_HEADER_KEY, value: '', action: 'remove' },
          ]);
        } catch {
          // Ignore
        }
        return false;
      }
    }
  }

  return didRefresh;
};

/** Wraps doTokenRefresh with a timeout to prevent hanging */
const doTokenRefreshWithTimeout = (status: number): Promise<boolean> => {
  return Promise.race([
    doTokenRefresh(status),
    new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), REFRESH_TIMEOUT_MS),
    ),
  ]);
};

/**
 * Async response interceptor for 401/403.
 * - Determines which token expired
 * - Refreshes the correct token(s)
 * - Replays the original request if a refresh happened
 * - Skips auth endpoints to prevent infinite recursion
 */
const responseInterceptor: ResponseInterceptor = async (response, retry, url) => {
  // Never intercept auth endpoints (prevents recursion)
  if (isAuthEndpoint(url)) return response;

  const authService = AppConsumerAuthService.getInstance();

  // 403 with valid Kong token = genuine permission issue, don't intercept
  if (response.status === 403 && authService.isCurrentTokenValid()) {
    return response;
  }

  // If already refreshing, wait for the existing refresh to complete
  if (refreshPromise) {
    const success = await refreshPromise;
    return success ? retry() : response;
  }

  refreshPromise = doTokenRefreshWithTimeout(response.status);

  try {
    const didRefresh = await refreshPromise;
    return didRefresh ? retry() : response;
  } finally {
    refreshPromise = null;
  }
};

export const initializeApiClient = async () => {
  const config = await NativeConfigServiceInstance.load();
  const baseURL = config.baseUrl || '';

  init(
    new CapacitorAdapter({
      baseURL,
      defaultHeaders: {
        'X-Source': 'mobile',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      responseInterceptor,
    })
  );
};
