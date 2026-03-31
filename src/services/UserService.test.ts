import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from './UserService';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { decodeJwt } from 'jose';
import { userDbService } from './db/UserDbService';
import { networkService } from './network/networkService';

vi.mock('capacitor-secure-storage-plugin', () => ({
    SecureStoragePlugin: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
    },
}));

vi.mock('jose', () => ({
    decodeJwt: vi.fn(),
}));

vi.mock('./db/UserDbService', () => ({
    userDbService: {
        upsert: vi.fn(),
        getById: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('./db/EnrolledCoursesDbService', () => ({
    enrolledCoursesDbService: {
        deleteAllForUser: vi.fn(),
    },
}));

vi.mock('./db/KeyValueDbService', () => ({
    keyValueDbService: {
        deleteByPrefix: vi.fn(),
        delete: vi.fn(),
    },
    KVKey: {
        ACTIVE_CHANNEL_ID: 'active_channel_id',
    },
}));

vi.mock('./db/NetworkQueueDbService', () => ({
    networkQueueDbService: {
        clearCourseData: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('./db/CourseAssessmentDbService', () => ({
    courseAssessmentDbService: {
        clearAllForUser: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('./network/networkService', () => ({
    networkService: {
        isConnected: vi.fn().mockReturnValue(true),
    },
}));

vi.mock('../lib/http-client', () => ({
    getClient: vi.fn().mockReturnValue({
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
    }),
}));

describe('UserService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset private account state via init if possible, or just accept instance singleton
        (userService as any).account = null;
    });

    it('initializes from secure storage', async () => {
        const mockSession = { access_token: 'at', refresh_token: 'rt', userId: 'u1' };
        vi.mocked(SecureStoragePlugin.get).mockResolvedValue({ value: JSON.stringify(mockSession) });

        await userService.init();
        expect(userService.isLoggedIn()).toBe(true);
        expect(userService.getUserId()).toBe('u1');
    });

    it('handles empty storage during init', async () => {
        vi.mocked(SecureStoragePlugin.get).mockResolvedValue({ value: null });
        await userService.init();
        expect(userService.isLoggedIn()).toBe(false);
    });

    it('handles storage error during init', async () => {
        vi.mocked(SecureStoragePlugin.get).mockRejectedValue(new Error('fail'));
        await userService.init();
        expect(userService.isLoggedIn()).toBe(false);
    });

    it('returns tokens and userId correctly', async () => {
        (userService as any).account = { access_token: 'at', refresh_token: 'rt', userId: 'u1', loginProvider: 'google' };
        expect(userService.getAccessToken()).toBe('at');
        expect(userService.getRefreshToken()).toBe('rt');
        expect(userService.getUserId()).toBe('u1');
        expect(userService.getLoginProvider()).toBe('google');
    });

    it('checks token expiry', async () => {
        const now = Date.now();
        (userService as any).account = { expires_at: now - 1000 };
        expect(userService.isTokenExpired()).toBe(true);

        (userService as any).account = { expires_at: now + 10000 };
        expect(userService.isTokenExpired()).toBe(false);
    });

    it('saves account after decoding JWT', async () => {
        vi.mocked(decodeJwt).mockReturnValue({ sub: 'f:id:uuid123', exp: Math.floor(Date.now() / 1000) + 3600 });

        await userService.saveAccount({ access_token: 'at', refresh_token: 'rt' }, 'keycloak');

        expect(userService.getUserId()).toBe('uuid123');
        expect(SecureStoragePlugin.set).toHaveBeenCalledWith(expect.objectContaining({
            key: 'USER_ACCOUNT',
            value: expect.stringContaining('uuid123')
        }));
    });

    it('saves account using sub directly if no colon', async () => {
        vi.mocked(decodeJwt).mockReturnValue({ sub: 'plain_id' });
        await userService.saveAccount({ access_token: 'at' }, 'google');
        expect(userService.getUserId()).toBe('plain_id');
    });

    it('throws error if sub is missing in JWT', async () => {
        vi.mocked(decodeJwt).mockReturnValue({});
        await expect(userService.saveAccount({ access_token: 'at' }, 'google')).rejects.toThrow('LOGIN_FAILED');
    });

    it('clears account and associated data on logout', async () => {
        const { networkQueueDbService } = await import('./db/NetworkQueueDbService');
        const { courseAssessmentDbService } = await import('./db/CourseAssessmentDbService');
        const { keyValueDbService: kvDb, KVKey } = await import('./db/KeyValueDbService');

        (userService as any).account = { userId: 'u1' };
        await userService.clearAccount();

        expect(SecureStoragePlugin.remove).toHaveBeenCalled();
        expect(userDbService.delete).toHaveBeenCalledWith('u1');
        expect(userService.isLoggedIn()).toBe(false);
        expect(networkQueueDbService.clearCourseData).toHaveBeenCalled();
        expect(courseAssessmentDbService.clearAllForUser).toHaveBeenCalledWith('u1');
        // active_channel_id must be cleared so the next user gets their own channel resolved
        expect(kvDb.delete).toHaveBeenCalledWith(KVKey.ACTIVE_CHANNEL_ID);
    });

    it('still clears secure storage when userId is missing', async () => {
        (userService as any).account = null;
        await userService.clearAccount();
        expect(SecureStoragePlugin.remove).toHaveBeenCalled();
    });

    it('gets display name correctly', () => {
        expect(userService.getDisplayName({ firstName: 'John', lastName: 'Doe' })).toBe('John Doe');
        expect(userService.getDisplayName({ firstName: 'Solo' })).toBe('Solo');
        expect(userService.getDisplayName(null)).toBeNull();
        expect(userService.getDisplayName({})).toBeNull();
    });

    it('reads user from server and caches to DB', async () => {
        const mockProfile = { response: { firstName: 'John', email: 'j@j.com' } };
        const { getClient } = await import('../lib/http-client');
        vi.mocked(getClient().get).mockResolvedValue({ data: mockProfile } as any);

        const result = await userService.userRead('u1');
        expect(result.data).toEqual(mockProfile);
        expect(userDbService.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }));
    });

    it('warns when caching user profile fails', async () => {
        const mockProfile = { response: { firstName: 'John' } };
        const { getClient } = await import('../lib/http-client');
        vi.mocked(getClient().get).mockResolvedValue({ data: mockProfile } as any);
        vi.mocked(userDbService.upsert).mockRejectedValue(new Error('upsert fail'));

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        await userService.userRead('u1');
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to cache'), expect.anything());
        consoleSpy.mockRestore();
    });

    it('falls back to DB when offline or server fails', async () => {
        vi.mocked(networkService.isConnected).mockReturnValue(false);
        vi.mocked(userDbService.getById).mockResolvedValue({ details: { firstName: 'Cached' } } as any);

        const result = await userService.userRead('u1');
        expect(result.data.response.firstName).toBe('Cached');
    });

    it('proxies updateUser and acceptTnC to client', async () => {
        const { getClient } = await import('../lib/http-client');
        await userService.updateUser({ firstName: 'New' });
        expect(getClient().patch).toHaveBeenCalledWith('/user/v3/update', expect.anything());

        await userService.acceptTnC({ version: '1.0' });
        expect(getClient().post).toHaveBeenCalledWith('/user/v1/tnc/accept', expect.anything());
    });
});
