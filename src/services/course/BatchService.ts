import { getClient, ApiResponse } from '../../lib/http-client';
import { buildOfflineResponse } from '../../lib/http-client/offlineResponse';
import type {
  BatchListResponse,
  BatchReadResponse,
  ContentStateItem,
  ContentStateReadRequest,
  ContentStateReadResponse,
  ContentStateUpdateRequest,
} from '../../types/collectionTypes';
import { keyValueDbService } from '../db/KeyValueDbService';
import { networkQueueDbService } from '../db/NetworkQueueDbService';
import { enrolledCoursesDbService } from '../db/EnrolledCoursesDbService';
import { networkService } from '../network/networkService';
import { courseProgressEnqueuer } from '../sync/CourseProgressEnqueuer';
import { NetworkQueueType } from '../sync/types';

export class BatchService {
  public batchList(courseId: string): Promise<ApiResponse<BatchListResponse>> {
    return getClient().post<BatchListResponse>('/course/v1/batch/list', {
      request: { filters: { courseId } },
    });
  }

  public batchRead(batchId: string): Promise<ApiResponse<BatchReadResponse>> {
    return getClient().get<BatchReadResponse>(`/course/v1/batch/read/${batchId}`);
  }

  public enrol(courseId: string, userId: string, batchId: string): Promise<ApiResponse<unknown>> {
    return getClient().post('/course/v1/enrol', {
      request: { courseId, userId, batchId },
    });
  }

  public unenrol(courseId: string, userId: string, batchId: string): Promise<ApiResponse<unknown>> {
    return getClient().post('/course/v1/unenrol', {
      request: { courseId, userId, batchId },
    });
  }

  public async contentStateRead(
    request: ContentStateReadRequest
  ): Promise<ApiResponse<ContentStateReadResponse>> {
    const key = `cache:content_state_${request.userId}_${request.courseId}`;

    if (!networkService.isConnected()) {
      return this.readContentStateFromDb(key);
    }

    try {
      const body: Record<string, unknown> = {
        userId: request.userId,
        courseId: request.courseId,
        batchId: request.batchId,
        contentIds: request.contentIds,
      };
      if (request.fields?.length) {
        body.fields = request.fields;
      }
      const response = await getClient().post<ContentStateReadResponse>(
        '/course/v1/content/state/read',
        { request: body }
      );

      try {
        await keyValueDbService.setRaw(key, JSON.stringify(response.data));
      } catch (err) {
        console.warn('[BatchService] Failed to cache content state to SQLite:', err);
      }

      return response;
    } catch {
      return this.readContentStateFromDb(key);
    }
  }

  private async readContentStateFromDb(key: string): Promise<ApiResponse<ContentStateReadResponse>> {
    const raw = await keyValueDbService.getRaw(key);
    const data: ContentStateReadResponse = raw ? JSON.parse(raw) : { contentList: [] };
    return buildOfflineResponse<ContentStateReadResponse>(data);
  }

  public async contentStateUpdate(
    request: ContentStateUpdateRequest
  ): Promise<ApiResponse<unknown>> {
    if (!networkService.isConnected()) {
      await this.queueAndApplyLocally(request);
      return buildOfflineResponse({ message: 'Queued for sync' });
    }

    try {
      const contents = request.contents.map((item) => ({
        contentId: item.contentId,
        status: item.status,
        courseId: request.courseId,
        batchId: request.batchId,
        ...(item.lastAccessTime != null && { lastAccessTime: item.lastAccessTime }),
      }));
      const body: Record<string, unknown> = {
        userId: request.userId,
        contents,
      };
      if (request.assessments?.length) {
        body.assessments = request.assessments;
      }
      return await getClient().patch<unknown>('/course/v1/content/state/update', {
        request: body,
      });
    } catch {
      await this.queueAndApplyLocally(request);
      return buildOfflineResponse({ message: 'Queued for sync' });
    }
  }

  // ── Offline helpers ──────────────────────────────────────────────────────────

