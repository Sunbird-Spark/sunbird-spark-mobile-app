import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchService } from './BatchService';
import { getClient } from '../../lib/http-client';
import { networkService } from '../network/networkService';
import { keyValueDbService } from '../db/KeyValueDbService';
import { enrolledCoursesDbService } from '../db/EnrolledCoursesDbService';
import { courseProgressEnqueuer } from '../sync/CourseProgressEnqueuer';
import { networkQueueDbService } from '../db/NetworkQueueDbService';
import { contentStateSyncService } from './ContentStateSyncService';
import type {
  ContentStateReadRequest,
  ContentStateUpdateRequest,
} from '../../types/collectionTypes';

vi.mock('../../lib/http-client', () => ({
  getClient: vi.fn(),
}));

vi.mock('../network/networkService', () => ({
  networkService: { isConnected: vi.fn().mockReturnValue(true), subscribe: vi.fn() },
}));

vi.mock('../db/KeyValueDbService', () => ({
  keyValueDbService: {
    getRaw: vi.fn().mockResolvedValue(null),
    setRaw: vi.fn().mockResolvedValue(undefined),
  },
}));

// contentStateRead now fully delegates to ContentStateSyncService
vi.mock('./ContentStateSyncService', () => ({
  contentStateSyncService: {
    readContentState: vi.fn(),
  },
}));

vi.mock('../db/EnrolledCoursesDbService', () => ({
  enrolledCoursesDbService: {
    upsertBatch: vi.fn().mockResolvedValue(undefined),
    getByUser: vi.fn().mockResolvedValue([]),
    updateProgress: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../sync/CourseProgressEnqueuer', () => ({
  courseProgressEnqueuer: {
    enqueue: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../db/NetworkQueueDbService', () => ({
  networkQueueDbService: {
    insert: vi.fn().mockResolvedValue('mock-msg-id'),
  },
}));

describe('BatchService', () => {
  let service: BatchService;
  let mockHttpClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
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
    it('should delegate to contentStateSyncService.readContentState', async () => {
      const mockResponse = { data: { contentList: [{ contentId: 'c1', status: 2 }] }, status: 200, headers: {} };
      (contentStateSyncService.readContentState as any).mockResolvedValue(mockResponse);

      const request: ContentStateReadRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contentIds: ['c1'],
      };

      const result = await service.contentStateRead(request);

      expect(contentStateSyncService.readContentState).toHaveBeenCalledWith(request);
      expect(result).toEqual(mockResponse);
      // BatchService itself must NOT make any HTTP calls for reads
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should propagate the result from contentStateSyncService', async () => {
      const offlineResponse = { data: { contentList: [] }, status: 200, headers: {} };
      (contentStateSyncService.readContentState as any).mockResolvedValue(offlineResponse);

      const request: ContentStateReadRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contentIds: [],
      };

      const result = await service.contentStateRead(request);

      expect(result).toEqual(offlineResponse);
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

  describe('contentStateUpdate — offline path', () => {
    it('should enqueue via courseProgressEnqueuer and return offline response when offline', async () => {
      (networkService.isConnected as any).mockReturnValue(false);

      const request: ContentStateUpdateRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contents: [{ contentId: 'c1', status: 2 }],
      };

      const result = await service.contentStateUpdate(request);

      expect(result).toMatchObject({ data: { message: 'Queued for sync' }, status: 200 });
      expect(mockHttpClient.patch).not.toHaveBeenCalled();
      expect(courseProgressEnqueuer.enqueue).toHaveBeenCalledWith({
        userId: 'user-1',
        contents: [{ contentId: 'c1', status: 2, courseId: 'course-1', batchId: 'batch-1' }],
      });
    });

    it('should enqueue via courseProgressEnqueuer when API fails', async () => {
      mockHttpClient.patch.mockRejectedValue(new Error('Server error'));

      const request: ContentStateUpdateRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contents: [{ contentId: 'c1', status: 2 }],
      };

      const result = await service.contentStateUpdate(request);

      expect(result).toMatchObject({ data: { message: 'Queued for sync' }, status: 200 });
      expect(courseProgressEnqueuer.enqueue).toHaveBeenCalled();
    });

    it('should also enqueue assessments into network_queue when present', async () => {
      (networkService.isConnected as any).mockReturnValue(false);

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

      expect(networkQueueDbService.insert).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'course_assesment' })
      );
    });

    it('should not insert into networkQueueDbService when no assessments', async () => {
      (networkService.isConnected as any).mockReturnValue(false);

      const request: ContentStateUpdateRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contents: [{ contentId: 'c1', status: 1 }],
      };

      await service.contentStateUpdate(request);

      expect(networkQueueDbService.insert).not.toHaveBeenCalled();
    });

    it('should update local course progress when content reaches status 2', async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      (enrolledCoursesDbService.getByUser as any).mockResolvedValue([{
        course_id: 'course-1',
        user_id: 'user-1',
        details: { courseId: 'course-1', name: 'Test', leafNodesCount: 2 },
        enrolled_on: Date.now(),
        progress: 0,
        status: 'active',
      }]);
      (keyValueDbService.getRaw as any).mockResolvedValue(
        JSON.stringify({ contentList: [{ contentId: 'c1', status: 2 }, { contentId: 'c2', status: 2 }] })
      );

      const request: ContentStateUpdateRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contents: [{ contentId: 'c1', status: 2 }],
      };

      await service.contentStateUpdate(request);

      expect(enrolledCoursesDbService.updateProgress).toHaveBeenCalledWith(
        'course-1', 'user-1', 100, 'completed'
      );
    });

    it('should skip local progress update if course entry not found in DB', async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      vi.mocked(enrolledCoursesDbService.getByUser).mockResolvedValue([]);

      const request: ContentStateUpdateRequest = {
        userId: 'user-1',
        courseId: 'course-1',
        batchId: 'batch-1',
        contents: [{ contentId: 'c1', status: 2 }],
      };

      await service.contentStateUpdate(request);
      expect(enrolledCoursesDbService.updateProgress).not.toHaveBeenCalled();
    });

    it('should handle JSON parse errors in local progress update', async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      vi.mocked(enrolledCoursesDbService.getByUser).mockResolvedValue([{ course_id: 'c1', details: {} } as any]);
      vi.mocked(keyValueDbService.getRaw).mockResolvedValue('invalid-json');

      const request: ContentStateUpdateRequest = {
        userId: 'u1',
        courseId: 'c1',
        batchId: 'b1',
        contents: [{ contentId: 'c1', status: 2 }],
      };

      await service.contentStateUpdate(request);
      expect(enrolledCoursesDbService.updateProgress).not.toHaveBeenCalled();
    });

    it('should skip local progress update if leafNodesCount is 0', async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      vi.mocked(enrolledCoursesDbService.getByUser).mockResolvedValue([{
        course_id: 'c1',
        details: { leafNodesCount: 0 }
      } as any]);

      const request: ContentStateUpdateRequest = {
        userId: 'u1', courseId: 'c1', batchId: 'b1',
        contents: [{ contentId: 'c1', status: 2 }],
      };

      await service.contentStateUpdate(request);
      expect(enrolledCoursesDbService.updateProgress).not.toHaveBeenCalled();
    });
  });
});
