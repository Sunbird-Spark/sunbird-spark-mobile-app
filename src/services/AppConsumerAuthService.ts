import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { decodeJwt, SignJWT } from 'jose';
import { getClient, IHttpClient } from '../lib/http-client';
import { deviceService } from './device/deviceService';
import { NativeConfigServiceInstance } from './NativeConfigService';

export class AppConsumerAuthService {
  private static instance: AppConsumerAuthService;

  private mobileAppKey!: string;
  private mobileAppSecret!: string;
  private mobileAppConsumer!: string;

  private httpClient!: IHttpClient;
  private appJwt: string | null = null;
  private deviceJwt: string | null = null;

  private static readonly APP_JWT_STORAGE = 'APP_CONSUMER_JWT';
  private static readonly DEVICE_JWT_STORAGE = 'DEVICE_CONSUMER_JWT';

  private constructor() {}

  /**
   * Validates if a JWT token is still valid (not expired)
   */
  private isTokenValid(token: string | null): boolean {
    if (!token) return false;

    try {
      const payload = decodeJwt(token);

      // Check if token has expiration time
      if (!payload.exp) {
        return true;
      }

      // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clears expired tokens from secure storage
   */
  private async clearExpiredTokenFromStorage(storageKey: string): Promise<void> {
    try {
      await SecureStoragePlugin.remove({ key: storageKey });
    } catch (error) {
      // Ignore storage errors
    }
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new AppConsumerAuthService();
    }
    return this.instance;
  }

  async init(): Promise<void> {
    const config = await NativeConfigServiceInstance.load();

    this.mobileAppKey = config.mobileAppKey;
    this.mobileAppSecret = config.mobileAppSecret;
    this.mobileAppConsumer = config.mobileAppConsumer;

    const deviceId = await deviceService.getHashedDeviceId();
    const producerId = config.producerId;

    if (!producerId) {
      throw new Error('Producer ID is not configured. Please set producer_id in gradle.properties');
    }

    this.httpClient = getClient();

    this.httpClient.updateHeaders([
      { key: 'X-App-Id', value: producerId, action: 'add' },
      { key: 'X-Device-Id', value: deviceId, action: 'add' },
    ]);

    // Load cached tokens
    try {
      const { value } = await SecureStoragePlugin.get({
        key: AppConsumerAuthService.APP_JWT_STORAGE,
      });
      const cachedToken = value ?? null;

      if (this.isTokenValid(cachedToken)) {
        this.appJwt = cachedToken;
      } else if (cachedToken) {
        this.appJwt = null;
        await this.clearExpiredTokenFromStorage(AppConsumerAuthService.APP_JWT_STORAGE);
      }
    } catch (error) {
      // Ignore storage errors
    }

    try {
      const { value } = await SecureStoragePlugin.get({
        key: AppConsumerAuthService.DEVICE_JWT_STORAGE,
      });
      const cachedToken = value ?? null;

      if (this.isTokenValid(cachedToken)) {
        this.deviceJwt = cachedToken;
      } else if (cachedToken) {
        this.deviceJwt = null;
        await this.clearExpiredTokenFromStorage(AppConsumerAuthService.DEVICE_JWT_STORAGE);
      }
    } catch (error) {
      // Ignore storage errors
    }

    // Generate App JWT if not cached
    if (!this.appJwt) {
      await this.generateAppJwt();
    }
  }

  private async generateAppJwt(): Promise<string> {
    if (!this.mobileAppSecret || this.mobileAppSecret.trim() === '') {
      throw new Error('Mobile app secret is not configured. Check native config service.');
    }

    const secret = new TextEncoder().encode(this.mobileAppSecret);
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + (24 * 60 * 60); // 24 hours from now

    const token = await new SignJWT({
      aud: 'sunbird-api',
      scope: 'read write',
      client_id: this.mobileAppKey,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(this.mobileAppKey)
      .setSubject(this.mobileAppConsumer)
      .setIssuedAt(now)
      .setExpirationTime(expiry)
      .setJti(`jwt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`)
      .sign(secret);

    this.appJwt = token;
    await SecureStoragePlugin.set({ key: AppConsumerAuthService.APP_JWT_STORAGE, value: token });

    return token;
  }

  async getAuthenticatedToken(): Promise<string> {
    // Check if we have a valid cached device JWT
    if (this.deviceJwt && this.isTokenValid(this.deviceJwt)) {
      return this.deviceJwt;
    }

    // Clear invalid token from memory and storage
    if (this.deviceJwt && !this.isTokenValid(this.deviceJwt)) {
      this.deviceJwt = null;
      await this.clearExpiredTokenFromStorage(AppConsumerAuthService.DEVICE_JWT_STORAGE);
    }

    // Use app JWT as the authenticated token
    if (!this.appJwt) {
      await this.generateAppJwt();
    }
    
    this.deviceJwt = this.appJwt;
    
    await SecureStoragePlugin.set({
      key: AppConsumerAuthService.DEVICE_JWT_STORAGE,
      value: this.deviceJwt,
    });

    return this.deviceJwt;
  }

  getHttpClient(): IHttpClient {
    return this.httpClient;
  }
}
