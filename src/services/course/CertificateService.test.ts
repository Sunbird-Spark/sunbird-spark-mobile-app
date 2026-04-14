import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CertificateService } from './CertificateService';
import { getClient } from '../../lib/http-client';

vi.mock('../../lib/http-client', () => ({
  getClient: vi.fn(),
}));

describe('CertificateService', () => {
  let service: CertificateService;
  let mockHttpClient: any;

  beforeEach(() => {
    service = new CertificateService();
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
    };
    (getClient as any).mockReturnValue(mockHttpClient);
  });

  describe('search', () => {
    it('should call POST with recipientId filter', async () => {
      const mockResponse = {
        data: { certificates: [{ identifier: 'cert-1', recipientId: 'user-1' }] },
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await service.search('user-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/rc/certificate/v1/search', {
        filters: { recipientId: 'user-1' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include courseId filter when provided', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { certificates: [] }, status: 200 });

      await service.search('user-1', 'course-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/rc/certificate/v1/search', {
        filters: { recipientId: 'user-1', courseId: 'course-1' },
      });
    });

    it('should not include courseId filter when undefined', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { certificates: [] }, status: 200 });

      await service.search('user-1');

      const callArgs = mockHttpClient.post.mock.calls[0][1];
      expect(callArgs.filters.courseId).toBeUndefined();
    });

    it('should propagate errors', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Search failed'));

      await expect(service.search('user-1')).rejects.toThrow('Search failed');
    });
  });

  describe('download', () => {
    it('should call GET with correct URL containing certificateId', async () => {
      const mockResponse = { data: '<svg>certificate</svg>', status: 200 };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await service.download('cert-123');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/rc/certificate/v1/download/cert-123');
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Download failed'));

      await expect(service.download('cert-123')).rejects.toThrow('Download failed');
    });
  });
});
