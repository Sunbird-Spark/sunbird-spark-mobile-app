import { enrolledCoursesDbService } from '../db/EnrolledCoursesDbService';
import { networkQueueDbService } from '../db/NetworkQueueDbService';
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

    // Update local cache immediately — do not wait for sync
    for (const content of request.contents) {
      const courseId = content.courseId;
      const userId   = request.userId;
      const progress = content.progress ?? 0;
      // Map numeric status (0|1|2) to CourseStatus string ('active'|'completed')
      const status = content.status === 2 ? 'completed' : 'active';
      try {
        await enrolledCoursesDbService.updateProgress(courseId, userId, progress, status as any);
      } catch {
        // Local cache update is best-effort; enqueue already succeeded
      }
    }
  }
}

export const courseProgressEnqueuer = new CourseProgressEnqueuer();
