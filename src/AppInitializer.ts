import { initializeApiClient } from './api/config';
import { AppConsumerAuthService } from './services/AppConsumerAuthService';
import { databaseService } from './services/db/DatabaseService';
import { downloadManager } from './services/download_manager';
import { getClient } from './lib/http-client';
import { userService } from './services/UserService';

/**
 * AppInitializer handles all application initialization logic
 * This includes API client setup and authentication
 */
export class AppInitializer {
  private static initialized = false;
  private static listeners: Array<() => void> = [];

  /**
   * Initialize all application services and configurations
   * This method should be called once during app startup
   */
  static async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize SQLite database first — all other services depend on it
      await databaseService.initialize();

      // Initialize download manager (depends on DB)
      await downloadManager.init();

      // Initialize API client
      await initializeApiClient();

      // Initialize authentication service
      const authService = AppConsumerAuthService.getInstance();
      await authService.init();

      // Get Kong token and set it in HTTP client
      const kongToken = await authService.getAuthenticatedToken();
      
      // Set Authorization header with device JWT from Kong
      const httpClient = getClient();
      httpClient.updateHeaders([
        { key: 'Authorization', value: `Bearer ${kongToken}`, action: 'add' },
      ]);

      // Recover user session and set user token header if logged in
      await userService.init();
      if (userService.isLoggedIn()) {
        httpClient.updateHeaders([
          { key: 'X-Authenticated-User-Token', value: userService.getAccessToken()!, action: 'add' },
        ]);
      }

      this.initialized = true;
      this.notifyListeners();
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

  static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }
}
