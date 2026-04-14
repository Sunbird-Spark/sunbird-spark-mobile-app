import { IHttpClient } from './types';

let globalClient: IHttpClient | null = null;

export const init = (client: IHttpClient): void => {
  globalClient = client;
};

export const getClient = (): IHttpClient => {
  if (!globalClient) {
    throw new Error('HttpClient not initialized. Call init() with an adapter instance first.');
  }
  return globalClient;
};

let logoutCallback: (() => Promise<void>) | null = null;

export const setLogoutCallback = (fn: () => Promise<void>): void => {
  logoutCallback = fn;
};

export const getLogoutCallback = (): (() => Promise<void>) | null => logoutCallback;

export * from './types';
export * from './BaseClient';
export * from './adapters/CapacitorAdapter';