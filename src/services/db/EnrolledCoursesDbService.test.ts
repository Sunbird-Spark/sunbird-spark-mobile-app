import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrolledCoursesDbService, type EnrolledCourse } from './EnrolledCoursesDbService';
import { DatabaseService } from './DatabaseService';

vi.mock('./DatabaseService', () => ({ DatabaseService: vi.fn(), databaseService: {} }));

function makeMockDb() {
  return {
    select: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    transaction: vi.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
  } as unknown as DatabaseService;
}

const makeCourse = (overrides: Partial<EnrolledCourse> = {}): EnrolledCourse => ({
  course_id: 'course-1',
  user_id: 'user-1',
  details: { courseId: 'course-1', name: 'Intro to React', appIcon: 'icon.png' },
  enrolled_on: 1000,
  progress: 0,
  status: 'active',
  ...overrides,
});

describe('EnrolledCoursesDbService', () => {
  let db: DatabaseService;
  let svc: EnrolledCoursesDbService;

  beforeEach(() => {
    db = makeMockDb();
    svc = new EnrolledCoursesDbService(db);
  });

  // ── upsertBatch ────────────────────────────────────────────────────────────

  describe('upsertBatch', () => {
    it('is a no-op for empty array', async () => {
      await svc.upsertBatch([]);
      expect(db.insert).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('wraps inserts in a transaction', async () => {
      await svc.upsertBatch([makeCourse()]);
      expect(db.transaction).toHaveBeenCalledOnce();
    });

    it('inserts each course with REPLACE', async () => {
      const c1 = makeCourse({ course_id: 'c1' });
      const c2 = makeCourse({ course_id: 'c2', status: 'completed', progress: 100 });
      await svc.upsertBatch([c1, c2]);
      expect(db.insert).toHaveBeenCalledTimes(2);
    });

    it('serialises details as JSON', async () => {
      const course = makeCourse();
      await svc.upsertBatch([course]);
      const [table, data, conflict] = vi.mocked(db.insert).mock.calls[0];
      expect(table).toBe('enrolled_courses');
      expect(data.details).toBe(JSON.stringify(course.details));
      expect(conflict).toBe('REPLACE');
    });

    it('passes all course fields correctly', async () => {
      const course = makeCourse({ progress: 50, status: 'active' });
      await svc.upsertBatch([course]);
      const [, data] = vi.mocked(db.insert).mock.calls[0];
      expect(data.course_id).toBe('course-1');
      expect(data.user_id).toBe('user-1');
      expect(data.enrolled_on).toBe(1000);
      expect(data.progress).toBe(50);
      expect(data.status).toBe('active');
    });
  });

  // ── getByUser ──────────────────────────────────────────────────────────────

  describe('getByUser', () => {
    it('queries with correct WHERE and ORDER BY', async () => {
      await svc.getByUser('user-1');
      expect(db.select).toHaveBeenCalledWith('enrolled_courses', {
        where: { eq: { user_id: 'user-1' } },
        orderBy: [{ column: 'enrolled_on', direction: 'DESC' }],
      });
    });

    it('maps rows to EnrolledCourse objects', async () => {
      const course = makeCourse();
      vi.mocked(db.select).mockResolvedValue([
        {
          course_id: course.course_id,
          user_id: course.user_id,
          details: JSON.stringify(course.details),
          enrolled_on: course.enrolled_on,
          progress: course.progress,
          status: course.status,
        },
      ]);
      const result = await svc.getByUser('user-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(course);
    });

    it('returns empty array when no courses', async () => {
      vi.mocked(db.select).mockResolvedValue([]);
      expect(await svc.getByUser('user-1')).toEqual([]);
    });

    it('uses fallback details when JSON is invalid', async () => {
      vi.mocked(db.select).mockResolvedValue([
        { course_id: 'c1', user_id: 'u1', details: 'bad', enrolled_on: 0, progress: 0, status: 'active' },
      ]);
      const result = await svc.getByUser('u1');
      expect(result[0].details).toEqual({ courseId: 'c1', name: '' });
    });
  });

  // ── getByStatus ────────────────────────────────────────────────────────────

  describe('getByStatus', () => {
    it('queries with user_id AND status in WHERE', async () => {
      await svc.getByStatus('user-1', 'completed');
      expect(db.select).toHaveBeenCalledWith('enrolled_courses', {
        where: { eq: { user_id: 'user-1', status: 'completed' } },
        orderBy: [{ column: 'enrolled_on', direction: 'DESC' }],
      });
    });

    it('maps rows correctly', async () => {
      const course = makeCourse({ status: 'completed', progress: 100 });
      vi.mocked(db.select).mockResolvedValue([
        { ...course, details: JSON.stringify(course.details) },
      ]);
      const result = await svc.getByStatus('user-1', 'completed');
      expect(result[0].status).toBe('completed');
      expect(result[0].progress).toBe(100);
    });
  });

  // ── updateProgress ─────────────────────────────────────────────────────────

  describe('updateProgress', () => {
    it('updates progress and status with compound WHERE', async () => {
      await svc.updateProgress('course-1', 'user-1', 75, 'active');
      expect(db.update).toHaveBeenCalledWith(
        'enrolled_courses',
        { progress: 75, status: 'active' },
        { eq: { course_id: 'course-1', user_id: 'user-1' } }
      );
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes by compound primary key', async () => {
      await svc.delete('course-1', 'user-1');
      expect(db.delete).toHaveBeenCalledWith('enrolled_courses', {
        eq: { course_id: 'course-1', user_id: 'user-1' },
      });
    });
  });

  // ── deleteAllForUser ───────────────────────────────────────────────────────

  describe('deleteAllForUser', () => {
    it('deletes all courses for a user', async () => {
      await svc.deleteAllForUser('user-1');
      expect(db.delete).toHaveBeenCalledWith('enrolled_courses', {
        eq: { user_id: 'user-1' },
      });
    });
  });
});
