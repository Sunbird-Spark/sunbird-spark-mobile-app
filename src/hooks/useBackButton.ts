import { useEffect } from 'react';
import { useIonRouter } from '@ionic/react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Registers the Android hardware back button handler.
 *
 * Behaviour:
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
      // Ionic sets canGoBack based on its internal navigation stack.
      // useIonRouter().canGoBack() is the Ionic-level check.
      if (canGoBack || router.canGoBack()) {
        router.goBack();
      } else {
        // On the root page — minimize the app rather than closing it
        App.minimizeApp();
      }
    });

    return () => {
      handler.then((h) => h.remove());
    };
  }, [router]);
};
