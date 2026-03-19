import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { decodeJwt } from 'jose';
import type { AuthTokens, AuthSession } from '../auth/types';

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
   * If the token is expired, clears the account (user must re-login).
   */
  async init(): Promise<void> {
    try {
      const { value } = await SecureStoragePlugin.get({ key: STORAGE_KEY });
      if (!value) return;

      const account: AuthSession = JSON.parse(value);

      if (account.expires_at <= Date.now()) {
        await this.clearAccount();
        return;
      }

      this.account = account;
    } catch {
      this.account = null;
    }
  }

  /** Check if user is currently logged in with a valid (non-expired) token */
  isLoggedIn(): boolean {
    return this.account !== null && this.account.expires_at > Date.now();
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

    const expiresAt = payload.exp
      ? payload.exp * 1000
      : Date.now() + 3600 * 1000;

    const account: AuthSession = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? '',
      id_token: tokens.id_token,
      userId: sub,
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
}

export const userService = UserService.getInstance();
