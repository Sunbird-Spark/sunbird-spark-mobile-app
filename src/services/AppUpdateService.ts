import { Capacitor } from '@capacitor/core';
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';
import { App as CapacitorApp } from '@capacitor/app';

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
    } catch {
      try {
        const { id } = await CapacitorApp.getInfo();
        window.open(`https://play.google.com/store/apps/details?id=${id}`, '_system');
      } catch {
        // fallback unavailable
      }
    }
  },
};
