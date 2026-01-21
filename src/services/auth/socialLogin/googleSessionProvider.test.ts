import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoogleLoginResult } from './socialLogin.service';
import { NativeGoogleSessionProvider } from './googleSessionProvider';

describe('NativeGoogleSessionProvider', () => {
  describe('constructor', () => {
    it('should create instance with async getResult function', () => {
      const getResult = async (): Promise<GoogleLoginResult> => ({
        accessToken: 'token',
        idToken: 'id',
        email: 'test@example.com',
      });

      const provider = new NativeGoogleSessionProvider(getResult);

      expect(provider).toBeInstanceOf(NativeGoogleSessionProvider);
    });

    it('should create instance with sync getResult function', () => {
      const getResult = (): GoogleLoginResult => ({
        accessToken: 'token',
        idToken: 'id',
        email: 'test@example.com',
      });

      const provider = new NativeGoogleSessionProvider(getResult);

      expect(provider).toBeInstanceOf(NativeGoogleSessionProvider);
    });
  });

  describe('provide', () => {
    it('should return session data with all fields from async getResult', async () => {
      const mockResult: GoogleLoginResult = {
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        serverAuthCode: 'mock-server-auth-code',
        email: 'user@example.com',
        userId: 'user-123',
        displayName: 'John Doe',
        familyName: 'Doe',
        givenName: 'John',
        imageUrl: 'https://example.com/avatar.jpg',
      };

      const getResult = async () => mockResult;
      const provider = new NativeGoogleSessionProvider(getResult);

      const result = await provider.provide();

      expect(result).toEqual({
        idToken: 'mock-id-token',
        accessToken: 'mock-access-token',
        serverAuthCode: 'mock-server-auth-code',
        email: 'user@example.com',
        userId: 'user-123',
      });
    });

    it('should return session data with all fields from sync getResult', async () => {
      const mockResult: GoogleLoginResult = {
        accessToken: 'sync-access-token',
        idToken: 'sync-id-token',
        serverAuthCode: 'sync-server-auth-code',
        email: 'sync@example.com',
        userId: 'sync-user-123',
      };

      const getResult = () => mockResult;
      const provider = new NativeGoogleSessionProvider(getResult);

      const result = await provider.provide();

      expect(result).toEqual({
        idToken: 'sync-id-token',
        accessToken: 'sync-access-token',
        serverAuthCode: 'sync-server-auth-code',
        email: 'sync@example.com',
        userId: 'sync-user-123',
      });
    });

    it('should handle partial data with only required fields', async () => {
      const mockResult: GoogleLoginResult = {
        idToken: 'id-token-only',
      };

      const getResult = async () => mockResult;
      const provider = new NativeGoogleSessionProvider(getResult);

      const result = await provider.provide();

      expect(result).toEqual({
        idToken: 'id-token-only',
        accessToken: undefined,
        serverAuthCode: undefined,
        email: undefined,
        userId: undefined,
      });
    });

    it('should handle empty GoogleLoginResult', async () => {
      const mockResult: GoogleLoginResult = {};

      const getResult = async () => mockResult;
      const provider = new NativeGoogleSessionProvider(getResult);

      const result = await provider.provide();

      expect(result).toEqual({
        idToken: undefined,
        accessToken: undefined,
        serverAuthCode: undefined,
        email: undefined,
        userId: undefined,
      });
    });

    it('should only include session-relevant fields and ignore extra fields', async () => {
      const mockResult: GoogleLoginResult = {
        accessToken: 'access-token',
        idToken: 'id-token',
        email: 'user@example.com',
        displayName: 'John Doe',
        familyName: 'Doe',
        givenName: 'John',
        imageUrl: 'https://example.com/avatar.jpg',
      };

      const getResult = async () => mockResult;
      const provider = new NativeGoogleSessionProvider(getResult);

      const result = await provider.provide();

      // displayName, familyName, givenName, imageUrl should not be in result
      expect(result).not.toHaveProperty('displayName');
      expect(result).not.toHaveProperty('familyName');
      expect(result).not.toHaveProperty('givenName');
      expect(result).not.toHaveProperty('imageUrl');
      expect(result).toEqual({
        accessToken: 'access-token',
        idToken: 'id-token',
        email: 'user@example.com',
        serverAuthCode: undefined,
        userId: undefined,
      });
    });

    it('should call getResult function when provide is called', async () => {
      const mockResult: GoogleLoginResult = {
        accessToken: 'token',
        idToken: 'id',
      };

      const getResult = vi.fn().mockResolvedValue(mockResult);
      const provider = new NativeGoogleSessionProvider(getResult);

      await provider.provide();

      expect(getResult).toHaveBeenCalledTimes(1);
    });

    it('should call getResult on each provide call', async () => {
      const mockResult: GoogleLoginResult = {
        accessToken: 'token',
        idToken: 'id',
      };

      const getResult = vi.fn().mockResolvedValue(mockResult);
      const provider = new NativeGoogleSessionProvider(getResult);

      await provider.provide();
      await provider.provide();
      await provider.provide();

      expect(getResult).toHaveBeenCalledTimes(3);
    });

    it('should handle getResult throwing an error', async () => {
      const error = new Error('Failed to get result');
      const getResult = async () => {
        throw error;
      };

      const provider = new NativeGoogleSessionProvider(getResult);

      await expect(provider.provide()).rejects.toThrow('Failed to get result');
    });

    it('should propagate errors from sync getResult', async () => {
      const error = new Error('Sync error');
      const getResult = () => {
        throw error;
      };

      const provider = new NativeGoogleSessionProvider(getResult);

      await expect(provider.provide()).rejects.toThrow('Sync error');
    });
  });

  describe('Integration scenarios', () => {
    it('should work with multiple providers using same getResult', async () => {
      const mockResult: GoogleLoginResult = {
        accessToken: 'shared-token',
        idToken: 'shared-id',
        email: 'shared@example.com',
      };

      const getResult = async () => mockResult;
      const provider1 = new NativeGoogleSessionProvider(getResult);
      const provider2 = new NativeGoogleSessionProvider(getResult);

      const result1 = await provider1.provide();
      const result2 = await provider2.provide();

      expect(result1).toEqual(result2);
    });

    it('should handle dynamic getResult that returns different values', async () => {
      let callCount = 0;
      const getResult = async (): Promise<GoogleLoginResult> => {
        callCount++;
        return {
          accessToken: `token-${callCount}`,
          email: `user${callCount}@example.com`,
        };
      };

      const provider = new NativeGoogleSessionProvider(getResult);

      const result1 = await provider.provide();
      const result2 = await provider.provide();

      expect(result1.accessToken).toBe('token-1');
      expect(result2.accessToken).toBe('token-2');
      expect(result1.email).toBe('user1@example.com');
      expect(result2.email).toBe('user2@example.com');
    });

    it('should work with getResult that returns promise wrapping result', async () => {
      const mockResult: GoogleLoginResult = {
        accessToken: 'promise-token',
        idToken: 'promise-id',
        userId: 'promise-user',
      };

      const getResult = () => Promise.resolve(mockResult);
      const provider = new NativeGoogleSessionProvider(getResult);

      const result = await provider.provide();

      expect(result).toEqual({
        idToken: 'promise-id',
        accessToken: 'promise-token',
        serverAuthCode: undefined,
        email: undefined,
        userId: 'promise-user',
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle null values in result', async () => {
      const mockResult = {
        accessToken: null as any,
        idToken: null as any,
        email: null as any,
      };

      const getResult = async () => mockResult;
      const provider = new NativeGoogleSessionProvider(getResult);

      const result = await provider.provide();

      expect(result).toEqual({
        accessToken: null,
        idToken: null,
        serverAuthCode: undefined,
        email: null,
        userId: undefined,
      });
    });

    it('should handle empty strings in result', async () => {
      const mockResult: GoogleLoginResult = {
        accessToken: '',
        idToken: '',
        email: '',
        userId: '',
        serverAuthCode: '',
      };

      const getResult = async () => mockResult;
      const provider = new NativeGoogleSessionProvider(getResult);

      const result = await provider.provide();

      expect(result).toEqual({
        accessToken: '',
        idToken: '',
        email: '',
        userId: '',
        serverAuthCode: '',
      });
    });

    it('should handle getResult returning after delay', async () => {
      const mockResult: GoogleLoginResult = {
        accessToken: 'delayed-token',
        idToken: 'delayed-id',
      };

      const getResult = () =>
        new Promise<GoogleLoginResult>((resolve) => {
          setTimeout(() => resolve(mockResult), 50);
        });

      const provider = new NativeGoogleSessionProvider(getResult);

      const result = await provider.provide();

      expect(result.accessToken).toBe('delayed-token');
      expect(result.idToken).toBe('delayed-id');
    });

    it('should handle special characters in token values', async () => {
      const mockResult: GoogleLoginResult = {
        accessToken: 'token-with-special-chars-!@#$%^&*()',
        idToken: 'id-token-with-unicode-日本語',
        email: 'user+tag@example.com',
        serverAuthCode: 'auth-code-with-equals==',
      };

      const getResult = async () => mockResult;
      const provider = new NativeGoogleSessionProvider(getResult);

      const result = await provider.provide();

      expect(result.accessToken).toBe('token-with-special-chars-!@#$%^&*()');
      expect(result.idToken).toBe('id-token-with-unicode-日本語');
      expect(result.email).toBe('user+tag@example.com');
      expect(result.serverAuthCode).toBe('auth-code-with-equals==');
    });
  });
});
