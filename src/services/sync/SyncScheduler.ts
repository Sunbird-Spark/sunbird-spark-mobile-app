import { networkService } from '../network/networkService';
import { syncService } from './SyncService';

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

class SyncScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private unsubscribe: (() => void) | null = null;
  private wasConnected = true;

  start(): void {
    if (this.intervalId) return; // already running

    // Periodic timer
    this.intervalId = setInterval(() => {
      void syncService.autoSync();
    }, AUTO_SYNC_INTERVAL_MS);

    // Reconnect trigger: fire autoSync the moment connectivity is restored
    this.unsubscribe = networkService.subscribe((state) => {
      if (state.connected && !this.wasConnected) {
        void syncService.autoSync();
      }
      this.wasConnected = state.connected;
    });
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}

export const syncScheduler = new SyncScheduler();
