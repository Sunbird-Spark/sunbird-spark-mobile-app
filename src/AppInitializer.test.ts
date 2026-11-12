import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const m = vi.hoisted(() => ({
  setStyle: vi.fn(),
  initializeApiClient: vi.fn(),
  authService: {
    init: vi.fn(),
    getAuthenticatedToken: vi.fn(),
    hasDeviceJwt: vi.fn(),
  },
  databaseService: { initialize: vi.fn() },
  downloadManager: { init: vi.fn(), setWifiOnly: vi.fn() },
  httpClient: { updateHeaders: vi.fn() },
  getClient: vi.fn(),
  userService: {
    init: vi.fn(),
    isLoggedIn: vi.fn(),
    getAccessToken: vi.fn(),
    getUserId: vi.fn(),
    userRead: vi.fn(),
  },
  socialLoginService: { initGoogle: vi.fn() },
  systemSettingRead: vi.fn(),
  networkService: { init: vi.fn(), subscribe: vi.fn() },
  pushNotificationService: { init: vi.fn() },
  settingsService: { getDownloadContent: vi.fn() },
  syncService: { onInit: vi.fn() },
  syncScheduler: { start: vi.fn() },
  channelManager: { hasChannelId: vi.fn(), setChannelId: vi.fn() },
  orgSearch: vi.fn(),
}));

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: { setStyle: m.setStyle },
  Style: { Light: 'LIGHT' },
}));
vi.mock('./api/config', () => ({ initializeApiClient: m.initializeApiClient }));
vi.mock('./services/AppConsumerAuthService', () => ({
  AppConsumerAuthService: { getInstance: () => m.authService },
}));
vi.mock('./services/db/DatabaseService', () => ({ databaseService: m.databaseService }));
vi.mock('./services/download_manager', () => ({ downloadManager: m.downloadManager }));
vi.mock('./lib/http-client', () => ({ getClient: m.getClient }));
vi.mock('./services/UserService', () => ({ userService: m.userService }));
vi.mock('./services/auth/socialLogin/socialLogin.service', () => ({
  socialLoginService: m.socialLoginService,
}));
vi.mock('./services/SystemSettingService', () => ({
  SystemSettingService: class {
    read = m.systemSettingRead;
  },
}));
vi.mock('./services/network/networkService', () => ({ networkService: m.networkService }));
vi.mock('./services/push/PushNotificationService', () => ({
  pushNotificationService: m.pushNotificationService,
}));
vi.mock('./services/SettingsService', () => ({ settingsService: m.settingsService }));
vi.mock('./services/sync/SyncService', () => ({ syncService: m.syncService }));
vi.mock('./services/sync/SyncScheduler', () => ({ syncScheduler: m.syncScheduler }));
vi.mock('./services/ChannelManager', () => ({ ChannelManager: m.channelManager }));
vi.mock('./services/OrganizationService', () => ({
  OrganizationService: class {
    search = m.orgSearch;
  },
}));

type AppInitializerClass = typeof import('./AppInitializer').AppInitializer;

