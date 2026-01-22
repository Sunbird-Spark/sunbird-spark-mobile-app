// src/services/network/networkService.ts
import { Network, type ConnectionStatus, type PluginListenerHandle } from '@capacitor/network';

/**
 * This is the shape your app will use everywhere.
 * Keep it simple and stable.
 */
export type NetworkState = {
  connected: boolean;
  connectionType: ConnectionStatus['connectionType'];
};

type NetworkListener = (state: NetworkState) => void;

class NetworkService {

  private state: NetworkState = {
    connected: true,
    connectionType: 'unknown',
  };

  private initialized = false;


  private handle: PluginListenerHandle | null = null;


  private listeners = new Set<NetworkListener>();

  /**
   * init()
   * - gets initial status
   * - attaches listener exactly ONCE
   */
  async init(): Promise<void> {
    // If already initialized, do nothing.
    if (this.initialized) return;

    // 1) Initial state
    const initialStatus = await Network.getStatus();
    this.state = {
      connected: initialStatus.connected,
      connectionType: initialStatus.connectionType,
    };
    this.notify();

    // 2) Listen for realtime changes
    this.handle = await Network.addListener('networkStatusChange', (status) => {
      this.state = {
        connected: status.connected,
        connectionType: status.connectionType,
      };
      this.notify();
    });

    this.initialized = true;
  }

  /**
   * subscribe()
   * - lets provider/controllers listen for changes
   * - returns unsubscribe()
   */
  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);

    // Immediately emit current state so subscriber has data
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * (optional) stop()
   * - removes listener if you ever need to reset (logout etc.)
   */
  async stop(): Promise<void> {
    await this.handle?.remove();
    this.handle = null;
    this.initialized = false;
  }

  /** internal helper to broadcast changes */
  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}


export const networkService = new NetworkService();