  /**
   * Route the request to the network_queue and immediately apply it to local caches.
   *
   * Progress updates go via CourseProgressEnqueuer (COURSE_PROGRESS queue).
   * Assessment bundles (from SelfAssess sessions) go directly into the
   * COURSE_ASSESMENT queue — they are already fully aggregated at call time.
   *
   * updateLocalContentStateCache and updateLocalCourseProgress must still run
   * so the UI reflects progress immediately without waiting for sync.
   */
  private async queueAndApplyLocally(request: ContentStateUpdateRequest): Promise<void> {
    const mappedContents = request.contents.map((c) => ({
      contentId:   c.contentId,
      status:      c.status,
      courseId:    request.courseId,
      batchId:     request.batchId,
      ...(c.lastAccessTime != null && { lastAccessTime: c.lastAccessTime }),
    }));

    const ops: Promise<unknown>[] = [
      courseProgressEnqueuer.enqueue({
        userId:   request.userId,
        contents: mappedContents,
      }),
      this.updateLocalContentStateCache(request),
    ];

    // Assessments are already fully assembled here (accumulated by useContentStateUpdate).
    // Enqueue them directly as a COURSE_ASSESMENT entry so NetworkQueueProcessor drains them.
    if (request.assessments?.length) {
      ops.push(
        networkQueueDbService.insert({
          type:       NetworkQueueType.COURSE_ASSESMENT,
          priority:   1,
          timestamp:  Date.now(),
          data:       JSON.stringify({
            request: {
              userId:      request.userId,
              contents:    mappedContents,
              assessments: request.assessments,
            },
          }),
          item_count: request.assessments.length,
        })
      );
    }

    await Promise.all(ops);
    await this.updateLocalCourseProgress(request);
  }

  /**
   * Merge the request into the cached contentList for this user+course
   * so that offline reads reflect the latest progress immediately.
   */
  private async updateLocalContentStateCache(request: ContentStateUpdateRequest): Promise<void> {
    try {
      const key = `cache:content_state_${request.userId}_${request.courseId}`;
      const raw = await keyValueDbService.getRaw(key);
      const cached: ContentStateReadResponse = raw
        ? JSON.parse(raw)
        : { contentList: [] };

      const contentList: ContentStateItem[] = cached.contentList ?? [];

      for (const update of request.contents) {
        const idx = contentList.findIndex(c => c.contentId === update.contentId);
        if (idx >= 0) {
          contentList[idx] = { ...contentList[idx], status: update.status };
        } else {
          contentList.push({ contentId: update.contentId, status: update.status });
        }
      }

      await keyValueDbService.setRaw(key, JSON.stringify({ contentList }));
    } catch (err) {
      console.warn('[BatchService] Failed to update local content state cache:', err);
    }
  }

  /**
   * Recompute and persist course completion percentage in enrolled_courses
   * whenever at least one content item reaches status=2 (completed).
   */
  private async updateLocalCourseProgress(request: ContentStateUpdateRequest): Promise<void> {
    try {
      const hasCompletion = request.contents.some(c => c.status === 2);
      if (!hasCompletion) return;

      const courses = await enrolledCoursesDbService.getByUser(request.userId);
      const course = courses.find(c => c.course_id === request.courseId);
      if (!course) return;

      const leafNodesCount = course.details.leafNodesCount ?? 0;
      if (leafNodesCount === 0) return;

      // Read the freshly-updated content state cache to count completed items
      const key = `cache:content_state_${request.userId}_${request.courseId}`;
      const raw = await keyValueDbService.getRaw(key);
      const cached: ContentStateReadResponse = raw ? JSON.parse(raw) : { contentList: [] };
      const completedCount = (cached.contentList ?? []).filter(c => c.status === 2).length;

      const newProgress = Math.min(100, Math.floor((completedCount / leafNodesCount) * 100));
      const newStatus = newProgress >= 100 ? 'completed' : 'active';

      await enrolledCoursesDbService.updateProgress(
        request.courseId,
        request.userId,
        newProgress,
        newStatus,
      );
    } catch (err) {
      console.warn('[BatchService] Failed to update local course progress:', err);
    }
  }

  public forceSyncActivityAgg(params: {
    userId: string;
    courseId: string;
    batchId: string;
  }): Promise<ApiResponse<unknown>> {
    return getClient().post('/user/v1/activity/agg', {
      request: {
        userId: params.userId,
        courseId: params.courseId,
        batchId: params.batchId,
      },
    });
  }
}
