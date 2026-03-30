import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockAutoSync = vi.fn().mockResolvedValue(undefined);
let networkSubscriber: ((state: any) => void) | null = null;

vi.mock('./SyncService', () => ({
  syncService: { autoSync: (...args: any[]) => mockAutoSync(...args) },
}));

vi.mock('../network/networkService', () => ({
  networkService: {
    subscribe: vi.fn((cb: (state: any) => void) => {
      networkSubscriber = cb;
      return () => { networkSubscriber = null; };
    }),
  },
}));

import { syncScheduler } from './SyncScheduler';
import { networkService } from '../network/networkService';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SyncScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    networkSubscriber = null;
    // Ensure scheduler is stopped before each test
    syncScheduler.stop();
  });

  afterEach(() => {
    syncScheduler.stop();
    vi.useRealTimers();
  });

  it('does not autoSync before interval fires', () => {
    syncScheduler.start();
    vi.advanceTimersByTime(299_000);
    expect(mockAutoSync).not.toHaveBeenCalled();
  });

  it('calls autoSync after 5 minute interval', () => {
    syncScheduler.start();
    vi.advanceTimersByTime(300_000);
    expect(mockAutoSync).toHaveBeenCalledTimes(1);
  });

  it('calls autoSync multiple times across multiple intervals', () => {
    syncScheduler.start();
    vi.advanceTimersByTime(900_000);
    expect(mockAutoSync).toHaveBeenCalledTimes(3);
  });

  it('does not start a second interval if already running', () => {
    syncScheduler.start();
    syncScheduler.start(); // second call should be a no-op
    vi.advanceTimersByTime(300_000);
    // Still only 1 call (not 2)
    expect(mockAutoSync).toHaveBeenCalledTimes(1);
  });

  it('subscribes to networkService on start', () => {
    syncScheduler.start();
    expect(networkService.subscribe).toHaveBeenCalledOnce();
  });

  it('triggers autoSync when network reconnects', () => {
    syncScheduler.start();
    // Simulate disconnect then reconnect
    networkSubscriber!({ connected: false, connectionType: 'none' });
    networkSubscriber!({ connected: true, connectionType: 'wifi' });
    expect(mockAutoSync).toHaveBeenCalledTimes(1);
  });

  it('does NOT trigger autoSync on first connection event (wasConnected defaults true)', () => {
    syncScheduler.start();
    // First event: connected=true, wasConnected=true → no trigger
    networkSubscriber!({ connected: true, connectionType: 'wifi' });
    expect(mockAutoSync).not.toHaveBeenCalled();
  });

  it('does not trigger autoSync on disconnect event', () => {
    syncScheduler.start();
    networkSubscriber!({ connected: false, connectionType: 'none' });
    expect(mockAutoSync).not.toHaveBeenCalled();
  });

  it('stops the interval on stop()', () => {
    syncScheduler.start();
    syncScheduler.stop();
    vi.advanceTimersByTime(600_000);
    expect(mockAutoSync).not.toHaveBeenCalled();
  });

  it('unsubscribes from networkService on stop()', () => {
    syncScheduler.start();
    syncScheduler.stop();
    // networkSubscriber should be cleared by the returned unsubscribe fn
    expect(networkSubscriber).toBeNull();
  });

  it('can be restarted after stop()', () => {
    syncScheduler.start();
    syncScheduler.stop();
    syncScheduler.start();
    vi.advanceTimersByTime(300_000);
    expect(mockAutoSync).toHaveBeenCalledTimes(1);
  });

  it('stop() is safe to call when not started', () => {
    expect(() => syncScheduler.stop()).not.toThrow();
  });
});
