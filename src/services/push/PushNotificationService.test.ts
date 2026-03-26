import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn(),
    register: vi.fn(),
    addListener: vi.fn(),
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

const mockPost = vi.fn().mockResolvedValue({});
vi.mock('../../lib/http-client', () => ({
  getClient: () => ({ post: mockPost }),
}));

vi.mock('../device/deviceService', () => ({
  deviceService: {
    getDeviceIdOnly: vi.fn().mockResolvedValue('device-abc'),
    getSpec: vi.fn().mockReturnValue({ os: 'android', make: 'Google Pixel', id: 'device-abc' }),
  },
}));

vi.mock('../NativeConfigService', () => ({
  NativeConfigServiceInstance: {
    load: vi.fn().mockResolvedValue({ producerId: 'prod-001', baseUrl: '' }),
  },
}));

vi.mock('../ChannelManager', () => ({
  ChannelManager: {
    getChannelId: vi.fn().mockReturnValue(null),
  },
}));

import { PushNotifications } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { pushNotificationService } from './PushNotificationService';

describe('PushNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton state between tests via the public cleanup method
    pushNotificationService.cleanup();
  });

  // ── init() ──────────────────────────────────────────────────────────────

  describe('init', () => {
    it('exits early on web platform without calling register', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      await pushNotificationService.init();

      expect(PushNotifications.requestPermissions).not.toHaveBeenCalled();
      expect(PushNotifications.register).not.toHaveBeenCalled();
    });

    it('requests permissions on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      vi.mocked(PushNotifications.register).mockResolvedValue(undefined);
      vi.mocked(PushNotifications.addListener).mockResolvedValue({ remove: vi.fn() } as any);

      await pushNotificationService.init();

      expect(PushNotifications.requestPermissions).toHaveBeenCalled();
    });

    it('does not register when permission is denied', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'denied' });

      await pushNotificationService.init();

      expect(PushNotifications.register).not.toHaveBeenCalled();
      expect(PushNotifications.addListener).not.toHaveBeenCalled();
    });

    it('does not register listeners a second time if called twice', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      vi.mocked(PushNotifications.register).mockResolvedValue(undefined);
      vi.mocked(PushNotifications.addListener).mockResolvedValue({ remove: vi.fn() } as any);

      await pushNotificationService.init();
      await pushNotificationService.init(); // second call should be a no-op

      expect(PushNotifications.addListener).toHaveBeenCalledTimes(4); // not 8
    });

    it('calls register and sets up all listeners when permission is granted', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      vi.mocked(PushNotifications.register).mockResolvedValue(undefined);
      vi.mocked(PushNotifications.addListener).mockResolvedValue({ remove: vi.fn() } as any);

      await pushNotificationService.init();

      expect(PushNotifications.register).toHaveBeenCalled();
      // Should register 4 listeners: registration, registrationError, pushNotificationReceived, pushNotificationActionPerformed
      expect(PushNotifications.addListener).toHaveBeenCalledTimes(4);
    });

    it('stores FCM token and calls registerDevice when registration event fires', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      vi.mocked(PushNotifications.register).mockResolvedValue(undefined);
      vi.mocked(Preferences.set).mockResolvedValue(undefined);
      vi.mocked(Preferences.get).mockResolvedValue({ value: 'fcm-token-xyz' });

      let registrationCallback: ((token: { value: string }) => void) | null = null;
      vi.mocked(PushNotifications.addListener).mockImplementation((event: string, cb: any) => {
        if (event === 'registration') registrationCallback = cb;
        return Promise.resolve({ remove: vi.fn() } as any);
      });

      await pushNotificationService.init();
      await registrationCallback!({ value: 'fcm-token-xyz' });

      expect(Preferences.set).toHaveBeenCalledWith({ key: 'FCM_TOKEN', value: 'fcm-token-xyz' });
    });

    it('dispatches push:foreground event when foreground notification arrives', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      vi.mocked(PushNotifications.register).mockResolvedValue(undefined);

      let foregroundCallback: (() => void) | null = null;
      vi.mocked(PushNotifications.addListener).mockImplementation((event: string, cb: any) => {
        if (event === 'pushNotificationReceived') foregroundCallback = cb;
        return Promise.resolve({ remove: vi.fn() } as any);
      });

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      await pushNotificationService.init();
      foregroundCallback!();

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'push:foreground' }),
      );
    });

    it('dispatches push:tapped event with notification data when user taps from tray', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      vi.mocked(PushNotifications.register).mockResolvedValue(undefined);

      let tapCallback: ((action: any) => void) | null = null;
      vi.mocked(PushNotifications.addListener).mockImplementation((event: string, cb: any) => {
        if (event === 'pushNotificationActionPerformed') tapCallback = cb;
        return Promise.resolve({ remove: vi.fn() } as any);
      });

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      await pushNotificationService.init();
      tapCallback!({ notification: { data: { actionType: 'CERTIFICATE' } } });

      const dispatchedEvent = dispatchSpy.mock.calls.find(
        ([e]) => (e as CustomEvent).type === 'push:tapped',
      )?.[0] as CustomEvent;
      expect(dispatchedEvent).toBeDefined();
      expect(dispatchedEvent.detail).toEqual({ actionType: 'CERTIFICATE' });
    });
  });

  // ── cleanup() ───────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('calls remove on every stored listener handle', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      vi.mocked(PushNotifications.register).mockResolvedValue(undefined);

      const removeFn = vi.fn();
      vi.mocked(PushNotifications.addListener).mockResolvedValue({ remove: removeFn } as any);

      await pushNotificationService.init();
      pushNotificationService.cleanup();

      expect(removeFn).toHaveBeenCalledTimes(4); // one per listener
    });

    it('allows init to run again after cleanup', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(PushNotifications.requestPermissions).mockResolvedValue({ receive: 'granted' });
      vi.mocked(PushNotifications.register).mockResolvedValue(undefined);
      vi.mocked(PushNotifications.addListener).mockResolvedValue({ remove: vi.fn() } as any);

      await pushNotificationService.init();
      pushNotificationService.cleanup();
      await pushNotificationService.init(); // should re-register, not be a no-op

      expect(PushNotifications.register).toHaveBeenCalledTimes(2);
    });
  });

  // ── registerDevice() ────────────────────────────────────────────────────

  describe('registerDevice', () => {
    it('exits early on web platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      await pushNotificationService.registerDevice();

      expect(mockPost).not.toHaveBeenCalled();
    });

    it('exits early when no FCM token is stored', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Preferences.get).mockResolvedValue({ value: null });

      await pushNotificationService.registerDevice();

      expect(mockPost).not.toHaveBeenCalled();
    });

    it('calls POST /api/v3/device/register/:deviceId with correct payload', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Preferences.get).mockResolvedValue({ value: 'fcm-token-abc' });
      mockPost.mockResolvedValue({});

      await pushNotificationService.registerDevice();

      expect(mockPost).toHaveBeenCalledWith(
        '/api/v3/device/register/device-abc',
        expect.objectContaining({
          request: expect.objectContaining({
            fcmToken: 'fcm-token-abc',
            producer: 'prod-001',
          }),
        }),
      );
    });

    it('does not throw when the API call fails', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Preferences.get).mockResolvedValue({ value: 'fcm-token-abc' });
      mockPost.mockRejectedValue(new Error('network error'));

      await expect(pushNotificationService.registerDevice()).resolves.not.toThrow();
    });
  });

  // ── getFcmToken() ────────────────────────────────────────────────────────

  describe('getFcmToken', () => {
    it('returns stored FCM token', async () => {
      vi.mocked(Preferences.get).mockResolvedValue({ value: 'stored-token' });

      const token = await pushNotificationService.getFcmToken();

      expect(token).toBe('stored-token');
    });

    it('returns null when no token is stored', async () => {
      vi.mocked(Preferences.get).mockResolvedValue({ value: null });

      const token = await pushNotificationService.getFcmToken();

      expect(token).toBeNull();
    });
  });
});
