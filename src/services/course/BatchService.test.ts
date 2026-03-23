import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchService } from './BatchService';
import { getClient } from '../../lib/http-client';
import type {
  ContentStateReadRequest,
  ContentStateUpdateRequest,
} from '../../types/collectionTypes';

vi.mock('../../lib/http-client', () => ({
  getClient: vi.fn(),
}));

describe('BatchService', () => {
  let service: BatchService;
  let mockHttpClient: any;

  beforeEach(() => {
    service = new BatchService();
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    };
    (getClient as any).mockReturnValue(mockHttpClient);
  });

  describe('batchList', () => {
    it('should call POST with correct URL and courseId filter', async () => {
      const mockResponse = { data: { response: { content: [], count: 0 } }, status: 200 };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await service.batchList('course-123');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/course/v1/batch/list', {
        request: { filters: { courseId: 'course-123' } },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      await expect(service.batchList('course-123')).rejects.toThrow('Network error');
    });
  });

  describe('batchRead', () => {
    it('should call GET with correct URL containing batchId', async () => {
      const mockResponse = { data: { response: { identifier: 'batch-1' } }, status: 200 };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await service.batchRead('batch-1');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/course/v1/batch/read/batch-1');
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Not found'));

      await expect(service.batchRead('invalid')).rejects.toThrow('Not found');
    });
  });

  describe('enrol', () => {
    it('should call POST with courseId, userId, and batchId', async () => {
      const mockResponse = { data: {}, status: 200 };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await service.enrol('course-1', 'user-1', 'batch-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/course/v1/enrol', {
        request: { courseId: 'course-1', userId: 'user-1', batchId: 'batch-1' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Enrollment failed'));

      await expect(service.enrol('c', 'u', 'b')).rejects.toThrow('Enrollment failed');
    });
  });

  describe('unenrol', () => {
    it('should call POST with courseId, userId, and batchId', async () => {
      const mockResponse = { data: {}, status: 200 };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await service.unenrol('course-1', 'user-1', 'batch-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/course/v1/unenrol', {
        request: { courseId: 'course-1', userId: 'user-1', batchId: 'batch-1' },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('contentStateRead', () => {
    it('should call POST with all request fields', async () => {
      const mockResponse = { data: { contentList: [] }, status: 200 };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const request: ContentStateReadRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contentIds: ['content-1', 'content-2'],
      };

      const result = await service.contentStateRead(request);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/course/v1/content/state/read', {
        request: {
          userId: 'user-1',
          courseId: 'course-1',
          batchId: 'batch-1',
          contentIds: ['content-1', 'content-2'],
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include fields when provided', async () => {
      mockHttpClient.post.mockResolvedValue({ data: {}, status: 200 });

      const request: ContentStateReadRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contentIds: ['content-1'],
        fields: ['status', 'score'],
      };

      await service.contentStateRead(request);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/course/v1/content/state/read', {
        request: expect.objectContaining({
          fields: ['status', 'score'],
        }),
      });
    });

    it('should omit fields when empty array', async () => {
      mockHttpClient.post.mockResolvedValue({ data: {}, status: 200 });

      const request: ContentStateReadRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contentIds: ['content-1'],
        fields: [],
      };

      await service.contentStateRead(request);

      const callArgs = mockHttpClient.post.mock.calls[0][1];
      expect(callArgs.request.fields).toBeUndefined();
    });
  });

  describe('contentStateUpdate', () => {
    it('should call PATCH with mapped contents', async () => {
      mockHttpClient.patch.mockResolvedValue({ data: {}, status: 200 });

      const request: ContentStateUpdateRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contents: [
          { contentId: 'c1', status: 2 },
          { contentId: 'c2', status: 1, lastAccessTime: '2024-01-01' },
        ],
      };

      await service.contentStateUpdate(request);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/course/v1/content/state/update', {
        request: {
          userId: 'user-1',
          contents: [
            { contentId: 'c1', status: 2, courseId: 'course-1', batchId: 'batch-1' },
            { contentId: 'c2', status: 1, courseId: 'course-1', batchId: 'batch-1', lastAccessTime: '2024-01-01' },
          ],
        },
      });
    });

    it('should include assessments when provided', async () => {
      mockHttpClient.patch.mockResolvedValue({ data: {}, status: 200 });

      const request: ContentStateUpdateRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contents: [{ contentId: 'c1', status: 2 }],
        assessments: [
          {
            assessmentTs: 123456,
            batchId: 'batch-1',
            courseId: 'course-1',
            userId: 'user-1',
            attemptId: 'attempt-1',
            contentId: 'c1',
            events: [],
          },
        ],
      };

      await service.contentStateUpdate(request);

      const callArgs = mockHttpClient.patch.mock.calls[0][1];
      expect(callArgs.request.assessments).toHaveLength(1);
    });

    it('should omit assessments when empty', async () => {
      mockHttpClient.patch.mockResolvedValue({ data: {}, status: 200 });

      const request: ContentStateUpdateRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contents: [{ contentId: 'c1', status: 2 }],
        assessments: [],
      };

      await service.contentStateUpdate(request);

      const callArgs = mockHttpClient.patch.mock.calls[0][1];
      expect(callArgs.request.assessments).toBeUndefined();
    });
  });

  describe('forceSyncActivityAgg', () => {
    it('should call POST with userId, courseId, and batchId', async () => {
      mockHttpClient.post.mockResolvedValue({ data: {}, status: 200 });

      await service.forceSyncActivityAgg({
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/user/v1/activity/agg', {
        request: {
          userId: 'user-1',
          courseId: 'course-1',
          batchId: 'batch-1',
        },
      });
    });
  });
});
