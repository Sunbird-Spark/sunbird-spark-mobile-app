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
      
      // Set Authorization header with device JWT from Kong
      // Note: X-Authenticated-User-Token is set separately after user login
      const httpClient = getClient();
      httpClient.updateHeaders([
        { key: 'Authorization', value: `Bearer ${kongToken}`, action: 'add' },
      ]);

      this.initialized = true;
    } catch (error) {
      console.error('AppInitializer: Initialization failed:', error);
      
      // Ensure the application does not remain in a partially initialized state
      this.initialized = false;
      
      try {
        // Roll back any authorization headers that may have been set
        const httpClient = getClient();
        httpClient.updateHeaders([
          { key: 'Authorization', value: '', action: 'remove' },
        ]);
      } catch (cleanupError) {
        // If cleanup fails, log it but preserve the original initialization error
        console.error('AppInitializer: Failed to clean up after initialization error:', cleanupError);
      }
      
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