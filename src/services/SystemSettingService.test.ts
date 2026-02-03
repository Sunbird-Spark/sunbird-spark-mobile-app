import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemSettingService } from './SystemSettingService';
import { getClient } from '../lib/http-client';
import { mockSystemSettingResponse, mockApiError } from '../__mocks__/apiMocks';

// Mock getClient
vi.mock('../lib/http-client', () => ({
  getClient: vi.fn(() => ({
    get: vi.fn()
  }))
}));

describe('SystemSettingService', () => {
  let systemSettingService: SystemSettingService;
  let mockClient: any;

  beforeEach(() => {
    systemSettingService = new SystemSettingService();
    mockClient = {
      get: vi.fn()
    };
    (getClient as any).mockReturnValue(mockClient);
    vi.clearAllMocks();
  });

  describe('read', () => {
    it('should successfully read system setting by ID', async () => {
      // Arrange
      const settingId = 'sunbird';
      mockClient.get.mockResolvedValue(mockSystemSettingResponse);

      // Act
      const result = await systemSettingService.read(settingId);

      // Assert
      expect(mockClient.get).toHaveBeenCalledWith(
        `/learner/data/v1/system/settings/get/${settingId}`,
        {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      );
      expect(result).toBe(mockSystemSettingResponse);
    });

    it('should handle API errors', async () => {
      // Arrange
      const settingId = 'invalid-setting';
      mockClient.get.mockRejectedValue(mockApiError);

      // Act & Assert
      await expect(systemSettingService.read(settingId)).rejects.toThrow('API Error');
    });

    it('should use correct endpoint path', async () => {
      // Arrange
      const settingId = 'sunbird';
      mockClient.get.mockResolvedValue(mockSystemSettingResponse);

      // Act
      await systemSettingService.read(settingId);

      // Assert
      expect(mockClient.get).toHaveBeenCalledWith(
        `/learner/data/v1/system/settings/get/${settingId}`,
        expect.any(Object)
      );
    });

    it('should pass correct headers', async () => {
      // Arrange
      const settingId = 'sunbird';
      mockClient.get.mockResolvedValue(mockSystemSettingResponse);

      // Act
      await systemSettingService.read(settingId);

      // Assert
      expect(mockClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      );
    });

    it('should handle different setting IDs', async () => {
      // Arrange
      const settingIds = ['sunbird', 'portal', 'mobile'];
      mockClient.get.mockResolvedValue(mockSystemSettingResponse);

      // Act & Assert
      for (const settingId of settingIds) {
        await systemSettingService.read(settingId);
        expect(mockClient.get).toHaveBeenCalledWith(
          `/learner/data/v1/system/settings/get/${settingId}`,
          expect.any(Object)
        );
      }
    });
  });
});