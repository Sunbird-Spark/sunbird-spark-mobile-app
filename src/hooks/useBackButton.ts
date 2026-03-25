import { useEffect, useRef } from 'react';
import { useIonRouter } from '@ionic/react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

type BackButtonOverride = () => boolean;

/**
 * Registry of route-specific back button overrides.
 * Each override returns true if it handled the event, false to fall through to default behavior.
 */
const overrides = new Map<string, BackButtonOverride>();

/**
 * Register a route-specific override for the hardware back button.
 * Returns a cleanup function to unregister.
 */
export const useBackButtonOverride = (path: string, handler: BackButtonOverride) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrapped: BackButtonOverride = () => handlerRef.current();
    overrides.set(path, wrapped);
    return () => { overrides.delete(path); };
  }, [path]);
};

/**
 * Registers the Android hardware back button handler.
 *
 * Behaviour:
 *  - If a route-specific override is registered for the current path and handles the event → done.
 *  - If the Ionic router can go back → navigate back (pop the page stack).
 *  - If on a root page (no back stack) → minimize the app instead of exiting.
 *
 * Must be rendered inside <IonRouterOutlet> so useIonRouter() is available.
 */
export const useHardwareBackButton = () => {
  const router = useIonRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handler = App.addListener('backButton', ({ canGoBack }) => {
      // Check route-specific overrides first
      const currentPath = window.location.pathname;
      const override = overrides.get(currentPath);
      if (override && override()) return;

      // Default behavior
      if (canGoBack || router.canGoBack()) {
        router.goBack();
      } else {
        App.minimizeApp();
      }
    });

    return () => {
      handler.then((h) => h.remove());
    };
  }, [router]);
};
