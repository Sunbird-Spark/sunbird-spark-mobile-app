// src/services/device/deviceService.ts
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import SHA1 from 'crypto-js/sha1';

/**
 * This is the shape your app will use everywhere.
 * Keep it simple and stable.
 */
export type DeviceState = {
  deviceId: string;
  platform: string;
  model: string;
  operatingSystem: string;
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
  webViewVersion: string;
};

type DeviceListener = (state: DeviceState) => void;

class DeviceService {
  private state: DeviceState = {
    deviceId: '',
    platform: 'unknown',
    model: 'unknown',
    operatingSystem: 'unknown',
    osVersion: 'unknown',
    manufacturer: 'unknown',
    isVirtual: false,
    webViewVersion: 'unknown',
  };

  private initialized = false;
  private listeners = new Set<DeviceListener>();
  private static readonly WEB_DEVICE_ID_KEY = 'web_device_id';

  /**
   * Generates and persists a consistent device ID for web platforms
   */
  private async getOrCreateWebDeviceId(): Promise<string> {
    try {
      // Try to get existing web device ID
      const { value } = await Preferences.get({ key: DeviceService.WEB_DEVICE_ID_KEY });
      
      if (value) {
        return value;
      }
      
      // Generate new web device ID
      const newWebDeviceId = 'web-device-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
      
      // Persist it
      await Preferences.set({ 
        key: DeviceService.WEB_DEVICE_ID_KEY, 
        value: newWebDeviceId 
      });
      
      return newWebDeviceId;
    } catch (error) {
      // If preferences fail, generate a session-only ID
      console.warn('Failed to persist web device ID, using session-only ID:', error);
      return 'web-device-session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
    }
  }

  /**
   * init()
   * - gets device information including device ID
   * - caches the result for future use
   * - optimized for mobile platforms (iOS/Android)
   */
  async init(): Promise<void> {
    // If already initialized, do nothing.
    if (this.initialized) return;

    // Only initialize on native platforms
    if (!Capacitor.isNativePlatform()) {
      // Suppress warning in development - this is expected behavior
      if (import.meta.env.MODE !== 'test') {
        console.info('Device service: Running on web platform, using fallback values');
      }
      this.state.platform = Capacitor.getPlatform();
      this.initialized = true;
      this.notify();
      return;
    }

    try {
      // Get device info and device ID in parallel
      const [deviceInfo, deviceId] = await Promise.all([
        Device.getInfo(),
        Device.getId()
      ]);

      this.state = {
        deviceId: deviceId.identifier || 'unknown',
        platform: deviceInfo.platform,
        model: deviceInfo.model,
        operatingSystem: deviceInfo.operatingSystem,
        osVersion: deviceInfo.osVersion,
        manufacturer: deviceInfo.manufacturer,
        isVirtual: deviceInfo.isVirtual,
        webViewVersion: deviceInfo.webViewVersion,
      };

      this.notify();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize device service:', error);
      
      // Fallback to basic platform info
      this.state = {
        ...this.state,
        platform: Capacitor.getPlatform(),
        deviceId: 'unknown',
      };
      
      this.notify();
      this.initialized = true;
    }
  }

  /**
   * subscribe()
   * - lets components listen for device state changes
   * - returns unsubscribe function
   */
  subscribe(listener: DeviceListener): () => void {
    this.listeners.add(listener);

    // Immediately emit current state so subscriber has data
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * getState()
   * - returns current device state
   * - initializes if not already done
   */
  async getState(): Promise<DeviceState> {
    if (!this.initialized) {
      await this.init();
    }
    return this.state;
  }

  /**
   * getDeviceIdOnly()
   * - convenience method to get just the device ID
   * - initializes if not already done
   * - returns 'unknown' for non-native platforms
   */
  async getDeviceIdOnly(): Promise<string> {
    if (!this.initialized) {
      await this.init();
    }
    return this.state.deviceId;
  }

  /**
   * getHashedDeviceId()
   * - returns SHA1 hash of device ID (matches existing Sunbird implementation)
   * - provides privacy protection and consistent format
   * - initializes if not already done
   * - for web platforms, generates and persists a consistent device ID
   */
  async getHashedDeviceId(): Promise<string> {
    if (!this.initialized) {
      await this.init();
    }
    
    if (this.state.deviceId === 'unknown' || this.state.deviceId === '') {
      // For web platform, generate and persist a consistent device ID
      const webDeviceId = await this.getOrCreateWebDeviceId();
      return SHA1(webDeviceId).toString();
    }
    
    return SHA1(this.state.deviceId).toString();
  }

  /**
   * refresh()
   * - forces a refresh of device information
   * - useful if device state might have changed
   */
  async refresh(): Promise<void> {
    this.initialized = false;
    await this.init();
  }

  /**
   * isNativePlatform()
   * - helper to check if running on native platform
   */
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * getPlatform()
   * - helper to get current platform
   */
  getPlatform(): string {
    return Capacitor.getPlatform();
  }

  /**
   * clearWebDeviceId()
   * - clears the persisted web device ID (web platform only)
   * - useful for testing or privacy purposes
   * - next call to getHashedDeviceId() will generate a new ID
   */
  async clearWebDeviceId(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      try {
        await Preferences.remove({ key: DeviceService.WEB_DEVICE_ID_KEY });
        console.info('Web device ID cleared');
      } catch (error) {
        console.warn('Failed to clear web device ID:', error);
      }
    }
  }

  /**
   * getSpec()
   * - returns device spec object for telemetry START events (B18)
   * - synchronous — uses already-initialized state
   */
  getSpec(): Record<string, unknown> {
    return {
      os: this.state.operatingSystem,
      make: `${this.state.manufacturer} ${this.state.model}`.trim(),
      id: this.state.deviceId,
      mem: 0,
      idisk: 0,
      edisk: 0,
      scrn: 0,
      camera: '',
      cpu: '',
      sims: 0,
      cap: [],
    };
  }

  /** Internal helper to broadcast changes */
  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export const deviceService = new DeviceService();