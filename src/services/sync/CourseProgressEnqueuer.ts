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
      type: NetworkQueueType.COURSE_PROGRESS,
      priority: 1,
      timestamp: Date.now(),
      data: JSON.stringify({ request }),
      item_count: request.contents.length,
    });

    // Update local caches immediately — do not wait for sync
    for (const content of request.contents) {
      const { courseId, batchId, contentId } = content;
      const userId = request.userId;
      const progress = content.progress;
      const status = content.status ?? 0;

      // 1. Update enrolled_courses.progress (drives offline enrollment list)
      // Only update when progress is explicitly provided — defaulting to 0 would
      // visually reset the progress bar for in-progress (status=1) updates.
      if (progress !== undefined) {
        try {
          const courseStatus = status === 2 ? 'completed' : status === 1 && (progress ?? 0) < 100 ? 'active' : 'not-started';
          await enrolledCoursesDbService.updateProgress(courseId, userId, progress, courseStatus as any);
        } catch {
          // best-effort
        }
      }

    }
  }
}

export const courseProgressEnqueuer = new CourseProgressEnqueuer();
