import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionStatus, PluginListenerHandle } from '@capacitor/network';

// Mock the Capacitor Network plugin
const mockGetStatus = vi.fn();
const mockAddListener = vi.fn();
const mockRemove = vi.fn();

vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: (...args: any[]) => mockGetStatus(...args),
    addListener: (...args: any[]) => mockAddListener(...args),
  },
}));

import { networkService } from './networkService';

describe('NetworkService', () => {
  let mockHandle: PluginListenerHandle;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRemove.mockResolvedValue(undefined);
    
    mockHandle = { remove: mockRemove };

    // Reset the service state
    (networkService as any).initialized = false;
    (networkService as any).handle = null;
    (networkService as any).listeners.clear();
    (networkService as any).state = {
      connected: true,
      connectionType: 'unknown',
    };

    mockGetStatus.mockResolvedValue({
      connected: true,
      connectionType: 'wifi',
    } as ConnectionStatus);

    mockAddListener.mockResolvedValue(mockHandle);
  });

  describe('init', () => {
    it('should initialize and get initial network status', async () => {
      await networkService.init();

      expect(mockGetStatus).toHaveBeenCalledTimes(1);
      expect(mockAddListener).toHaveBeenCalledWith('networkStatusChange', expect.any(Function));
      
      // Verify state is updated by subscribing
      const listener = vi.fn();
      networkService.subscribe(listener);
      expect(listener).toHaveBeenCalledWith({
        connected: true,
        connectionType: 'wifi',
      });
    });

    it('should not initialize twice if already initialized', async () => {
      await networkService.init();
      await networkService.init();

      expect(mockGetStatus).toHaveBeenCalledTimes(1);
      expect(mockAddListener).toHaveBeenCalledTimes(1);
    });

    it('should handle offline initial status', async () => {
      mockGetStatus.mockResolvedValueOnce({
        connected: false,
        connectionType: 'none',
      } as ConnectionStatus);

      await networkService.init();

      // Verify state by subscribing
      const listener = vi.fn();
      networkService.subscribe(listener);
      expect(listener).toHaveBeenCalledWith({
        connected: false,
        connectionType: 'none',
      });
    });

    it('should handle network status change events', async () => {
      let statusChangeCallback: ((status: ConnectionStatus) => void) | null = null;

      mockAddListener.mockImplementationOnce((event, callback) => {
        statusChangeCallback = callback;
        return Promise.resolve(mockHandle);
      });

      await networkService.init();

      statusChangeCallback?.({
        connected: false,
        connectionType: 'none',
      } as ConnectionStatus);

      // Verify state by subscribing
      const listener = vi.fn();
      networkService.subscribe(listener);
      expect(listener).toHaveBeenCalledWith({
        connected: false,
        connectionType: 'none',
      });
    });

    it('should notify subscribers on network change', async () => {
      let statusChangeCallback: ((status: ConnectionStatus) => void) | null = null;

      mockAddListener.mockImplementationOnce((event, callback) => {
        statusChangeCallback = callback;
        return Promise.resolve(mockHandle);
      });

      const listener = vi.fn();
      await networkService.init();
      networkService.subscribe(listener);

      statusChangeCallback?.({
        connected: false,
        connectionType: 'none',
      } as ConnectionStatus);

      expect(listener).toHaveBeenCalledWith({
        connected: false,
        connectionType: 'none',
      });
    });
  });

  describe('subscribe', () => {
    it('should add listener and return unsubscribe function', () => {
      const listener = vi.fn();

      const unsubscribe = networkService.subscribe(listener);

      expect(typeof unsubscribe).toBe('function');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should support multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      networkService.subscribe(listener1);
      networkService.subscribe(listener2);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should notify all subscribers on state change', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      networkService.subscribe(listener1);
      networkService.subscribe(listener2);

      // Trigger a network change
      let statusChangeCallback: ((status: ConnectionStatus) => void) | null = null;

      mockAddListener.mockImplementationOnce((event, callback) => {
        statusChangeCallback = callback;
        return Promise.resolve(mockHandle);
      });

      await networkService.init();

      statusChangeCallback?.({
        connected: false,
        connectionType: 'none',
      } as ConnectionStatus);

      expect(listener1).toHaveBeenCalledWith({
        connected: false,
        connectionType: 'none',
      });
      expect(listener2).toHaveBeenCalledWith({
        connected: false,
        connectionType: 'none',
      });
    });

    it('should remove listener when unsubscribe is called', async () => {
      const listener = vi.fn();
      const unsubscribe = networkService.subscribe(listener);

      listener.mockClear();
      unsubscribe();

      // Trigger a network change to verify listener is not called
      let statusChangeCallback: ((status: ConnectionStatus) => void) | null = null;

      mockAddListener.mockImplementationOnce((event, callback) => {
        statusChangeCallback = callback;
        return Promise.resolve(mockHandle);
      });

      await networkService.init();

      statusChangeCallback?.({
        connected: false,
        connectionType: 'none',
      } as ConnectionStatus);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should remove listener and reset state', async () => {
      await networkService.init();
      await networkService.stop();

      expect(mockRemove).toHaveBeenCalledTimes(1);
      expect((networkService as any).initialized).toBe(false);
    });

    it('should allow restart after stop', async () => {
      await networkService.init();
      await networkService.stop();

      await networkService.init();

      expect(mockGetStatus).toHaveBeenCalledTimes(2);
      expect(mockAddListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full lifecycle', async () => {
      let statusChangeCallback: ((status: ConnectionStatus) => void) | null = null;

      mockAddListener.mockImplementationOnce((event, callback) => {
        statusChangeCallback = callback;
        return Promise.resolve(mockHandle);
      });

      const listener = vi.fn();

      await networkService.init();
      networkService.subscribe(listener);

      // Verify initial state
      expect(listener).toHaveBeenCalledWith({
        connected: true,
        connectionType: 'wifi',
      });

      statusChangeCallback?.({
        connected: false,
        connectionType: 'none',
      } as ConnectionStatus);

      // Verify updated state
      expect(listener).toHaveBeenCalledWith({
        connected: false,
        connectionType: 'none',
      });

      await networkService.stop();
      expect(mockRemove).toHaveBeenCalled();
    });

    it('should handle multiple subscribers with different lifecycles', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      const unsub1 = networkService.subscribe(listener1);
      const unsub2 = networkService.subscribe(listener2);
      networkService.subscribe(listener3);

      unsub1();
      unsub2();

      // Trigger a network change
      let statusChangeCallback: ((status: ConnectionStatus) => void) | null = null;

      mockAddListener.mockImplementationOnce((event, callback) => {
        statusChangeCallback = callback;
        return Promise.resolve(mockHandle);
      });

      await networkService.init();

      statusChangeCallback?.({
        connected: false,
        connectionType: 'none',
      } as ConnectionStatus);

      // listener1 and listener2: only initial subscribe call
      // listener3: initial subscribe + init notify + change notify = 3 calls
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(3);
    });
  });
});
