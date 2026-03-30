import { Capacitor } from '@capacitor/core';
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';

export const appUpdateService = {
  async isUpdateAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const result = await AppUpdate.getAppUpdateInfo();
      return result.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE;
    } catch {
      return false;
    }
  },

  async openAppStore(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await AppUpdate.openAppStore();
    } catch (err) {
      console.warn('[AppUpdateService] Failed to open app store', err);
    }
  },
};
