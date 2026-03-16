import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChannelService } from './ChannelService';
import { getClient } from '../lib/http-client';
import { mockChannelResponse, mockApiError } from '../__mocks__/apiMocks';

// Mock the HTTP client
vi.mock('../lib/http-client', () => ({
  getClient: vi.fn()
}));

describe('ChannelService', () => {
  let channelService: ChannelService;
  let mockHttpClient: any;

  beforeEach(() => {
    channelService = new ChannelService();
    mockHttpClient = {
      get: vi.fn()
    };
    (getClient as any).mockReturnValue(mockHttpClient);
  });

  describe('read', () => {
    it('should successfully read channel by ID', async () => {
      // Arrange
      const channelId = '0143635463018987520';
      mockHttpClient.get.mockResolvedValue(mockChannelResponse);

      // Act
      const result = await channelService.read(channelId);

      // Assert
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/channel/v1/read/${channelId}`,
        {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      );
      expect(result).toEqual(mockChannelResponse);
      expect(result.data.result.channel.identifier).toBe(channelId);
      expect(result.data.result.channel.name).toBe('Sunbird');
    });

    it('should handle API errors', async () => {
      // Arrange
      const channelId = 'invalid-channel-id';
      mockHttpClient.get.mockRejectedValue(mockApiError);

      // Act & Assert
      await expect(channelService.read(channelId)).rejects.toThrow('API Error');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/channel/v1/read/${channelId}`,
        {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      );
    });

    it('should pass correct headers', async () => {
      // Arrange
      const channelId = '0143635463018987520';
      mockHttpClient.get.mockResolvedValue(mockChannelResponse);

      // Act
      await channelService.read(channelId);

      // Assert
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/channel/v1/read/${channelId}`,
        expect.objectContaining({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      );
    });

    it('should handle different channel IDs', async () => {
      // Arrange
      const channelIds = ['channel1', 'channel2', 'channel3'];
      mockHttpClient.get.mockResolvedValue(mockChannelResponse);

      // Act & Assert
      for (const channelId of channelIds) {
        await channelService.read(channelId);
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          `/channel/v1/read/${channelId}`,
          expect.any(Object)
        );
      }
    });

    it('should return channel frameworks', async () => {
      // Arrange
      const channelId = '0143635463018987520';
      mockHttpClient.get.mockResolvedValue(mockChannelResponse);

      // Act
      const result = await channelService.read(channelId);

      // Assert
      expect(result.data.result.channel.frameworks).toBeDefined();
      expect(result.data.result.channel.frameworks).toHaveLength(1);
      expect(result.data.result.channel.frameworks[0].identifier).toBe('NCF');
    });
  });
});