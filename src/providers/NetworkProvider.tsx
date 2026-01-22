// src/providers/NetworkProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { networkService, type NetworkState } from '../services/network/networkService';

/**
 * This is what components will get when they call useNetwork()
 */
type NetworkContextValue = {
  status: NetworkState;          // full network status
  isOffline: boolean;            // derived boolean
  refreshStatus: () => Promise<void>; // force refresh
};

/**
 * Context is undefined by default.
 * So we can throw a clean error if someone uses it outside the Provider.
 */
const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

/**
 * NetworkProvider
 * - starts network service once
 * - subscribes to updates
 * - stores updates in React state
 * - provides state to app via context
 */
export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with a default state, will be updated immediately by subscription
  const [status, setStatus] = useState<NetworkState>({
    connected: true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      // 1) initialize listening (safe to call multiple times)
      await networkService.init();

      // 2) provider subscribes so React state updates on changes
      // subscribe() immediately calls setStatus with current state
      unsubscribe = networkService.subscribe(setStatus);
    })();

    // Cleanup subscription when provider unmounts
    return () => {
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<NetworkContextValue>(() => {
    return {
      status,
      isOffline: !status.connected,
      refreshStatus: async () => {
        await networkService.refresh();
      },
    };
  }, [status]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

/**
 * Hook for components to use network state
 */
export const useNetwork = (): NetworkContextValue => {
  const ctx = useContext(NetworkContext);

  if (!ctx) {
    throw new Error('useNetwork must be used inside <NetworkProvider>');
  }

  return ctx;
};
