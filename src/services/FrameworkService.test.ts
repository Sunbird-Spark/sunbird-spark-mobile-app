import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FrameworkService } from './FrameworkService';
import { getClient } from '../lib/http-client';
import { mockFrameworkResponse, mockApiError } from '../__mocks__/apiMocks';

// Mock the HTTP client
vi.mock('../lib/http-client', () => ({
  getClient: vi.fn()
}));

vi.mock('./db/ConfigDbService', () => ({
  configDbService: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('./network/networkService', () => ({
  networkService: { isConnected: vi.fn().mockReturnValue(true), subscribe: vi.fn() },
}));

describe('FrameworkService', () => {
  let frameworkService: FrameworkService;
  let mockHttpClient: any;

  beforeEach(() => {
    frameworkService = new FrameworkService();
    mockHttpClient = {
      get: vi.fn()
    };
    (getClient as any).mockReturnValue(mockHttpClient);
  });

  describe('read', () => {
    it('should successfully read framework by ID', async () => {
      // Arrange
      const frameworkId = 'NCF';
      mockHttpClient.get.mockResolvedValue(mockFrameworkResponse);

      // Act
      const result = await frameworkService.read(frameworkId);

      // Assert
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/framework/v1/read/${frameworkId}`,
        {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      );
      expect(result).toEqual(mockFrameworkResponse);
      expect(result.data.result.framework.identifier).toBe(frameworkId);
      expect(result.data.result.framework.name).toBe('State (Uttar Pradesh)');
    });

    it('should handle API errors', async () => {
      // Arrange
      const frameworkId = 'invalid-framework-id';
      mockHttpClient.get.mockRejectedValue(mockApiError);

      // Act & Assert
      await expect(frameworkService.read(frameworkId)).rejects.toThrow('API Error');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/framework/v1/read/${frameworkId}`,
        {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      );
    });

    it('should pass correct headers', async () => {
      // Arrange
      const frameworkId = 'NCF';
      mockHttpClient.get.mockResolvedValue(mockFrameworkResponse);

      // Act
      await frameworkService.read(frameworkId);

      // Assert
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/framework/v1/read/${frameworkId}`,
        expect.objectContaining({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      );
    });

    it('should handle different framework IDs', async () => {
      // Arrange
      const frameworkIds = ['NCF', 'CBSE', 'ICSE'];
      mockHttpClient.get.mockResolvedValue(mockFrameworkResponse);

      // Act & Assert
      for (const frameworkId of frameworkIds) {
        await frameworkService.read(frameworkId);
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          `/framework/v1/read/${frameworkId}`,
          expect.any(Object)
        );
      }
    });

    it('should return framework categories', async () => {
      // Arrange
      const frameworkId = 'NCF';
      mockHttpClient.get.mockResolvedValue(mockFrameworkResponse);

      // Act
      const result = await frameworkService.read(frameworkId);

      // Assert
      expect(result.data.result.framework.categories).toBeDefined();
      expect(result.data.result.framework.categories).toHaveLength(2);
      expect(result.data.result.framework.categories[0].code).toBe('board');
      expect(result.data.result.framework.categories[1].code).toBe('medium');
    });

    it('should return framework with correct structure', async () => {
      // Arrange
      const frameworkId = 'NCF';
      mockHttpClient.get.mockResolvedValue(mockFrameworkResponse);

      // Act
      const result = await frameworkService.read(frameworkId);

      // Assert
      expect(result.data.result.framework).toHaveProperty('identifier');
      expect(result.data.result.framework).toHaveProperty('name');
      expect(result.data.result.framework).toHaveProperty('description');
      expect(result.data.result.framework).toHaveProperty('code');
      expect(result.data.result.framework).toHaveProperty('categories');
      expect(result.data.result.framework).toHaveProperty('type');
      expect(result.data.result.framework).toHaveProperty('objectType');
    });
  });
});