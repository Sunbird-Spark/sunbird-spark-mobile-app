import { HttpService } from '../services/HttpService';
import { NativeConfigServiceInstance } from '../services/NativeConfigService';
import type { AuthTokens, AuthApiError } from './types';

const httpService = new HttpService();

/**
 * Calls POST /mobile/keycloak/login on the backend.
 * The backend handles Keycloak ROPC internally — we just send emailId + password as JSON.
 */
export const loginWithCredentials = async (
  emailId: string,
  password: string,
): Promise<AuthTokens> => {
  const config = await NativeConfigServiceInstance.load();
  const baseUrl = config.baseUrl;

  const data = await httpService.post<AuthTokens | AuthApiError>(
    `${baseUrl}/mobile/keycloak/login`,
    { emailId, password },
  );

  // Backend returns { error, error_msg } on failure (CapacitorHttp doesn't throw on 4xx)
  if (data && typeof data === 'object' && 'error' in data && (data as AuthApiError).error) {
    const errorData = data as AuthApiError;
    const err = new Error(errorData.error_msg || 'Login failed');
    (err as any).code = errorData.error;
    throw err;
  }

  // Verify we actually got tokens back
  if (!data || typeof data !== 'object' || !('access_token' in data)) {
    throw new Error('Login failed');
  }

  return data as AuthTokens;
};
