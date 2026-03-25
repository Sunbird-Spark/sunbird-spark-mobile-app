import { v4 as uuidv4 } from 'uuid';
import { courseAssessmentDbService } from '../db/CourseAssessmentDbService';
import { networkQueueDbService } from '../db/NetworkQueueDbService';
import { AssessmentSyncRequest, CourseContext, NetworkQueueType } from './types';

export class CourseAssessmentEnqueuer {
  /**
   * Phase 1 — Capture: persist a raw ASSESS event to the staging table.
   * Called immediately when a player emits an ASSESS event.
   * Crash-safe: the row survives app kill.
   */
  async persistAssessEvent(event: any, context: CourseContext): Promise<void> {
    await courseAssessmentDbService.insert(event, context);
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
      attemptId:    uuidv4(),
      events:       g.events,
    }));

    const request: AssessmentSyncRequest = {
      userId,
      contents:    [],
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
