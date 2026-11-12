import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginWithCredentials, loginWithGoogleToken, refreshAccessToken } from './keycloakApi';

const { mockPost, mockLoad, mockGetAuthenticatedToken } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockLoad: vi.fn(),
  mockGetAuthenticatedToken: vi.fn(),
}));

vi.mock('../services/HttpService', () => ({
  HttpService: class {
    post = mockPost;
  },
}));

vi.mock('../services/NativeConfigService', () => ({
  NativeConfigServiceInstance: { load: mockLoad },
}));

vi.mock('../services/AppConsumerAuthService', () => ({
  AppConsumerAuthService: {
    getInstance: () => ({ getAuthenticatedToken: mockGetAuthenticatedToken }),
  },
}));

describe('keycloakApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoad.mockResolvedValue({ baseUrl: 'https://api.example.org' });
    mockGetAuthenticatedToken.mockResolvedValue('kong-token');
  });

  // ── loginWithCredentials ───────────────────────────────────────────────────

  describe('loginWithCredentials', () => {
    it('posts credentials to the mobile keycloak login route and returns the tokens', async () => {
      mockPost.mockResolvedValue({ access_token: 'at', refresh_token: 'rt' });

      const tokens = await loginWithCredentials('learner@example.org', 'secret');

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.example.org/api/mobile/keycloak/login',
        { emailId: 'learner@example.org', password: 'secret' }
      );
      expect(tokens).toEqual({ access_token: 'at', refresh_token: 'rt' });
    });

    it('builds the URL from the native config baseUrl', async () => {
      mockLoad.mockResolvedValue({ baseUrl: 'https://other.host' });
      mockPost.mockResolvedValue({ access_token: 'at' });

      await loginWithCredentials('a@b.c', 'p');

      expect(mockPost.mock.calls[0][0]).toBe('https://other.host/api/mobile/keycloak/login');
    });

    it('throws with the backend error message and code on an error envelope', async () => {
      mockPost.mockResolvedValue({ error: 'INVALID_GRANT', error_msg: 'Bad password' });

      await expect(loginWithCredentials('a@b.c', 'wrong')).rejects.toMatchObject({
        message: 'Bad password',
        code: 'INVALID_GRANT',
      });
    });

    it('falls back to a generic message when error_msg is absent', async () => {
      mockPost.mockResolvedValue({ error: 'INVALID_GRANT' });
      await expect(loginWithCredentials('a@b.c', 'wrong')).rejects.toThrow('Login failed');
    });

    it('ignores a falsy error field and returns tokens', async () => {
      mockPost.mockResolvedValue({ error: '', access_token: 'at' });
      await expect(loginWithCredentials('a@b.c', 'p')).resolves.toEqual({
        error: '',
        access_token: 'at',
      });
    });

    it('throws when the response has no access_token', async () => {
      mockPost.mockResolvedValue({ something: 'else' });
      await expect(loginWithCredentials('a@b.c', 'p')).rejects.toThrow('Login failed');
    });

    it('throws when the response is null or not an object', async () => {
      mockPost.mockResolvedValue(null);
      await expect(loginWithCredentials('a@b.c', 'p')).rejects.toThrow('Login failed');

      mockPost.mockResolvedValue('oops');
      await expect(loginWithCredentials('a@b.c', 'p')).rejects.toThrow('Login failed');
    });

    it('propagates transport errors', async () => {
      mockPost.mockRejectedValue(new Error('Network down'));
      await expect(loginWithCredentials('a@b.c', 'p')).rejects.toThrow('Network down');
    });
  });

  // ── loginWithGoogleToken ───────────────────────────────────────────────────

  describe('loginWithGoogleToken', () => {
    it('sends the Google ID token header plus the Kong bearer token', async () => {
      mockPost.mockResolvedValue({ access_token: 'at' });

      const tokens = await loginWithGoogleToken('google-id-token', 'a@b.c', 'Ada');

      expect(mockGetAuthenticatedToken).toHaveBeenCalledOnce();
      expect(mockPost).toHaveBeenCalledWith(
        'https://api.example.org/mobile/google/auth/android',
        { emailId: 'a@b.c', name: 'Ada' },
        {
          'X-GOOGLE-ID-TOKEN': 'google-id-token',
          Authorization: 'Bearer kong-token',
        }
      );
      expect(tokens).toEqual({ access_token: 'at' });
    });

    it('sends an undefined name when none is supplied', async () => {
      mockPost.mockResolvedValue({ access_token: 'at' });
      await loginWithGoogleToken('idt', 'a@b.c');
      expect(mockPost.mock.calls[0][1]).toEqual({ emailId: 'a@b.c', name: undefined });
    });

    it('throws with msg and code when the backend returns an error envelope', async () => {
      mockPost.mockResolvedValue({ error: 'USER_NOT_FOUND', msg: 'No such user' });

      await expect(loginWithGoogleToken('idt', 'a@b.c')).rejects.toMatchObject({
        message: 'No such user',
        code: 'USER_NOT_FOUND',
      });
    });

    it('falls back to error_msg then a generic message', async () => {
      mockPost.mockResolvedValue({ error: 'E', error_msg: 'Detailed failure' });
      await expect(loginWithGoogleToken('idt', 'a@b.c')).rejects.toThrow('Detailed failure');

      mockPost.mockResolvedValue({ error: 'E' });
      await expect(loginWithGoogleToken('idt', 'a@b.c')).rejects.toThrow('Google sign-in failed');
    });

    it('throws the msg when the backend returns msg without tokens and no error field', async () => {
      mockPost.mockResolvedValue({ msg: 'Email not registered' });
      await expect(loginWithGoogleToken('idt', 'a@b.c')).rejects.toThrow('Email not registered');
    });

    it('accepts a response carrying both msg and access_token', async () => {
      mockPost.mockResolvedValue({ msg: 'created', access_token: 'at' });
      await expect(loginWithGoogleToken('idt', 'a@b.c')).resolves.toMatchObject({
        access_token: 'at',
      });
    });

    it('throws when no tokens come back at all', async () => {
      mockPost.mockResolvedValue({});
      await expect(loginWithGoogleToken('idt', 'a@b.c')).rejects.toThrow('Google sign-in failed');
    });

    it('propagates a Kong token failure without calling the backend', async () => {
      mockGetAuthenticatedToken.mockRejectedValue(new Error('kong unreachable'));
      await expect(loginWithGoogleToken('idt', 'a@b.c')).rejects.toThrow('kong unreachable');
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  // ── refreshAccessToken ─────────────────────────────────────────────────────

  describe('refreshAccessToken', () => {
    it('posts the refresh token with the current bearer token and unwraps result.data', async () => {
      mockPost.mockResolvedValue({
        result: { data: { access_token: 'new-at', refresh_token: 'new-rt', id_token: 'new-it' } },
      });

      const tokens = await refreshAccessToken('rt', 'at');

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.example.org/mobile/auth/v1/refresh/token',
        { refresh_token: 'rt' },
        { Authorization: 'Bearer at' }
      );
      expect(tokens).toEqual({
        access_token: 'new-at',
        refresh_token: 'new-rt',
        id_token: 'new-it',
      });
      expect(mockPost).toHaveBeenCalledOnce();
    });

    it('retries a SERVER_ERROR response and succeeds on a later attempt', async () => {
      mockPost
        .mockResolvedValueOnce({ responseCode: 'SERVER_ERROR', params: { errmsg: 'boom' } })
        .mockResolvedValueOnce({ result: { data: { access_token: 'at2' } } });

      await expect(refreshAccessToken('rt', 'at')).resolves.toMatchObject({
        access_token: 'at2',
      });
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('gives up after 3 attempts on persistent SERVER_ERROR and marks isServerError', async () => {
      mockPost.mockResolvedValue({
        responseCode: 'SERVER_ERROR',
        params: { errmsg: 'still broken', err: 'SRV' },
      });

      await expect(refreshAccessToken('rt', 'at')).rejects.toMatchObject({
        message: 'still broken',
        code: 'SRV',
        isServerError: true,
      });
      expect(mockPost).toHaveBeenCalledTimes(3);
    });

    it('surfaces a client error with isServerError false after exhausting attempts', async () => {
      mockPost.mockResolvedValue({
        responseCode: 'CLIENT_ERROR',
        params: { errmsg: 'Invalid refresh token', err: 'INVALID_TOKEN' },
      });

      await expect(refreshAccessToken('rt', 'at')).rejects.toMatchObject({
        message: 'Invalid refresh token',
        code: 'INVALID_TOKEN',
        isServerError: false,
      });
      expect(mockPost).toHaveBeenCalledTimes(3);
    });

    it('defaults the message and code when params are missing', async () => {
      mockPost.mockResolvedValue({});
      await expect(refreshAccessToken('rt', 'at')).rejects.toMatchObject({
        message: 'Token refresh failed',
        code: 'REFRESH_FAILED',
      });
    });

    it('uses params.err as the message when errmsg is absent', async () => {
      mockPost.mockResolvedValue({ params: { err: 'BAD_REQUEST' } });
      await expect(refreshAccessToken('rt', 'at')).rejects.toThrow('BAD_REQUEST');
    });

    it('retries transport failures and rethrows the last one', async () => {
      mockPost.mockRejectedValue(new Error('offline'));
      await expect(refreshAccessToken('rt', 'at')).rejects.toThrow('offline');
      expect(mockPost).toHaveBeenCalledTimes(3);
    });

    it('recovers when only the first transport attempt fails', async () => {
      mockPost
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce({ result: { data: { access_token: 'at3' } } });

      await expect(refreshAccessToken('rt', 'at')).resolves.toEqual({
        access_token: 'at3',
        refresh_token: undefined,
        id_token: undefined,
      });
      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });
});
