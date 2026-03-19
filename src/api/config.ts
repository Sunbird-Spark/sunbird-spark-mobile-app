import { init } from '../lib/http-client';
import { CapacitorAdapter } from '../lib/http-client/adapters/CapacitorAdapter';
import { NativeConfigServiceInstance } from '../services/NativeConfigService';
import { userService } from '../services/UserService';
import { refreshAccessToken } from '../auth/keycloakApi';

let isRefreshing = false;

/**
 * Handles 401 responses by attempting a token refresh.
 * If refresh succeeds, updates stored tokens and HTTP headers.
 * If refresh fails (including 3x 500 retries), clears session.
 */
const handle401 = async () => {
  if (isRefreshing) return;

  const refreshToken = userService.getRefreshToken();
  const accessToken = userService.getAccessToken();

  // If tokens are missing or partial, clear the corrupt session
  if (!refreshToken || !accessToken) {
    await userService.clearAccount();
    return;
  }

  isRefreshing = true;

  try {

    const tokens = await refreshAccessToken(refreshToken, accessToken);

    // Save new tokens — preserve the original login provider
    await userService.saveAccount(tokens, userService.getLoginProvider() ?? 'keycloak');

    // Update HTTP header with new access token
    const { getClient } = await import('../lib/http-client');
    const httpClient = getClient();
    httpClient.updateHeaders([
      { key: 'X-Authenticated-User-Token', value: tokens.access_token, action: 'add' },
    ]);
  } catch (err) {
    await userService.clearAccount();

    // Remove user token header
    try {
      const { getClient } = await import('../lib/http-client');
      const httpClient = getClient();
      httpClient.updateHeaders([
        { key: 'X-Authenticated-User-Token', value: '', action: 'remove' },
      ]);
    } catch {
      // Ignore
    }
  } finally {
    isRefreshing = false;
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
      statusHandlers: {
        401: () => {
          handle401();
        },
        403: () => {
          console.log('Access denied');
        },
      },
    })
  );
};
