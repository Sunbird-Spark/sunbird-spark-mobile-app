import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Capacitor Social Login plugin
const mockInitialize = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: {
    initialize: (...args: any[]) => mockInitialize(...args),
    login: (...args: any[]) => mockLogin(...args),
    logout: (...args: any[]) => mockLogout(...args),
  },
}));

import { socialLoginService } from './socialLogin.service';

describe('SocialLoginService', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    // Reset the initialized state by creating a new instance
    (socialLoginService as any).initialized = false;
  });

  describe('initGoogle', () => {
    it('should initialize Google login with webClientId', async () => {
      const webClientId = 'test-web-client-id.apps.googleusercontent.com';

      await socialLoginService.initGoogle(webClientId);

      expect(mockInitialize).toHaveBeenCalledTimes(1);
      expect(mockInitialize).toHaveBeenCalledWith({
        google: {
          webClientId,
        },
      });
    });

    it('should not initialize twice if already initialized', async () => {
      const webClientId = 'test-web-client-id.apps.googleusercontent.com';

      await socialLoginService.initGoogle(webClientId);
      await socialLoginService.initGoogle(webClientId);

      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      const webClientId = 'test-web-client-id.apps.googleusercontent.com';
      const error = new Error('Initialization failed');
      mockInitialize.mockRejectedValueOnce(error);

      await expect(socialLoginService.initGoogle(webClientId)).rejects.toThrow(
        'Initialization failed',
      );
    });
  });

  describe('loginWithGoogle', () => {
    it('should successfully login and return user data', async () => {
      const mockResponse = {
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        email: 'test@example.com',
        userId: 'user-123',
        serverAuthCode: 'server-auth-code-123',
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.loginWithGoogle();

      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith({ provider: 'google' });
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        email: 'test@example.com',
        userId: 'user-123',
        serverAuthCode: 'server-auth-code-123',
      });
    });

    it('should handle partial response data', async () => {
      const mockResponse = {
        accessToken: 'mock-access-token',
        email: 'test@example.com',
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.loginWithGoogle();

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        idToken: undefined,
        email: 'test@example.com',
        userId: undefined,
        serverAuthCode: undefined,
      });
    });

    it('should handle login errors', async () => {
      const error = new Error('Login failed');
      mockLogin.mockRejectedValueOnce(error);

      await expect(socialLoginService.loginWithGoogle()).rejects.toThrow('Login failed');
    });

    it('should handle user cancellation', async () => {
      const cancelError = new Error('User cancelled');
      mockLogin.mockRejectedValueOnce(cancelError);

      await expect(socialLoginService.loginWithGoogle()).rejects.toThrow('User cancelled');
    });
  });

  describe('trySilentGoogleLogin', () => {
    it('should successfully perform silent login', async () => {
      const mockResponse = {
        accessToken: 'silent-access-token',
        idToken: 'silent-id-token',
        email: 'silent@example.com',
        userId: 'user-456',
        serverAuthCode: 'silent-server-auth-code',
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.trySilentGoogleLogin();

      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith({
        provider: 'google',
        options: { silent: true },
      });
      expect(result).toEqual({
        accessToken: 'silent-access-token',
        idToken: 'silent-id-token',
        email: 'silent@example.com',
        userId: 'user-456',
        serverAuthCode: 'silent-server-auth-code',
      });
    });

    it('should handle silent login failure', async () => {
      const error = new Error('Silent login failed');
      mockLogin.mockRejectedValueOnce(error);

      await expect(socialLoginService.trySilentGoogleLogin()).rejects.toThrow(
        'Silent login failed',
      );
    });

    it('should handle expired credentials during silent login', async () => {
      const error = new Error('Credentials expired');
      mockLogin.mockRejectedValueOnce(error);

      await expect(socialLoginService.trySilentGoogleLogin()).rejects.toThrow(
        'Credentials expired',
      );
    });

    it('should return partial data on silent login', async () => {
      const mockResponse = {
        idToken: 'silent-id-token',
        userId: 'user-789',
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.trySilentGoogleLogin();

      expect(result).toEqual({
        accessToken: undefined,
        idToken: 'silent-id-token',
        email: undefined,
        userId: 'user-789',
        serverAuthCode: undefined,
      });
    });
  });

  describe('logoutGoogle', () => {
    it('should successfully logout from Google', async () => {
      mockLogout.mockResolvedValueOnce(undefined);

      await socialLoginService.logoutGoogle();

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockLogout).toHaveBeenCalledWith({ provider: 'google' });
    });

    it('should handle logout errors', async () => {
      const error = new Error('Logout failed');
      mockLogout.mockRejectedValueOnce(error);

      await expect(socialLoginService.logoutGoogle()).rejects.toThrow('Logout failed');
    });

    it('should logout even if user is not logged in', async () => {
      mockLogout.mockResolvedValueOnce(undefined);

      await socialLoginService.logoutGoogle();

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full login flow', async () => {
      const webClientId = 'test-client-id.apps.googleusercontent.com';
      const mockLoginResponse = {
        accessToken: 'access-token',
        idToken: 'id-token',
        email: 'user@example.com',
        userId: 'user-123',
        serverAuthCode: 'auth-code',
      };

      mockInitialize.mockResolvedValueOnce(undefined);
      mockLogin.mockResolvedValueOnce(mockLoginResponse);

      await socialLoginService.initGoogle(webClientId);
      const result = await socialLoginService.loginWithGoogle();

      expect(mockInitialize).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(result.email).toBe('user@example.com');
    });

    it('should handle login and logout flow', async () => {
      const mockLoginResponse = {
        accessToken: 'access-token',
        email: 'user@example.com',
        userId: 'user-123',
      };

      mockLogin.mockResolvedValueOnce(mockLoginResponse);
      mockLogout.mockResolvedValueOnce(undefined);

      await socialLoginService.loginWithGoogle();
      await socialLoginService.logoutGoogle();

      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should handle silent login after regular login', async () => {
      const regularLoginResponse = {
        accessToken: 'regular-token',
        email: 'user@example.com',
        userId: 'user-123',
      };

      const silentLoginResponse = {
        accessToken: 'silent-token',
        email: 'user@example.com',
        userId: 'user-123',
      };

      mockLogin
        .mockResolvedValueOnce(regularLoginResponse)
        .mockResolvedValueOnce(silentLoginResponse);

      await socialLoginService.loginWithGoogle();
      const silentResult = await socialLoginService.trySilentGoogleLogin();

      expect(mockLogin).toHaveBeenCalledTimes(2);
      expect(silentResult.accessToken).toBe('silent-token');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string values in response', async () => {
      const mockResponse = {
        accessToken: '',
        idToken: '',
        email: '',
        userId: '',
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.loginWithGoogle();

      expect(result.accessToken).toBe('');
      expect(result.email).toBe('');
    });

    it('should handle response with extra properties', async () => {
      const mockResponse = {
        accessToken: 'token',
        email: 'user@example.com',
        extraProp1: 'extra1',
        extraProp2: 'extra2',
        serverAuthCode: 'auth-code',
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.loginWithGoogle();

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('serverAuthCode');
    });
  });
});
