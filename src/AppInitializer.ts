import { initializeApiClient } from './api/config';
import { AppConsumerAuthService } from './services/AppConsumerAuthService';
import { getClient } from './lib/http-client';

/**
 * AppInitializer handles all application initialization logic
 * This includes API client setup and authentication
 */
export class AppInitializer {
  private static initialized = false;

  /**
   * Initialize all application services and configurations
   * This method should be called once during app startup
   */
  static async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize API client
      await initializeApiClient();

      // Initialize authentication service
      const authService = AppConsumerAuthService.getInstance();
      await authService.init();

      // Get Kong token and set it in HTTP client
      const kongToken = await authService.getAuthenticatedToken();
      
      // Set both Authorization and X-Authenticated-User-Token headers
      const httpClient = getClient();
      httpClient.updateHeaders([
        { key: 'Authorization', value: `Bearer ${kongToken}`, action: 'add' },
        { key: 'X-Authenticated-User-Token', value: kongToken, action: 'add' },
      ]);

      this.initialized = true;
    } catch (error) {
      console.error('AppInitializer: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if the application has been initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }
}