/** Fresh module instance so the private static `initialized` flag starts clean. */
async function loadAppInitializer(): Promise<AppInitializerClass> {
  vi.resetModules();
  const mod = await import('./AppInitializer');
  return mod.AppInitializer;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('AppInitializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    m.setStyle.mockResolvedValue(undefined);
    m.databaseService.initialize.mockResolvedValue(undefined);
    m.networkService.init.mockResolvedValue(undefined);
    m.networkService.subscribe.mockReturnValue(vi.fn());
    m.syncService.onInit.mockResolvedValue(undefined);
    m.downloadManager.init.mockResolvedValue(undefined);
    m.settingsService.getDownloadContent.mockResolvedValue('always');
    m.initializeApiClient.mockResolvedValue(undefined);
    m.authService.init.mockResolvedValue(undefined);
    m.authService.getAuthenticatedToken.mockResolvedValue('kong-token');
    m.authService.hasDeviceJwt.mockReturnValue(true);
    m.getClient.mockReturnValue(m.httpClient);
    m.userService.init.mockResolvedValue(undefined);
    m.userService.isLoggedIn.mockReturnValue(false);
    m.userService.getAccessToken.mockReturnValue('user-token');
    m.userService.getUserId.mockReturnValue('user-1');
    m.userService.userRead.mockResolvedValue({ data: { response: { organisations: [] } } });
    m.channelManager.hasChannelId.mockReturnValue(true);
    m.orgSearch.mockResolvedValue({
      data: { response: { content: [{ hashTagId: 'org-hash' }] } },
    });
    m.systemSettingRead.mockResolvedValue({ data: { response: { value: '' } } });
    m.socialLoginService.initGoogle.mockResolvedValue(undefined);
    m.pushNotificationService.init.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── startup ordering ───────────────────────────────────────────────────────

  describe('init ordering', () => {
    it('brings services up in dependency order', async () => {
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();

      const order = (fn: { mock: { invocationCallOrder: number[] } }) =>
        fn.mock.invocationCallOrder[0];

      expect(order(m.databaseService.initialize)).toBeLessThan(order(m.networkService.init));
      expect(order(m.networkService.init)).toBeLessThan(order(m.syncService.onInit));
      expect(order(m.syncService.onInit)).toBeLessThan(order(m.syncScheduler.start));
      expect(order(m.syncScheduler.start)).toBeLessThan(order(m.downloadManager.init));
      expect(order(m.downloadManager.init)).toBeLessThan(order(m.initializeApiClient));
      expect(order(m.initializeApiClient)).toBeLessThan(order(m.authService.init));
      expect(order(m.authService.init)).toBeLessThan(
        order(m.authService.getAuthenticatedToken)
      );
      expect(order(m.authService.getAuthenticatedToken)).toBeLessThan(order(m.userService.init));
    });

    it('sets a light status bar style', async () => {
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      expect(m.setStyle).toHaveBeenCalledWith({ style: 'LIGHT' });
    });

    it('continues when the status bar plugin is unavailable (browser)', async () => {
      m.setStyle.mockRejectedValue(new Error('not implemented'));
      const AppInitializer = await loadAppInitializer();
      await expect(AppInitializer.init()).resolves.toBeUndefined();
      expect(AppInitializer.isInitialized()).toBe(true);
    });

    it('is idempotent — a second call short-circuits', async () => {
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      await AppInitializer.init();
      expect(m.databaseService.initialize).toHaveBeenCalledOnce();
    });

    it('reports initialisation state', async () => {
      const AppInitializer = await loadAppInitializer();
      expect(AppInitializer.isInitialized()).toBe(false);
      await AppInitializer.init();
      expect(AppInitializer.isInitialized()).toBe(true);
    });
  });

  // ── download settings ──────────────────────────────────────────────────────

  describe('download settings', () => {
    it('enables wifi-only downloads when the setting is "wifi"', async () => {
      m.settingsService.getDownloadContent.mockResolvedValue('wifi');
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      expect(m.downloadManager.setWifiOnly).toHaveBeenCalledWith(true);
    });

    it('disables wifi-only downloads for any other setting', async () => {
      m.settingsService.getDownloadContent.mockResolvedValue('always');
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      expect(m.downloadManager.setWifiOnly).toHaveBeenCalledWith(false);
    });
  });

  // ── auth headers ───────────────────────────────────────────────────────────

  describe('auth headers', () => {
    it('sets the Kong device token as the Authorization header', async () => {
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      expect(m.httpClient.updateHeaders).toHaveBeenCalledWith([
        { key: 'Authorization', value: 'Bearer kong-token', action: 'add' },
      ]);
    });

    it('adds the user token header when a session is restored', async () => {
      m.userService.isLoggedIn.mockReturnValue(true);
      m.userService.userRead.mockResolvedValue({
        data: { response: { organisations: [{ hashTagId: 'ht-1' }] } },
      });
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      expect(m.httpClient.updateHeaders).toHaveBeenCalledWith([
        { key: 'X-Authenticated-User-Token', value: 'user-token', action: 'add' },
      ]);
    });

    it('does not add the user token header for a guest session', async () => {
      m.userService.isLoggedIn.mockReturnValue(false);
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      const keys = m.httpClient.updateHeaders.mock.calls.map((c) => c[0][0].key);
      expect(keys).not.toContain('X-Authenticated-User-Token');
    });
  });

  // ── channel resolution ─────────────────────────────────────────────────────

  describe('channel resolution', () => {
    it('uses the logged-in user profile hashTagId without hitting org search', async () => {
      m.userService.isLoggedIn.mockReturnValue(true);
      m.userService.userRead.mockResolvedValue({
        data: { response: { organisations: [{ hashTagId: 'profile-hash' }] } },
      });

      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();

      expect(m.userService.userRead).toHaveBeenCalledWith('user-1');
      expect(m.channelManager.setChannelId).toHaveBeenCalledWith('profile-hash');
      expect(m.orgSearch).not.toHaveBeenCalled();
    });

    it('falls back to org search when the profile carries no organisation', async () => {
      m.userService.isLoggedIn.mockReturnValue(true);
      m.userService.userRead.mockResolvedValue({ data: { response: { organisations: [] } } });
      m.systemSettingRead.mockImplementation(async (key: string) =>
        key === 'default_channel' ? { data: { response: { value: 'my-tenant' } } } : { data: {} }
      );

      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();

      expect(m.orgSearch).toHaveBeenCalledWith({
        request: { filters: { isTenant: true, slug: 'my-tenant' } },
      });
      expect(m.channelManager.setChannelId).toHaveBeenCalledWith('org-hash');
    });

    it('skips the profile read for guests and defaults the slug to sunbird', async () => {
      m.userService.isLoggedIn.mockReturnValue(false);
      m.systemSettingRead.mockRejectedValue(new Error('offline'));

      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();

      expect(m.userService.userRead).not.toHaveBeenCalled();
      expect(m.orgSearch).toHaveBeenCalledWith({
        request: { filters: { isTenant: true, slug: 'sunbird' } },
      });
    });

    it('skips the profile read when the user id is missing', async () => {
      m.userService.isLoggedIn.mockReturnValue(true);
      m.userService.getUserId.mockReturnValue(null);

      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();

      expect(m.userService.userRead).not.toHaveBeenCalled();
      expect(m.orgSearch).toHaveBeenCalled();
    });

    it('leaves the channel unset when org search fails', async () => {
      m.orgSearch.mockRejectedValue(new Error('offline'));
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      expect(m.channelManager.setChannelId).not.toHaveBeenCalled();
    });

    it('does not fail init when the profile read throws', async () => {
      m.userService.isLoggedIn.mockReturnValue(true);
      m.userService.userRead.mockRejectedValue(new Error('boom'));

      const AppInitializer = await loadAppInitializer();
      await expect(AppInitializer.init()).resolves.toBeUndefined();
      expect(m.channelManager.setChannelId).not.toHaveBeenCalled();
    });
  });

  // ── reconnect retry ────────────────────────────────────────────────────────

  describe('reconnect retry', () => {
    it('registers no retry listener when the device JWT and channel are already present', async () => {
      m.authService.hasDeviceJwt.mockReturnValue(true);
      m.channelManager.hasChannelId.mockReturnValue(true);

      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();

      expect(m.networkService.subscribe).not.toHaveBeenCalled();
    });

    it('subscribes to network state when the device JWT is missing', async () => {
      m.authService.hasDeviceJwt.mockReturnValue(false);
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      expect(m.networkService.subscribe).toHaveBeenCalledOnce();
    });

    it('subscribes when the channel could not be resolved', async () => {
      m.channelManager.hasChannelId.mockReturnValue(false);
      m.orgSearch.mockResolvedValue({ data: { response: { content: [] } } });
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      expect(m.networkService.subscribe).toHaveBeenCalledOnce();
    });

    it('does nothing while the device is still offline', async () => {
      m.authService.hasDeviceJwt.mockReturnValue(false);
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();

      const listener = m.networkService.subscribe.mock.calls[0][0];
      m.authService.getAuthenticatedToken.mockClear();
      listener({ connected: false });
      await flush();

      expect(m.authService.getAuthenticatedToken).not.toHaveBeenCalled();
    });

    it('re-acquires the device JWT and channel on reconnect, then unsubscribes', async () => {
      const unsubscribe = vi.fn();
      m.networkService.subscribe.mockReturnValue(unsubscribe);
      m.authService.hasDeviceJwt.mockReturnValue(false);
      m.channelManager.hasChannelId.mockReturnValue(false);
      m.orgSearch.mockResolvedValue({ data: { response: { content: [] } } });

      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();

      const listener = m.networkService.subscribe.mock.calls[0][0];
      m.authService.getAuthenticatedToken.mockClear();
      m.httpClient.updateHeaders.mockClear();
      m.authService.getAuthenticatedToken.mockResolvedValue('fresh-kong');
      m.orgSearch.mockResolvedValue({ data: { response: { content: [{ hashTagId: 'late' }] } } });
      // Still missing when the retry starts, present by the time it re-checks.
      m.authService.hasDeviceJwt.mockReturnValueOnce(false).mockReturnValue(true);
      m.channelManager.hasChannelId.mockReturnValueOnce(false).mockReturnValue(true);

      listener({ connected: true });
      await flush();

      expect(m.authService.getAuthenticatedToken).toHaveBeenCalledOnce();
      expect(m.httpClient.updateHeaders).toHaveBeenCalledWith([
        { key: 'Authorization', value: 'Bearer fresh-kong', action: 'add' },
      ]);
      expect(m.channelManager.setChannelId).toHaveBeenCalledWith('late');
      expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it('stays subscribed when the retry still cannot obtain a device JWT', async () => {
      const unsubscribe = vi.fn();
      m.networkService.subscribe.mockReturnValue(unsubscribe);
      m.authService.hasDeviceJwt.mockReturnValue(false);

      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();

      // Kong is still unreachable when the reconnect retry fires.
      m.authService.getAuthenticatedToken.mockClear();
      m.authService.getAuthenticatedToken.mockRejectedValue(new Error('kong down'));
      const listener = m.networkService.subscribe.mock.calls[0][0];
      listener({ connected: true });
      await flush();

      expect(m.authService.getAuthenticatedToken).toHaveBeenCalledOnce();
      expect(unsubscribe).not.toHaveBeenCalled();
    });

    it('skips re-acquiring the JWT when only the channel is missing', async () => {
      m.authService.hasDeviceJwt.mockReturnValue(true);
      m.channelManager.hasChannelId.mockReturnValue(false);
      m.orgSearch.mockResolvedValue({ data: { response: { content: [] } } });

      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();

      const listener = m.networkService.subscribe.mock.calls[0][0];
      m.authService.getAuthenticatedToken.mockClear();
      m.orgSearch.mockClear();

      listener({ connected: true });
      await flush();

      expect(m.authService.getAuthenticatedToken).not.toHaveBeenCalled();
      expect(m.orgSearch).toHaveBeenCalled();
    });
  });

  // ── optional services ──────────────────────────────────────────────────────

  describe('Google Sign-In', () => {
    it('initialises Google with the clientId from the system setting', async () => {
      m.systemSettingRead.mockImplementation(async (key: string) =>
        key === 'googleClientId' ? { data: { response: { value: 'gcid' } } } : { data: {} }
      );

      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();

      expect(m.socialLoginService.initGoogle).toHaveBeenCalledWith('gcid');
    });

    it('supports the flat data.value shape', async () => {
      m.systemSettingRead.mockImplementation(async (key: string) =>
        key === 'googleClientId' ? { data: { value: 'flat-gcid' } } : { data: {} }
      );

      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();

      expect(m.socialLoginService.initGoogle).toHaveBeenCalledWith('flat-gcid');
    });

    it('skips Google init when no clientId is configured', async () => {
      m.systemSettingRead.mockResolvedValue({ data: {} });
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      expect(m.socialLoginService.initGoogle).not.toHaveBeenCalled();
    });

    it('warns but does not fail init when Google setup throws', async () => {
      m.systemSettingRead.mockImplementation(async (key: string) =>
        key === 'googleClientId' ? { data: { response: { value: 'gcid' } } } : { data: {} }
      );
      m.socialLoginService.initGoogle.mockRejectedValue(new Error('plugin missing'));

      const AppInitializer = await loadAppInitializer();
      await expect(AppInitializer.init()).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Google Sign-In init failed'),
        expect.any(Error)
      );
      expect(AppInitializer.isInitialized()).toBe(true);
    });
  });

  describe('push notifications', () => {
    it('initialises push notifications', async () => {
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      expect(m.pushNotificationService.init).toHaveBeenCalledOnce();
    });

    it('warns but still completes init when push setup fails', async () => {
      m.pushNotificationService.init.mockRejectedValue(new Error('no permission'));
      const AppInitializer = await loadAppInitializer();
      await AppInitializer.init();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Push notification setup failed'),
        expect.any(Error)
      );
      expect(AppInitializer.isInitialized()).toBe(true);
    });
  });

  // ── listeners ──────────────────────────────────────────────────────────────

  describe('subscribe', () => {
    it('notifies listeners once init completes', async () => {
      const AppInitializer = await loadAppInitializer();
      const listener = vi.fn();
      AppInitializer.subscribe(listener);

      expect(listener).not.toHaveBeenCalled();
      await AppInitializer.init();
      expect(listener).toHaveBeenCalledOnce();
    });

    it('stops notifying after unsubscribe', async () => {
      const AppInitializer = await loadAppInitializer();
      const listener = vi.fn();
      const unsubscribe = AppInitializer.subscribe(listener);
      unsubscribe();

      await AppInitializer.init();
      expect(listener).not.toHaveBeenCalled();
    });

    it('does not notify listeners when init fails', async () => {
      m.databaseService.initialize.mockRejectedValue(new Error('db locked'));
      const AppInitializer = await loadAppInitializer();
      const listener = vi.fn();
      AppInitializer.subscribe(listener);

      await expect(AppInitializer.init()).rejects.toThrow('db locked');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ── failure handling ───────────────────────────────────────────────────────

  describe('failure handling', () => {
    it('rethrows, stays uninitialised and rolls back the Authorization header', async () => {
      m.authService.init.mockRejectedValue(new Error('kong registration failed'));
      const AppInitializer = await loadAppInitializer();

      await expect(AppInitializer.init()).rejects.toThrow('kong registration failed');
      expect(AppInitializer.isInitialized()).toBe(false);
      expect(m.httpClient.updateHeaders).toHaveBeenCalledWith([
        { key: 'Authorization', value: '', action: 'remove' },
      ]);
      expect(console.error).toHaveBeenCalledWith(
        'AppInitializer: Initialization failed:',
        expect.any(Error)
      );
    });

    it('allows a retry after a failed init', async () => {
      m.databaseService.initialize.mockRejectedValueOnce(new Error('db locked'));
      const AppInitializer = await loadAppInitializer();

      await expect(AppInitializer.init()).rejects.toThrow('db locked');
      await expect(AppInitializer.init()).resolves.toBeUndefined();
      expect(AppInitializer.isInitialized()).toBe(true);
    });

    it('preserves the original error when header cleanup also fails', async () => {
      m.databaseService.initialize.mockRejectedValue(new Error('db locked'));
      m.getClient.mockImplementation(() => {
        throw new Error('client not initialised');
      });
      const AppInitializer = await loadAppInitializer();

      await expect(AppInitializer.init()).rejects.toThrow('db locked');
      expect(console.error).toHaveBeenCalledWith(
        'AppInitializer: Failed to clean up after initialization error:',
        expect.any(Error)
      );
    });
  });
});
