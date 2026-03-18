import { useSyncExternalStore } from 'react';
import { AppInitializer } from '../AppInitializer';

const subscribe = (callback: () => void) => AppInitializer.subscribe(callback);
const getSnapshot = () => AppInitializer.isInitialized();

export const useAppInitialized = (): boolean => {
  return useSyncExternalStore(subscribe, getSnapshot);
};
