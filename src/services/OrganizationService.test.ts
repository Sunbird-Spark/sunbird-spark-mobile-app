import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationService } from './OrganizationService';
import { getClient } from '../lib/http-client';
import { mockOrganizationResponse, mockApiError } from '../__mocks__/apiMocks';

// Mock the HTTP client
vi.mock('../lib/http-client', () => ({
  getClient: vi.fn()
}));

describe('OrganizationService', () => {
  let organizationService: OrganizationService;
  let mockHttpClient: any;

  beforeEach(() => {
    organizationService = new OrganizationService();
    mockHttpClient = {
      post: vi.fn()
    };
    (getClient as any).mockReturnValue(mockHttpClient);
  });

  describe('search', () => {
    it('should successfully search organizations', async () => {
      // Arrange
      const searchPayload = {
        request: {
          filters: {
            slug: 'sunbird',
            isTenant: true
          }
        }
      };
      mockHttpClient.post.mockResolvedValue(mockOrganizationResponse);

      // Act
      const result = await organizationService.search(searchPayload);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/org/v2/search',
        searchPayload,
        {
          'Content-Type': 'application/json'
        }
      );
      expect(result).toEqual(mockOrganizationResponse);
      expect(result.data.result.response.content).toHaveLength(1);
      expect(result.data.result.response.content[0].channel).toBe('sunbird');
    });

    it('should handle API errors', async () => {
      // Arrange
      const searchPayload = {
        request: {
          filters: {
            slug: 'invalid',
            isTenant: true
          }
        }
      };
      mockHttpClient.post.mockRejectedValue(mockApiError);

      // Act & Assert
      await expect(organizationService.search(searchPayload)).rejects.toThrow('API Error');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/org/v2/search',
        searchPayload,
        {
          'Content-Type': 'application/json'
        }
      );
    });

    it('should pass correct headers', async () => {
      // Arrange
      const searchPayload = { request: { filters: {} } };
      mockHttpClient.post.mockResolvedValue(mockOrganizationResponse);

      // Act
      await organizationService.search(searchPayload);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/org/v2/search',
        searchPayload,
        expect.objectContaining({
          'Content-Type': 'application/json'
        })
      );
    });

    it('should handle empty search results', async () => {
      // Arrange
      const emptyResponse = {
        ...mockOrganizationResponse,
        data: {
          ...mockOrganizationResponse.data,
          result: {
            response: {
              count: 0,
              content: []
            }
          }
        }
      };
      mockHttpClient.post.mockResolvedValue(emptyResponse);

      // Act
      const result = await organizationService.search({ request: { filters: {} } });

      // Assert
      expect(result.data.result.response.content).toHaveLength(0);
      expect(result.data.result.response.count).toBe(0);
    });
  });
});