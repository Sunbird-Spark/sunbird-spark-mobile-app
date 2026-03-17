import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentService } from './ContentService';
import { getClient } from '../lib/http-client';
import { mockContentResponse, mockApiError } from '../__mocks__/apiMocks';

// Mock the HTTP client
vi.mock('../lib/http-client', () => ({
  getClient: vi.fn()
}));

describe('ContentService', () => {
  let contentService: ContentService;
  let mockHttpClient: any;

  beforeEach(() => {
    contentService = new ContentService();
    mockHttpClient = {
      post: vi.fn()
    };
    (getClient as any).mockReturnValue(mockHttpClient);
  });

  describe('getContent', () => {
    it('should successfully search for content', async () => {
      // Arrange
      const payload = {
        request: {
          filters: {
            contentType: ['Course'],
            status: ['Live']
          },
          limit: 10
        }
      };
      mockHttpClient.post.mockResolvedValue(mockContentResponse);

      // Act
      const result = await contentService.getContent(payload);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/content/v1/search',
        payload,
        {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      );
      expect(result).toEqual(mockContentResponse);
      expect(result.data.result.content).toHaveLength(2);
      expect(result.data.result.content[0].contentType).toBe('Course');
    });

    it('should handle API errors', async () => {
      // Arrange
      const payload = { request: { filters: {}, limit: 5 } };
      mockHttpClient.post.mockRejectedValue(mockApiError);

      // Act & Assert
      await expect(contentService.getContent(payload)).rejects.toThrow('API Error');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/content/v1/search',
        payload,
        expect.any(Object)
      );
    });

    it('should pass custom request payload', async () => {
      // Arrange
      const customPayload = {
        request: {
          filters: {
            contentType: ['TextBook'],
            status: ['Draft']
          },
          limit: 20
        }
      };
      mockHttpClient.post.mockResolvedValue(mockContentResponse);

      // Act
      await contentService.getContent(customPayload);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/content/v1/search',
        customPayload,
        expect.any(Object)
      );
    });

    it('should pass correct headers', async () => {
      // Arrange
      const payload = { request: { filters: {} } };
      mockHttpClient.post.mockResolvedValue(mockContentResponse);

      // Act
      await contentService.getContent(payload);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      );
    });

    it('should return content with correct structure', async () => {
      // Arrange
      const payload = { request: { filters: {} } };
      mockHttpClient.post.mockResolvedValue(mockContentResponse);

      // Act
      const result = await contentService.getContent(payload);

      // Assert
      expect(result.data.result.count).toBe(2);
      expect(result.data.result.content[0]).toHaveProperty('identifier');
      expect(result.data.result.content[0]).toHaveProperty('name');
      expect(result.data.result.content[0]).toHaveProperty('contentType');
      expect(result.data.result.content[0]).toHaveProperty('status');
    });

    it('should handle empty content results', async () => {
      // Arrange
      const payload = { request: { filters: {} } };
      const emptyResponse = {
        ...mockContentResponse,
        data: {
          ...mockContentResponse.data,
          result: {
            count: 0,
            content: []
          }
        }
      };
      mockHttpClient.post.mockResolvedValue(emptyResponse);

      // Act
      const result = await contentService.getContent(payload);

      // Assert
      expect(result.data.result.content).toHaveLength(0);
      expect(result.data.result.count).toBe(0);
    });
  });

  describe('contentSearch', () => {
    const mockSearchResponse = {
      data: { count: 1, content: [{ identifier: 'do_1', name: 'Item' }] },
      status: 200,
      headers: {},
    };

    it('should call composite search endpoint with default values', async () => {
      mockHttpClient.post.mockResolvedValue(mockSearchResponse);

      const result = await contentService.contentSearch();

      expect(mockHttpClient.post).toHaveBeenCalledWith('/composite/v1/search', {
        request: {
          filters: {},
          facets: undefined,
          limit: 9,
          offset: 0,
          query: '',
          sort_by: { lastUpdatedOn: 'desc' },
        },
      });
      expect(result).toEqual(mockSearchResponse);
    });

    it('should pass custom filters', async () => {
      mockHttpClient.post.mockResolvedValue(mockSearchResponse);

      await contentService.contentSearch({
        filters: { primaryCategory: ['Course'] },
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/composite/v1/search', {
        request: expect.objectContaining({
          filters: { primaryCategory: ['Course'] },
        }),
      });
    });

    it('should pass custom limit and offset', async () => {
      mockHttpClient.post.mockResolvedValue(mockSearchResponse);

      await contentService.contentSearch({ limit: 20, offset: 10 });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/composite/v1/search', {
        request: expect.objectContaining({
          limit: 20,
          offset: 10,
        }),
      });
    });

    it('should pass query and sort_by', async () => {
      mockHttpClient.post.mockResolvedValue(mockSearchResponse);

      await contentService.contentSearch({
        query: 'math',
        sort_by: { lastUpdatedOn: 'asc' },
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/composite/v1/search', {
        request: expect.objectContaining({
          query: 'math',
          sort_by: { lastUpdatedOn: 'asc' },
        }),
      });
    });

    it('should pass facets when provided', async () => {
      mockHttpClient.post.mockResolvedValue(mockSearchResponse);

      await contentService.contentSearch({ facets: ['primaryCategory', 'medium'] });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/composite/v1/search', {
        request: expect.objectContaining({
          facets: ['primaryCategory', 'medium'],
        }),
      });
    });

    it('should propagate errors from the HTTP client', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      await expect(contentService.contentSearch()).rejects.toThrow('Network error');
    });
  });
});