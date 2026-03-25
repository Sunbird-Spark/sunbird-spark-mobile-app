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
}

export interface AssessmentGroup {
  uid:        string;
  content_id: string;
  course_id:  string;
  batch_id:   string;
  first_ts:   number;
  events:     any[];
  ids:        number[];
}

export class CourseAssessmentDbService {
  async insert(event: any, context: CourseContext): Promise<void> {
    await databaseService.insert('course_assessment', {
      assessment_event: JSON.stringify(event),
      content_id:       event?.object?.id ?? '',
      created_at:       typeof event?.ets === 'number' ? event.ets : Date.now(),
      uid:              context.userId,
      course_id:        context.courseId,
      batch_id:         context.batchId,
    });
  }

  /** Return all rows grouped by (uid, content_id, course_id, batch_id) for aggregation. */
  async getGroupedForSync(): Promise<AssessmentGroup[]> {
    const db = databaseService.getDb();
    // Fetch all rows ordered by context then time
    const result = await db.query(
      `SELECT _id, assessment_event, content_id, created_at, uid, course_id, batch_id
       FROM course_assessment
       ORDER BY uid, course_id, batch_id, content_id, created_at ASC`,
      []
    );
    const rows: AssessmentRow[] = (result.values ?? []) as AssessmentRow[];

    const groupMap = new Map<string, AssessmentGroup>();
    for (const row of rows) {
      const key = `${row.uid}||${row.course_id}||${row.batch_id}||${row.content_id}`;
      let group = groupMap.get(key);
      if (!group) {
        group = {
          uid:        row.uid,
          content_id: row.content_id,
          course_id:  row.course_id,
          batch_id:   row.batch_id,
          first_ts:   row.created_at,
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
