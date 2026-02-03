import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemSettingService } from './SystemSettingService';
import { CapacitorHttp } from '@capacitor/core';
import { mockSystemSettingResponse, mockApiError } from '../__mocks__/apiMocks';

// Mock CapacitorHttp
vi.mock('@capacitor/core', () => ({
  CapacitorHttp: {
    get: vi.fn()
  }
}));

// Mock NativeConfigService
vi.mock('./NativeConfigService', () => ({
  NativeConfigServiceInstance: {
    load: vi.fn().mockResolvedValue({
      baseUrl: 'https://sandbox.sunbirded.org',
      mobileAppConsumer: '',
      mobileAppKey: '',
      mobileAppSecret: '',
      producerId: ''
    })
  }
}));

describe('SystemSettingService', () => {
  let systemSettingService: SystemSettingService;
  let mockConfig: any;

  beforeEach(() => {
    systemSettingService = new SystemSettingService();
    vi.clearAllMocks();
  });

  describe('read', () => {
    it('should successfully read system setting by ID', async () => {
      // Arrange
      const settingId = 'sunbird';
      const mockConfig = {
        baseUrl: 'https://sandbox.sunbirded.org'
      };
      (CapacitorHttp.get as any).mockResolvedValue(mockSystemSettingResponse);

      // Act
      const result = await systemSettingService.read(settingId);

      // Assert
      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: `${mockConfig.baseUrl}/learner/data/v1/system/settings/get/${settingId}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      expect(result.data.response.id).toBe(settingId);
      expect(result.status).toBe(200);
    });

    it('should handle API errors', async () => {
      // Arrange
      const settingId = 'invalid-setting';
      (CapacitorHttp.get as any).mockRejectedValue(mockApiError);

      // Act & Assert
      await expect(systemSettingService.read(settingId)).rejects.toThrow('API Error');
    });

    it('should use dynamic base URL from config', async () => {
      // Arrange
      const settingId = 'sunbird';
      (CapacitorHttp.get as any).mockResolvedValue(mockSystemSettingResponse);

      // Act
      await systemSettingService.read(settingId);

      // Assert
      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: expect.stringContaining('/learner/data/v1/system/settings/get/sunbird'),
        headers: expect.any(Object)
      });
    });

    it('should pass correct headers', async () => {
      // Arrange
      const settingId = 'sunbird';
      (CapacitorHttp.get as any).mockResolvedValue(mockSystemSettingResponse);

      // Act
      await systemSettingService.read(settingId);

      // Assert
      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: expect.any(String),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      });
    });

    it('should handle different setting IDs', async () => {
      // Arrange
      const settingIds = ['sunbird', 'portal', 'mobile'];
      (CapacitorHttp.get as any).mockResolvedValue(mockSystemSettingResponse);

      // Act & Assert
      for (const settingId of settingIds) {
        await systemSettingService.read(settingId);
        expect(CapacitorHttp.get).toHaveBeenCalledWith({
          url: expect.stringContaining(`/learner/data/v1/system/settings/get/${settingId}`),
          headers: expect.any(Object)
        });
      }
    });

    it('should map response correctly', async () => {
      // Arrange
      const settingId = 'sunbird';
      const capacitorResponse = {
        data: mockSystemSettingResponse.data,
        status: 200,
        headers: {}
      };
      (CapacitorHttp.get as any).mockResolvedValue(capacitorResponse);

      // Act
      const result = await systemSettingService.read(settingId);

      // Assert
      // The service extracts result from the full response (data.result)
      expect(result).toEqual({
        data: mockSystemSettingResponse.data.result,
        status: 200,
        headers: {}
      });
    });

    it('should handle response without result field', async () => {
      // Arrange
      const settingId = 'sunbird';
      const responseWithoutResult = {
        data: { someField: 'someValue' },
        status: 200,
        headers: {}
      };
      (CapacitorHttp.get as any).mockResolvedValue(responseWithoutResult);

      // Act
      const result = await systemSettingService.read(settingId);

      // Assert
      expect(result.data).toEqual({ someField: 'someValue' });
    });
  });
});