import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChannelManager } from './ChannelManager';
import { getClient } from '../lib/http-client';

// Mock the HTTP client
vi.mock('../lib/http-client', () => ({
  getClient: vi.fn()
}));

describe('ChannelManager', () => {
  let mockHttpClient: any;

  beforeEach(() => {
    mockHttpClient = {
      updateHeaders: vi.fn()
    };
    (getClient as any).mockReturnValue(mockHttpClient);
    
    // Clear all mocks
    vi.clearAllMocks();
    
    // Reset ChannelManager state
    ChannelManager.removeChannelId();
  });

  describe('setChannelId', () => {
    it('should set channel ID and update headers', () => {
      // Arrange
      const channelId = '0143635463018987520';

      // Act
      ChannelManager.setChannelId(channelId);

      // Assert
      expect(ChannelManager.getChannelId()).toBe(channelId);
      expect(mockHttpClient.updateHeaders).toHaveBeenCalledWith([
        { key: 'x-channel-id', value: channelId, action: 'add' }
      ]);
    });

    it('should update channel ID when called multiple times', () => {
      // Arrange
      const channelId1 = 'channel1';
      const channelId2 = 'channel2';

      // Act
      ChannelManager.setChannelId(channelId1);
      ChannelManager.setChannelId(channelId2);

      // Assert
      expect(ChannelManager.getChannelId()).toBe(channelId2);
      expect(mockHttpClient.updateHeaders).toHaveBeenCalledTimes(3); // 1 from beforeEach + 2 from setChannelId calls
      expect(mockHttpClient.updateHeaders).toHaveBeenLastCalledWith([
        { key: 'x-channel-id', value: channelId2, action: 'add' }
      ]);
    });
  });

  describe('getChannelId', () => {
    it('should return null when no channel ID is set', () => {
      // Act & Assert
      expect(ChannelManager.getChannelId()).toBeNull();
    });

    it('should return the set channel ID', () => {
      // Arrange
      const channelId = '0143635463018987520';
      ChannelManager.setChannelId(channelId);

      // Act & Assert
      expect(ChannelManager.getChannelId()).toBe(channelId);
    });
  });

  describe('removeChannelId', () => {
    it('should remove channel ID and update headers', () => {
      // Arrange
      const channelId = '0143635463018987520';
      ChannelManager.setChannelId(channelId);

      // Act
      ChannelManager.removeChannelId();

      // Assert
      expect(ChannelManager.getChannelId()).toBeNull();
      expect(mockHttpClient.updateHeaders).toHaveBeenLastCalledWith([
        { key: 'x-channel-id', value: '', action: 'remove' }
      ]);
    });

    it('should handle removing when no channel ID is set', () => {
      // Act
      ChannelManager.removeChannelId();

      // Assert
      expect(ChannelManager.getChannelId()).toBeNull();
      expect(mockHttpClient.updateHeaders).toHaveBeenCalledWith([
        { key: 'x-channel-id', value: '', action: 'remove' }
      ]);
    });
  });

  describe('hasChannelId', () => {
    it('should return false when no channel ID is set', () => {
      // Act & Assert
      expect(ChannelManager.hasChannelId()).toBe(false);
    });

    it('should return true when channel ID is set', () => {
      // Arrange
      const channelId = '0143635463018987520';
      ChannelManager.setChannelId(channelId);

      // Act & Assert
      expect(ChannelManager.hasChannelId()).toBe(true);
    });

    it('should return false after removing channel ID', () => {
      // Arrange
      const channelId = '0143635463018987520';
      ChannelManager.setChannelId(channelId);

      // Act
      ChannelManager.removeChannelId();

      // Assert
      expect(ChannelManager.hasChannelId()).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete channel management flow', () => {
      // Arrange
      const channelId = '0143635463018987520';

      // Act & Assert - Initial state
      expect(ChannelManager.hasChannelId()).toBe(false);
      expect(ChannelManager.getChannelId()).toBeNull();

      // Act & Assert - Set channel ID
      ChannelManager.setChannelId(channelId);
      expect(ChannelManager.hasChannelId()).toBe(true);
      expect(ChannelManager.getChannelId()).toBe(channelId);
      expect(mockHttpClient.updateHeaders).toHaveBeenCalledWith([
        { key: 'x-channel-id', value: channelId, action: 'add' }
      ]);

      // Act & Assert - Remove channel ID
      ChannelManager.removeChannelId();
      expect(ChannelManager.hasChannelId()).toBe(false);
      expect(ChannelManager.getChannelId()).toBeNull();
      expect(mockHttpClient.updateHeaders).toHaveBeenLastCalledWith([
        { key: 'x-channel-id', value: '', action: 'remove' }
      ]);
    });
  });
});