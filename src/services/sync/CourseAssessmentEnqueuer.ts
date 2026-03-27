import { v4 as uuidv4 } from 'uuid';
import { courseAssessmentDbService } from '../db/CourseAssessmentDbService';
import { networkQueueDbService } from '../db/NetworkQueueDbService';
import { AssessmentSyncRequest, ContentState, CourseContext, NetworkQueueType } from './types';

export class CourseAssessmentEnqueuer {
  /**
   * Return the attempt_id to use for the current play session.
   *
   * If staged rows already exist for this content (app was killed mid-quiz),
   * the most-recent row's attempt_id is reused so pre-crash and post-crash
   * ASSESS events are grouped into the same sync request.
   *
   * If no rows exist (fresh attempt), a new UUID is returned.
   */
  async resolveAttemptId(uid: string, courseId: string, batchId: string, contentId: string): Promise<string> {
    const existing = await courseAssessmentDbService.getLatestAttemptId(uid, courseId, batchId, contentId);
    return existing ?? uuidv4();
  }

  /**
   * Phase 1 — Capture: persist a raw ASSESS event to the staging table.
   * Called immediately when a player emits an ASSESS event.
   * Crash-safe: the row (including its attempt_id) survives app kill.
   */
  async persistAssessEvent(event: any, context: CourseContext, attemptId: string): Promise<void> {
    await courseAssessmentDbService.insert(event, context, attemptId);
  }

  /**
   * Phase 2 — Aggregate & Enqueue: group staged events by content, build the
   * backend request, insert into network_queue, then clear the staging rows.
   * Called at sync time.
   *
   * @returns number of assessment groups enqueued (0 = nothing staged)
   */
  async aggregateAndEnqueue(userId: string): Promise<number> {
    const groups = await courseAssessmentDbService.getGroupedForSync();
    if (groups.length === 0) return 0;

    const assessments: AssessmentSyncRequest['assessments'] = groups.map(g => ({
      assessmentTs: g.first_ts,
      userId:       g.uid,
      contentId:    g.content_id,
      courseId:     g.course_id,
      batchId:      g.batch_id,
      // Use the attempt_id from the first (earliest) row in the group.
      // This is stable across crash-recovery re-runs — no new UUID generated here.
      attemptId:    g.attempt_id,
      events:       g.events,
    }));

    // Build contents: one entry per content group, all status=2 (completed).
    // Deduplicated by contentId — assessment sync only fires on content completion.
    const contentMap = new Map<string, ContentState>();
    for (const g of groups) {
      if (!contentMap.has(g.content_id)) {
        contentMap.set(g.content_id, {
          contentId: g.content_id,
          courseId:  g.course_id,
          batchId:   g.batch_id,
          status:    2,
        });
      }
    }

    const request: AssessmentSyncRequest = {
      userId,
      contents:    Array.from(contentMap.values()),
      assessments,
    };

    await networkQueueDbService.insert({
      type:       NetworkQueueType.COURSE_ASSESMENT,
      priority:   1,
      timestamp:  Date.now(),
      data:       JSON.stringify({ request }),
      item_count: assessments.length,
    });

    // Clear all staged rows now that they're durably in network_queue
    const allIds = groups.flatMap(g => g.ids);
    await courseAssessmentDbService.deleteByIds(allIds);

    return assessments.length;
  }

  async hasPendingEvents(): Promise<boolean> {
    const count = await courseAssessmentDbService.getCount();
    return count > 0;
  }
}

export const courseAssessmentEnqueuer = new CourseAssessmentEnqueuer();
