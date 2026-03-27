import { databaseService } from './DatabaseService';
import { CourseContext } from '../sync/types';

export interface AssessmentRow {
  _id:              number;
  assessment_event: string;
  content_id:       string;
  created_at:       number;
  uid:              string;
  course_id:        string;
  batch_id:         string;
  attempt_id:       string;
}

export interface AssessmentGroup {
  uid:        string;
  content_id: string;
  course_id:  string;
  batch_id:   string;
  first_ts:   number;
  attempt_id: string;
  events:     any[];
  ids:        number[];
}

export class CourseAssessmentDbService {
  async insert(event: any, context: CourseContext, attemptId: string): Promise<void> {
    await databaseService.insert('course_assessment', {
      assessment_event: JSON.stringify(event),
      content_id:       event?.object?.id ?? '',
      created_at:       typeof event?.ets === 'number' ? event.ets : Date.now(),
      uid:              context.userId,
      course_id:        context.courseId,
      batch_id:         context.batchId,
      attempt_id:       attemptId,
    });
  }

  /** Return all rows grouped by (uid, content_id, course_id, batch_id) for aggregation. */
  async getGroupedForSync(): Promise<AssessmentGroup[]> {
    const db = databaseService.getDb();
    const result = await db.query(
      `SELECT _id, assessment_event, content_id, created_at, uid, course_id, batch_id, attempt_id
       FROM course_assessment
       ORDER BY uid, course_id, batch_id, content_id, created_at ASC`,
      []
    );
    const rows: AssessmentRow[] = (result.values ?? []) as AssessmentRow[];

    const groupMap = new Map<string, AssessmentGroup>();
    for (const row of rows) {
      const key = `${row.uid}||${row.course_id}||${row.batch_id}||${row.content_id}||${row.attempt_id}`;
      let group = groupMap.get(key);
      if (!group) {
        group = {
          uid:        row.uid,
          content_id: row.content_id,
          course_id:  row.course_id,
          batch_id:   row.batch_id,
          first_ts:   row.created_at,
          // Use the attempt_id from the first (earliest) row in the group — stable
          // across crash-recovery re-runs as long as staging rows survive.
          attempt_id: row.attempt_id,
          events:     [],
          ids:        [],
        };
        groupMap.set(key, group);
      }
      try {
        group.events.push(JSON.parse(row.assessment_event));
      } catch {
        // skip malformed events
      }
      group.ids.push(row._id);
    }

    return Array.from(groupMap.values());
  }

  /**
   * Return the attempt_id from the most-recently inserted row for this content context,
   * or null if no staged rows exist.
   * Used by resolveAttemptId to detect a mid-quiz crash and reuse the same attempt_id.
   */
  async getLatestAttemptId(uid: string, courseId: string, batchId: string, contentId: string): Promise<string | null> {
    const db = databaseService.getDb();
    const result = await db.query(
      `SELECT attempt_id FROM course_assessment
       WHERE uid = ? AND course_id = ? AND batch_id = ? AND content_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [uid, courseId, batchId, contentId]
    );
    const rows = (result.values ?? []) as Array<{ attempt_id: string }>;
    return rows.length > 0 ? rows[0].attempt_id : null;
  }

  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const db = databaseService.getDb();
    const placeholders = ids.map(() => '?').join(', ');
    await db.run(`DELETE FROM course_assessment WHERE _id IN (${placeholders})`, ids);
  }

  async getCount(): Promise<number> {
    return databaseService.count('course_assessment');
  }
}

export const courseAssessmentDbService = new CourseAssessmentDbService();
