import { SignJWT, decodeJwt } from 'jose';
import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { NativeConfigServiceInstance } from './NativeConfigService';
import { HttpRequestBuilder, HttpMethod, HttpService } from './HttpService';
import { deviceService } from './device/deviceService';

export class AppConsumerAuthService {
  private static instance: AppConsumerAuthService;

  private mobileAppKey!: string;
  private mobileAppSecret!: string;
  private mobileAppConsumer!: string;
  private deviceConsumerKey!: string;

  private httpService!: HttpService;

  private appJwt: string | null = null;
  private deviceJwt: string | null = null;

  private static readonly APP_JWT_STORAGE = 'APP_CONSUMER_JWT';
  private static readonly DEVICE_JWT_STORAGE = 'DEVICE_CONSUMER_JWT';

  private constructor() {}

  /**
   * Validates if a JWT token is still valid (not expired)
   * Returns true if valid, false if expired or invalid
   */
  private isTokenValid(token: string | null): boolean {
    if (!token) return false;
    
    // Skip validation for mock tokens (development mode)
    if (token.startsWith('dev-mock-')) return true;
    
    try {
      const payload = decodeJwt(token);
      
      // Check if token has expiration time
      if (!payload.exp) {
        // If no expiration, assume it's valid (some tokens don't expire)
        return true;
      }
      
      // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch (error) {
      // If we can't decode the token, it's invalid
      console.warn('Failed to decode JWT token:', error);
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
      console.warn(`Failed to clear expired token from storage (${storageKey}):`, error);
    }
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new AppConsumerAuthService();
    }
    return this.instance;
  }

  // ================= INIT =================
  async init(): Promise<void> {
    const config = await NativeConfigServiceInstance.load();

    this.mobileAppKey = config.mobileAppKey;
    this.mobileAppSecret = config.mobileAppSecret;
    this.mobileAppConsumer = config.mobileAppConsumer;

    // Use device service to get hashed device ID (matches existing Sunbird implementation)
    const deviceId = await deviceService.getHashedDeviceId();
    const producerId = config.producerId;
    
    // For web development, skip validation since config values are empty
    if (Capacitor.getPlatform() !== 'web' && !producerId) {
      throw new Error('Producer ID is not configured. Please set producer_id in gradle.properties');
    }
    
    // Use a default for web development to avoid empty string issues
    const effectiveProducerId = producerId || 'dev-producer';
    this.deviceConsumerKey = `${effectiveProducerId}-${deviceId}`;

    this.httpService = new HttpService(config.baseUrl);

    this.httpService.setDefaultHeaders({
      'X-App-Id': effectiveProducerId,
      'X-Device-Id': deviceId
    });

    try {
      const { value } = await SecureStoragePlugin.get({ key: AppConsumerAuthService.APP_JWT_STORAGE });
      const cachedToken = value ?? null;
      
      // Only use cached token if it's valid and not expired
      if (this.isTokenValid(cachedToken)) {
        this.appJwt = cachedToken;
      } else if (cachedToken) {
        console.info('Cached APP JWT is expired or invalid, will regenerate');
        this.appJwt = null;
        // Clear expired token from storage
        await this.clearExpiredTokenFromStorage(AppConsumerAuthService.APP_JWT_STORAGE);
      }
    } catch (error) {
      // Ignore storage errors - token will be regenerated if needed
      console.error('Failed to load cached APP consumer JWT from secure storage:', error);
    }

    try {
      const { value } = await SecureStoragePlugin.get({ key: AppConsumerAuthService.DEVICE_JWT_STORAGE });
      const cachedToken = value ?? null;
      
      // Only use cached token if it's valid and not expired
      if (this.isTokenValid(cachedToken)) {
        this.deviceJwt = cachedToken;
      } else if (cachedToken) {
        console.info('Cached DEVICE JWT is expired or invalid, will regenerate');
        this.deviceJwt = null;
        // Clear expired token from storage
        await this.clearExpiredTokenFromStorage(AppConsumerAuthService.DEVICE_JWT_STORAGE);
      }
    } catch (error) {
      // Ignore storage errors - token will be regenerated if needed
      console.error('Failed to load cached DEVICE consumer JWT from secure storage:', error);
    }

    // Generate App JWT if not cached
    if (!this.appJwt) {
      await this.generateAppJwt();
    }
  }

  // ================= APP JWT =================
  private async generateAppJwt(): Promise<string> {
    if (!this.mobileAppSecret || this.mobileAppSecret.trim() === '') {
      // For web development, return a mock JWT instead of throwing
      if (Capacitor.getPlatform() === 'web') {
        const mockToken = 'dev-mock-app-token-' + Date.now();
        this.appJwt = mockToken;
        await SecureStoragePlugin.set({ key: AppConsumerAuthService.APP_JWT_STORAGE, value: mockToken });
        return mockToken;
      }
      throw new Error('Mobile app secret is not configured. Check native config service.');
    }

    const secret = new TextEncoder().encode(this.mobileAppSecret);

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(this.mobileAppKey)
      .setSubject(this.mobileAppConsumer)
      .setIssuedAt()
      .sign(secret);

    this.appJwt = token;
    await SecureStoragePlugin.set({ key: AppConsumerAuthService.APP_JWT_STORAGE, value: token });

    return token;
  }

  // ================= DEVICE REGISTRATION =================
  private async registerDeviceWithKong(path: string): Promise<string> {
    if (!this.appJwt) {
      await this.generateAppJwt();
    }

    const request = new HttpRequestBuilder()
      .withPath(path)
      .withType(HttpMethod.POST)
      .withHeaders({
        Authorization: `Bearer ${this.appJwt}`,
        'Content-Type': 'application/json'
      })
      .withBody({
        id: 'ekstep.genie.device.register',
        ver: '1.0',
        ts: new Date().toISOString(),
        request: { key: this.deviceConsumerKey }
      })
      .build();

    const response = await this.httpService.execute<{ result: { token?: string; secret?: string } }>(request);

    if (!response.ok) {
      throw new Error(`Kong call failed: ${response.status}`);
    }

    const result = response.body.result;

    // Kong returns token
    if (result.token) {
      return result.token;
    }

    // Kong returns secret → we sign
    if (result.secret) {
      const secret = new TextEncoder().encode(result.secret);

      const deviceToken = await new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(this.deviceConsumerKey)
        .setIssuedAt()
        .sign(secret);

      return deviceToken;
    }

    throw new Error('Invalid Kong response');
  }

  // ================= MAIN =================
  async getAuthenticatedToken(): Promise<string> {
    // Check if we have a valid cached device JWT
    if (this.deviceJwt && this.isTokenValid(this.deviceJwt)) {
      return this.deviceJwt;
    }
    
    // Clear invalid token from memory and storage
    if (this.deviceJwt && !this.isTokenValid(this.deviceJwt)) {
      console.info('Cached device JWT is expired or invalid, will regenerate');
      this.deviceJwt = null;
      await this.clearExpiredTokenFromStorage(AppConsumerAuthService.DEVICE_JWT_STORAGE);
    }

    // In development mode, return a mock token to avoid Kong connection errors
    if (Capacitor.getPlatform() === 'web') {
      const mockToken = 'dev-mock-device-token-' + Date.now();
      this.deviceJwt = mockToken;
      return mockToken;
    }

    try {
      this.deviceJwt = await this.registerDeviceWithKong(
        `/api/api-manager/v2/consumer/${this.mobileAppConsumer}/credential/register`
      );
    } catch (error) {
      console.warn('Kong V2 registration failed, trying V1:', error);
      try {
        this.deviceJwt = await this.registerDeviceWithKong(
          `/api/api-manager/v1/consumer/${this.mobileAppConsumer}/credential/register`
        );
      } catch (v1Error) {
        console.error('Both Kong V2 and V1 registration failed:', v1Error);
        throw new Error('Device registration failed: Kong API unavailable');
      }
    }

    await SecureStoragePlugin.set({
      key: AppConsumerAuthService.DEVICE_JWT_STORAGE,
      value: this.deviceJwt
    });

    return this.deviceJwt;
  }

  getHttpService(): HttpService {
    return this.httpService;
  }
}
