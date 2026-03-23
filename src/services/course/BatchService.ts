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
import { enrolledCoursesDbService } from '../db/EnrolledCoursesDbService';
import { networkService } from '../network/networkService';

export const PENDING_CONTENT_STATE_QUEUE_KEY = 'pending_content_state_q';
export const PENDING_ENROL_QUEUE_KEY = 'pending_enrol_q';

export class BatchService {
  public batchList(courseId: string): Promise<ApiResponse<BatchListResponse>> {
    return getClient().post<BatchListResponse>('/course/v1/batch/list', {
      request: { filters: { courseId } },
    });
  }

  public batchRead(batchId: string): Promise<ApiResponse<BatchReadResponse>> {
    return getClient().get<BatchReadResponse>(`/course/v1/batch/read/${batchId}`);
  }

  public async enrol(courseId: string, userId: string, batchId: string): Promise<ApiResponse<unknown>> {
    if (!networkService.isConnected()) {
      await this.queueEnrolLocally(courseId, userId, batchId);
      return buildOfflineResponse({ message: 'Queued for sync' });
    }

    try {
      return await getClient().post('/course/v1/enrol', {
        request: { courseId, userId, batchId },
      });
    } catch {
      await this.queueEnrolLocally(courseId, userId, batchId);
      return buildOfflineResponse({ message: 'Queued for sync' });
    }
  }

  public unenrol(courseId: string, userId: string, batchId: string): Promise<ApiResponse<unknown>> {
    return getClient().post('/course/v1/unenrol', {
      request: { courseId, userId, batchId },
    });
  }

  public async contentStateRead(
    request: ContentStateReadRequest
  ): Promise<ApiResponse<ContentStateReadResponse>> {
    const key = `content_state_${request.userId}_${request.courseId}`;

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

  /** Queue the request and immediately apply it to both local caches. */
  private async queueAndApplyLocally(request: ContentStateUpdateRequest): Promise<void> {
    await Promise.all([
      this.addToPendingQueue(request),
      this.updateLocalContentStateCache(request),
      this.updateLocalCourseProgress(request),
    ]);
  }

  /** Append the request to the persistent pending queue. */
  private async addToPendingQueue(request: ContentStateUpdateRequest): Promise<void> {
    try {
      const raw = await keyValueDbService.getRaw(PENDING_CONTENT_STATE_QUEUE_KEY);
      const queue: Array<ContentStateUpdateRequest & { queuedAt: number }> = raw
        ? JSON.parse(raw)
        : [];
      queue.push({ ...request, queuedAt: Date.now() });
      await keyValueDbService.setRaw(PENDING_CONTENT_STATE_QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn('[BatchService] Failed to enqueue content state update:', err);
    }
  }

  /**
   * Merge the request into the cached contentList for this user+course
   * so that offline reads reflect the latest progress immediately.
   */
  private async updateLocalContentStateCache(request: ContentStateUpdateRequest): Promise<void> {
    try {
      const key = `content_state_${request.userId}_${request.courseId}`;
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
      const key = `content_state_${request.userId}_${request.courseId}`;
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

  // ── Offline enrol helpers ────────────────────────────────────────────────────

  /** Queue the enrol request and insert a stub row so the course appears offline. */
  private async queueEnrolLocally(courseId: string, userId: string, batchId: string): Promise<void> {
    await Promise.all([
      this.addToEnrolQueue(courseId, userId, batchId),
      this.insertStubEnrollment(courseId, userId, batchId),
    ]);
  }

  private async addToEnrolQueue(courseId: string, userId: string, batchId: string): Promise<void> {
    try {
      const raw = await keyValueDbService.getRaw(PENDING_ENROL_QUEUE_KEY);
      const queue: Array<{ courseId: string; userId: string; batchId: string; queuedAt: number }> = raw
        ? JSON.parse(raw)
        : [];
      // Avoid duplicate entries for the same course+user+batch
      const isDuplicate = queue.some(
        item => item.courseId === courseId && item.userId === userId && item.batchId === batchId
      );
      if (!isDuplicate) {
        queue.push({ courseId, userId, batchId, queuedAt: Date.now() });
        await keyValueDbService.setRaw(PENDING_ENROL_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (err) {
      console.warn('[BatchService] Failed to enqueue enrol request:', err);
    }
  }

  private async insertStubEnrollment(courseId: string, userId: string, batchId: string): Promise<void> {
    try {
      await enrolledCoursesDbService.upsertBatch([{
        course_id: courseId,
        user_id: userId,
        details: { courseId, name: '', batchId },
        enrolled_on: Date.now(),
        progress: 0,
        status: 'active',
      }]);
    } catch (err) {
      console.warn('[BatchService] Failed to insert stub enrollment:', err);
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
