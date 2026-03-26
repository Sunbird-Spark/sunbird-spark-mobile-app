import { PushNotifications } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { getClient } from '../../lib/http-client';
import { deviceService } from '../device/deviceService';
import { NativeConfigServiceInstance } from '../NativeConfigService';
import { ChannelManager } from '../ChannelManager';

const FCM_TOKEN_KEY = 'FCM_TOKEN';

class PushNotificationService {
  private static instance: PushNotificationService;
  private initialized = false;
  private listeners: PluginListenerHandle[] = [];

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!this.instance) {
      this.instance = new PushNotificationService();
    }
    return this.instance;
  }

  /**
   * Call once during app init.
   * Requests OS permission, registers with FCM, and sets up all listeners.
   * Safe to call on web — exits early if not on a native platform.
   * Guard prevents duplicate listener registration if called more than once.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (!Capacitor.isNativePlatform()) return;

    const { receive } = await PushNotifications.requestPermissions();
    if (receive !== 'granted') return;

    await PushNotifications.register();

    // FCM token issued (or refreshed by Google) — store it and register device
    this.listeners.push(
      await PushNotifications.addListener('registration', async (token) => {
        await this.storeFcmToken(token.value);
        // Anonymous device registration (no user token yet)
        await this.registerDevice();
      }),
    );

    this.listeners.push(
      await PushNotifications.addListener('registrationError', (err) => {
        console.error('[PushNotificationService] FCM registration error:', err);
      }),
    );

    // App is in FOREGROUND when notification arrives — update unread badge via React Query
    this.listeners.push(
      await PushNotifications.addListener('pushNotificationReceived', () => {
        window.dispatchEvent(new CustomEvent('push:foreground'));
      }),
    );

    // User tapped a notification from the OS tray (background or killed app)
    this.listeners.push(
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        window.dispatchEvent(
          new CustomEvent('push:tapped', { detail: action.notification.data }),
        );
      }),
    );

    this.initialized = true;
  }

  /**
   * Removes all active push notification listeners.
   * Call this if the service needs to be torn down (e.g. in tests or future hot-reload support).
   */
  async cleanup(): Promise<void> {
    const listeners = this.listeners;
    this.listeners = [];
    try {
      await Promise.all(
        listeners.map((l) =>
          l.remove().catch((err) => {
            console.warn('[PushNotificationService] Failed to remove listener', err);
          }),
        ),
      );
    } finally {
      this.initialized = false;
    }
  }

  /**
   * Call after every login so the backend links this FCM token to the logged-in user.
   * The user's auth token in the HTTP headers identifies the user — no userId param needed.
   */
  async registerDevice(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const fcmToken = await this.getFcmToken();
    if (!fcmToken) return;

    const deviceId = await deviceService.getDeviceIdOnly();
    const dspec = deviceService.getSpec();
    const config = await NativeConfigServiceInstance.load();

    try {
      await getClient().post(`/api/v3/device/register/${deviceId}`, {
        request: {
          dspec,
          fcmToken,
          producer: config.producerId,
          channel: ChannelManager.getChannelId() ?? '', 
          first_access: Date.now(),
        },
      });
    } catch (err) {
      console.warn('[PushNotificationService] Device registration failed', err);
    }
  }

  private async storeFcmToken(token: string): Promise<void> {
    await Preferences.set({ key: FCM_TOKEN_KEY, value: token });
  }

  async getFcmToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: FCM_TOKEN_KEY });
    return value;
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
