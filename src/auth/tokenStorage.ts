import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import type { AuthSession } from './types';

const KEYS = {
  ACCESS_TOKEN: 'AUTH_ACCESS_TOKEN',
  REFRESH_TOKEN: 'AUTH_REFRESH_TOKEN',
  USER_ID: 'AUTH_USER_ID',
  EXPIRES_AT: 'AUTH_EXPIRES_AT',
} as const;

export const saveSession = async (session: AuthSession): Promise<void> => {
  await Promise.all([
    SecureStoragePlugin.set({ key: KEYS.ACCESS_TOKEN, value: session.access_token }),
    SecureStoragePlugin.set({ key: KEYS.REFRESH_TOKEN, value: session.refresh_token }),
    SecureStoragePlugin.set({ key: KEYS.USER_ID, value: session.userId }),
    SecureStoragePlugin.set({ key: KEYS.EXPIRES_AT, value: String(session.expires_at) }),
  ]);
};

export const getSession = async (): Promise<AuthSession | null> => {
  try {
    const [accessToken, refreshToken, userId, expiresAt] = await Promise.all([
      SecureStoragePlugin.get({ key: KEYS.ACCESS_TOKEN }),
      SecureStoragePlugin.get({ key: KEYS.REFRESH_TOKEN }),
      SecureStoragePlugin.get({ key: KEYS.USER_ID }),
      SecureStoragePlugin.get({ key: KEYS.EXPIRES_AT }),
    ]);

    if (!accessToken.value || !refreshToken.value || !userId.value) {
      return null;
    }

    return {
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
      userId: userId.value,
      expires_at: Number(expiresAt.value) || 0,
    };
  } catch {
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  await Promise.all(
    Object.values(KEYS).map((key) =>
      SecureStoragePlugin.remove({ key }).catch(() => {}),
    ),
  );
};
