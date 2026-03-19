import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { decodeJwt } from 'jose';
import type { AuthTokens, AuthSession } from '../auth/types';
import { getClient, ApiResponse } from '../lib/http-client';
import type { UserProfile } from '../types/userTypes';

export type { UserProfile };

const STORAGE_KEY = 'USER_ACCOUNT';

class UserService {
  private static instance: UserService;
  private account: AuthSession | null = null;

  private constructor() {}

  static getInstance(): UserService {
    if (!this.instance) {
      this.instance = new UserService();
    }
    return this.instance;
  }

  /**
   * Load account from secure storage on app start.
   * Keeps the account even if access_token is expired — the refresh_token
   * (valid ~30 days) can still recover the session via the 401 refresh flow.
   */
  async init(): Promise<void> {
    try {
      const { value } = await SecureStoragePlugin.get({ key: STORAGE_KEY });
      if (!value) return;

      this.account = JSON.parse(value);
    } catch {
      this.account = null;
    }
  }

  /** Check if user has an active session (may need token refresh if expired) */
  isLoggedIn(): boolean {
    if (!this.account) return false;
    // User is logged in as long as we have tokens — even if access_token is expired,
    // the refresh_token can recover the session via the 401 refresh flow
    return !!this.account.access_token && !!this.account.refresh_token;
  }

  /** Get access token (or null if not logged in) */
  getAccessToken(): string | null {
    return this.account?.access_token ?? null;
  }

  /** Get refresh token (or null) */
  getRefreshToken(): string | null {
    return this.account?.refresh_token ?? null;
  }

  /** Get user ID (sub claim from JWT) */
  getUserId(): string | null {
    return this.account?.userId ?? null;
  }

  /** Get login provider (keycloak or google) */
  getLoginProvider(): 'keycloak' | 'google' | null {
    return this.account?.loginProvider ?? null;
  }

  /** Check if access token is expired */
  isTokenExpired(): boolean {
    if (!this.account) return true;
    return this.account.expires_at <= Date.now();
  }

  /**
   * Save account after successful login.
   * Decodes the JWT to extract userId and expiry, then persists to secure storage.
   */
  async saveAccount(tokens: AuthTokens, provider: 'keycloak' | 'google'): Promise<void> {
    const payload = decodeJwt(tokens.access_token);
    const sub = payload.sub as string;
    if (!sub) {
      throw new Error('LOGIN_FAILED');
    }

    // Keycloak sub format: "f:cassandrafederationid:UUID" — extract the UUID
    const extractedUserId = sub.includes(':') ? sub.split(':').pop()! : sub;

    const expiresAt = payload.exp
      ? payload.exp * 1000
      : Date.now() + 3600 * 1000;

    const account: AuthSession = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? '',
      id_token: tokens.id_token,
      userId: extractedUserId,
      expires_at: expiresAt,
      loginProvider: provider,
    };

    await SecureStoragePlugin.set({
      key: STORAGE_KEY,
      value: JSON.stringify(account),
    });

    this.account = account;
  }

  /** Clear account on logout */
  async clearAccount(): Promise<void> {
    try {
      await SecureStoragePlugin.remove({ key: STORAGE_KEY });
    } catch {
      // Ignore storage errors
    }
    this.account = null;
  }

  /** Fetch user profile from server */
  async userRead(userId: string): Promise<ApiResponse<any>> {
    return getClient().get(
      `/user/v5/read/${userId}?fields=promptTnC,tncLatestVersion,tncLatestVersionUrl`
    );
  }

  /** Accept TnC for the given version */
  async acceptTnC(request: { version: string; userId?: string }): Promise<ApiResponse<any>> {
    return getClient().post('/user/v1/tnc/accept', { request });
  }
}

export const userService = UserService.getInstance();
