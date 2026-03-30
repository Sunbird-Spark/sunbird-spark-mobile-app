import { getClient } from '../lib/http-client';
import { syncConfig } from './sync/SyncConfig';
import { keyValueDbService, KVKey } from './db/KeyValueDbService';

/**
 * ChannelManager handles dynamic channel ID management
 * The channel ID is obtained from organization API and set in HTTP headers
 */
export class ChannelManager {
  private static channelId: string | null = null;

  /**
   * Set the channel ID in HTTP client headers
   */
  static setChannelId(channelId: string): void {
    this.channelId = channelId;
    const httpClient = getClient();
    httpClient.updateHeaders([
      { key: 'x-channel-id', value: channelId, action: 'add' },
    ]);
    syncConfig.setChannelId(channelId);
    keyValueDbService.set(KVKey.ACTIVE_CHANNEL_ID, channelId).catch(() => {});
  }

  /**
   * Get the current channel ID
   */
  static getChannelId(): string | null {
    return this.channelId;
  }

  /**
   * Remove channel ID from headers
   */
  static removeChannelId(): void {
    this.channelId = null;
    const httpClient = getClient();
    httpClient.updateHeaders([
      { key: 'x-channel-id', value: '', action: 'remove' },
    ]);
  }

  /**
   * Check if channel ID is set
   */
  static hasChannelId(): boolean {
    return this.channelId !== null;
  }
}