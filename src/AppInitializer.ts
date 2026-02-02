import { initializeApiClient } from './api/config';

/**
 * AppInitializer handles all application initialization logic
 * This includes API client setup and other startup configurations
 */
export class AppInitializer {
  private static initialized = false;

  /**
   * Initialize all application services and configurations
   * This method should be called once during app startup
   */
  static async init(): Promise<void> {
    if (this.initialized) {
      console.warn('AppInitializer.init() called multiple times');
      return;
    }

    try {
      console.log('Starting application initialization...');

      // Initialize API client
      await this.initializeApiClient();

      // Add other initialization logic here as needed
      // e.g., analytics, crash reporting, feature flags, etc.

      this.initialized = true;
      console.log('Application initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Initialize the API client with proper configuration
   */
  private static async initializeApiClient(): Promise<void> {
    try {
      await initializeApiClient();
      console.log('API client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize API client:', error);
      throw error;
    }
  }

  /**
   * Check if the application has been initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset initialization state (useful for testing)
   */
  static reset(): void {
    this.initialized = false;
  }
}
