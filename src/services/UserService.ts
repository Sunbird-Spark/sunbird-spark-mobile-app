import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { decodeJwt } from 'jose';
import type { AuthTokens, AuthSession } from '../auth/types';
import { getClient, ApiResponse } from '../lib/http-client';
import { buildOfflineResponse } from '../lib/http-client/offlineResponse';
import { userDbService } from './db/UserDbService';
import type { UserType } from './db/UserDbService';
import { enrolledCoursesDbService } from './db/EnrolledCoursesDbService';
import { keyValueDbService, KVKey } from './db/KeyValueDbService';
import { networkService } from './network/networkService';
import { networkQueueDbService } from './db/NetworkQueueDbService';
import { courseAssessmentDbService } from './db/CourseAssessmentDbService';

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

  /** Clear account on logout — removes session token and all user-specific SQLite data. */
  async clearAccount(): Promise<void> {
    const userId = this.getUserId();

    if (userId) {
      await Promise.allSettled([
        enrolledCoursesDbService.deleteAllForUser(userId),
        userDbService.delete(userId),
        keyValueDbService.deleteByPrefix(`cache:content_state_${userId}_`),
        // active_channel_id is resolved from the user's org on login — must be
        // cleared so a different user logging in next gets their own channel resolved.
        keyValueDbService.delete(KVKey.ACTIVE_CHANNEL_ID),
        networkQueueDbService.clearCourseData(),
        courseAssessmentDbService.clearAllForUser(userId),
      ]);
    }

    try {
      await SecureStoragePlugin.remove({ key: STORAGE_KEY });
    } catch {
      // Ignore storage errors
    }
    this.account = null;
  }

  /** Returns display name from a user profile (firstName + lastName) or null */
  getDisplayName(profile: { firstName?: string; lastName?: string } | null | undefined): string | null {
    if (!profile) return null;
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    return name || null;
  }

  /** Fetch user profile from server */
  async userRead(userId: string): Promise<ApiResponse<any>> {
    if (!networkService.isConnected()) {
      return this.readUserFromDb(userId);
    }

    try {
      const fields = [
        'promptTnC',
        'tncLatestVersion',
        'tncLatestVersionUrl',
        'userName',
        'phone',
        'email',
        'recoveryEmail',
        'roles',
        'organisations',
        'framework',
      ].join(',');
      const response = await getClient().get(`/user/v5/read/${userId}?fields=${fields}`);

      try {
        const profile = (response.data as any)?.response;
        if (profile) {
          const provider = this.getLoginProvider();
          const userType: UserType = provider === 'google' ? 'GOOGLE' : 'KEYCLOAK';
          await userDbService.upsert({
            id: userId,
            details: {
              displayName: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || undefined,
              email: profile.email,
              imageUrl: profile.avatar,
              roles: Array.isArray(profile.roles) ? profile.roles : undefined,
            },
            user_type: userType,
            created_on: profile.createdDate ? new Date(profile.createdDate).getTime() : Date.now(),
          });
        }
      } catch (err) {
        console.warn('[UserService] Failed to cache user profile to SQLite:', err);
      }

      return response;
    } catch {
      return this.readUserFromDb(userId);
    }
  }

  private async readUserFromDb(userId: string): Promise<ApiResponse<any>> {
    const user = await userDbService.getById(userId);
    return buildOfflineResponse({ response: user?.details ?? {} });
  }

  /** Update user profile fields */
  async updateUser(request: Record<string, unknown>): Promise<ApiResponse<any>> {
    return getClient().patch('/user/v3/update', { request });
  }

  /** Accept TnC for the given version */
  async acceptTnC(request: { version: string; userId?: string }): Promise<ApiResponse<any>> {
    return getClient().post('/user/v1/tnc/accept', { request });
  }
}

export const userService = UserService.getInstance();
