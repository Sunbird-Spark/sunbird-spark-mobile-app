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
    (socialLoginService as any).initializationPromise = null;
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

      mockInitialize.mockResolvedValue(undefined);
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

    it('should handle concurrent initialization attempts', async () => {
      const webClientId = 'test-web-client-id.apps.googleusercontent.com';
      
      mockInitialize.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(undefined), 50))
      );

      // Start multiple initialization attempts concurrently
      const promises = [
        socialLoginService.initGoogle(webClientId),
        socialLoginService.initGoogle(webClientId),
        socialLoginService.initGoogle(webClientId),
      ];

      await Promise.all(promises);

      // Should only initialize once despite concurrent calls
      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('loginWithGoogle', () => {
    beforeEach(async () => {
      // Initialize the service before login tests
      mockInitialize.mockResolvedValueOnce(undefined);
      await socialLoginService.initGoogle('test-client-id');
    });

    it('should successfully login and return user data (online mode)', async () => {
      const mockResponse = {
        provider: 'google' as const,
        result: {
          responseType: 'online' as const,
          accessToken: { token: 'mock-access-token' },
          idToken: 'mock-id-token',
          profile: {
            email: 'test@example.com',
            familyName: 'Doe',
            givenName: 'John',
            id: 'user-123',
            name: 'John Doe',
            imageUrl: 'https://example.com/photo.jpg',
          },
        },
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.loginWithGoogle();

      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith({ provider: 'google', options: {} });
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        email: 'test@example.com',
        displayName: 'John Doe',
        familyName: 'Doe',
        givenName: 'John',
        imageUrl: 'https://example.com/photo.jpg',
        userId: 'user-123',
        serverAuthCode: undefined,
      });
    });

    it('should handle offline mode response', async () => {
      const mockResponse = {
        provider: 'google' as const,
        result: {
          responseType: 'offline' as const,
          serverAuthCode: 'server-auth-code-123',
        },
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.loginWithGoogle();

      expect(result).toEqual({
        serverAuthCode: 'server-auth-code-123',
      });
    });

    it('should handle partial response data with null values', async () => {
      const mockResponse = {
        provider: 'google' as const,
        result: {
          responseType: 'online' as const,
          accessToken: { token: 'mock-access-token' },
          idToken: null,
          profile: {
            email: 'test@example.com',
            familyName: null,
            givenName: null,
            id: null,
            name: null,
            imageUrl: null,
          },
        },
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.loginWithGoogle();

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        idToken: undefined,
        email: 'test@example.com',
        displayName: undefined,
        familyName: undefined,
        givenName: undefined,
        imageUrl: undefined,
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
    beforeEach(async () => {
      // Initialize the service before login tests
      mockInitialize.mockResolvedValueOnce(undefined);
      await socialLoginService.initGoogle('test-client-id');
    });

    it('should successfully perform silent login', async () => {
      const mockResponse = {
        provider: 'google' as const,
        result: {
          responseType: 'online' as const,
          accessToken: { token: 'silent-access-token' },
          idToken: 'silent-id-token',
          profile: {
            email: 'silent@example.com',
            familyName: 'Smith',
            givenName: 'Jane',
            id: 'user-456',
            name: 'Jane Smith',
            imageUrl: 'https://example.com/jane.jpg',
          },
        },
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.trySilentGoogleLogin();

      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith({
        provider: 'google',
        options: {},
      });
      expect(result).toEqual({
        accessToken: 'silent-access-token',
        idToken: 'silent-id-token',
        email: 'silent@example.com',
        displayName: 'Jane Smith',
        familyName: 'Smith',
        givenName: 'Jane',
        imageUrl: 'https://example.com/jane.jpg',
        userId: 'user-456',
        serverAuthCode: undefined,
      });
    });

    it('should handle silent login failure', async () => {
      const error = new Error('Silent login failed');
      mockLogin.mockRejectedValueOnce(error);

      const result = await socialLoginService.trySilentGoogleLogin();

      expect(result).toBeNull();
    });

    it('should handle expired credentials during silent login', async () => {
      const error = new Error('Credentials expired');
      mockLogin.mockRejectedValueOnce(error);

      const result = await socialLoginService.trySilentGoogleLogin();

      expect(result).toBeNull();
    });

    it('should return partial data on silent login', async () => {
      const mockResponse = {
        provider: 'google' as const,
        result: {
          responseType: 'online' as const,
          accessToken: null,
          idToken: 'silent-id-token',
          profile: {
            email: null,
            familyName: null,
            givenName: null,
            id: 'user-789',
            name: null,
            imageUrl: null,
          },
        },
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.trySilentGoogleLogin();

      expect(result).toEqual({
        accessToken: undefined,
        idToken: 'silent-id-token',
        email: undefined,
        displayName: undefined,
        familyName: undefined,
        givenName: undefined,
        imageUrl: undefined,
        userId: 'user-789',
        serverAuthCode: undefined,
      });
    });
  });

  describe('logoutGoogle', () => {
    beforeEach(async () => {
      // Initialize the service before logout tests
      mockInitialize.mockResolvedValueOnce(undefined);
      await socialLoginService.initGoogle('test-client-id');
    });

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
        provider: 'google' as const,
        result: {
          responseType: 'online' as const,
          accessToken: { token: 'access-token' },
          idToken: 'id-token',
          profile: {
            email: 'user@example.com',
            familyName: 'Doe',
            givenName: 'John',
            id: 'user-123',
            name: 'John Doe',
            imageUrl: null,
          },
        },
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
        provider: 'google' as const,
        result: {
          responseType: 'online' as const,
          accessToken: { token: 'access-token' },
          idToken: null,
          profile: {
            email: 'user@example.com',
            familyName: null,
            givenName: null,
            id: 'user-123',
            name: null,
            imageUrl: null,
          },
        },
      };

      mockInitialize.mockResolvedValueOnce(undefined);
      mockLogin.mockResolvedValueOnce(mockLoginResponse);
      mockLogout.mockResolvedValueOnce(undefined);

      await socialLoginService.initGoogle('test-client-id');
      await socialLoginService.loginWithGoogle();
      await socialLoginService.logoutGoogle();

      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should handle silent login after regular login', async () => {
      const regularLoginResponse = {
        provider: 'google' as const,
        result: {
          responseType: 'online' as const,
          accessToken: { token: 'regular-token' },
          idToken: null,
          profile: {
            email: 'user@example.com',
            familyName: null,
            givenName: null,
            id: 'user-123',
            name: null,
            imageUrl: null,
          },
        },
      };

      const silentLoginResponse = {
        provider: 'google' as const,
        result: {
          responseType: 'online' as const,
          accessToken: { token: 'silent-token' },
          idToken: null,
          profile: {
            email: 'user@example.com',
            familyName: null,
            givenName: null,
            id: 'user-123',
            name: null,
            imageUrl: null,
          },
        },
      };

      mockInitialize.mockResolvedValueOnce(undefined);
      mockLogin
        .mockResolvedValueOnce(regularLoginResponse)
        .mockResolvedValueOnce(silentLoginResponse);

      await socialLoginService.initGoogle('test-client-id');
      await socialLoginService.loginWithGoogle();
      const silentResult = await socialLoginService.trySilentGoogleLogin();

      expect(mockLogin).toHaveBeenCalledTimes(2);
      expect(silentResult?.accessToken).toBe('silent-token');
    });
  });

  describe('Edge cases', () => {
    beforeEach(async () => {
      // Initialize the service before edge case tests
      mockInitialize.mockResolvedValueOnce(undefined);
      await socialLoginService.initGoogle('test-client-id');
    });

    it('should handle empty string values in response', async () => {
      const mockResponse = {
        provider: 'google' as const,
        result: {
          responseType: 'online' as const,
          accessToken: { token: '' },
          idToken: '',
          profile: {
            email: '',
            familyName: '',
            givenName: '',
            id: '',
            name: '',
            imageUrl: '',
          },
        },
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.loginWithGoogle();

      expect(result.accessToken).toBe('');
      expect(result.email).toBe('');
    });

    it('should handle offline mode with serverAuthCode', async () => {
      const mockResponse = {
        provider: 'google' as const,
        result: {
          responseType: 'offline' as const,
          serverAuthCode: 'auth-code-xyz',
        },
      };

      mockLogin.mockResolvedValueOnce(mockResponse);

      const result = await socialLoginService.loginWithGoogle();

      expect(result).toEqual({
        serverAuthCode: 'auth-code-xyz',
      });
    });
  });
});
