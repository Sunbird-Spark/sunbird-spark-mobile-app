import { enrolledCoursesDbService } from '../db/EnrolledCoursesDbService';
import { networkQueueDbService } from '../db/NetworkQueueDbService';
import { keyValueDbService } from '../db/KeyValueDbService';
import type { ContentStateReadResponse } from '../../types/collectionTypes';
import { NetworkQueueType, UpdateContentStateRequest } from './types';

export class CourseProgressEnqueuer {
  /**
   * Enqueue a course progress update to network_queue and immediately update
   * the local enrolled_courses cache so the UI reflects progress instantly.
   */
  async enqueue(request: UpdateContentStateRequest): Promise<void> {
    await networkQueueDbService.insert({
      type:       NetworkQueueType.COURSE_PROGRESS,
      priority:   1,
      timestamp:  Date.now(),
      data:       JSON.stringify({ request }),
      item_count: request.contents.length,
    });

    // Update local caches immediately — do not wait for sync
    for (const content of request.contents) {
      const { courseId, batchId, contentId } = content;
      const userId   = request.userId;
      const progress = content.progress ?? 0;
      const status   = content.status ?? 0;

      // 1. Update enrolled_courses.progress (drives offline enrollment list)
      try {
        const courseStatus = status === 2 ? 'completed' : 'active';
        await enrolledCoursesDbService.updateProgress(courseId, userId, progress, courseStatus as any);
      } catch {
        // best-effort
      }

      // 2. Update cache:content_state_* (drives getLocalCompletionPercentage enrichment)
      const cacheKey = `cache:content_state_${userId}_${courseId}_${batchId}`;
      try {
        const raw    = await keyValueDbService.getRaw(cacheKey);
        const cached = raw ? (JSON.parse(raw) as ContentStateReadResponse) : { contentList: [] };
        const list   = [...(cached.contentList ?? [])];
        const idx    = list.findIndex(i => i.contentId === contentId);
        const patch  = { contentId, status, progress };
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...patch };
        } else {
          list.push(patch as any);
        }
        await keyValueDbService.setRaw(cacheKey, JSON.stringify({ ...cached, contentList: list }));
      } catch {
        // best-effort — enrichment falls back to server value if this fails
      }
    }
  }
}

export const courseProgressEnqueuer = new CourseProgressEnqueuer();
