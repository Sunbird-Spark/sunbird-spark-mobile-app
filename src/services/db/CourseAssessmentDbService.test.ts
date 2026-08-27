import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CourseAssessmentDbService, type AssessmentRow } from './CourseAssessmentDbService';
import { databaseService } from './DatabaseService';
import type { CourseContext } from '../sync/types';

const mockDb = {
  query: vi.fn(),
  run: vi.fn(),
};

vi.mock('./DatabaseService', () => ({
  DatabaseService: vi.fn(),
  databaseService: {
    insert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    getDb: vi.fn(),
  },
}));

const context: CourseContext = {
  userId: 'user-1',
  courseId: 'course-1',
  batchId: 'batch-1',
};

const makeRow = (overrides: Partial<AssessmentRow> = {}): AssessmentRow => ({
  _id: 1,
  assessment_event: '{"eid":"ASSESS"}',
  content_id: 'content-1',
  created_at: 1000,
  uid: 'user-1',
  course_id: 'course-1',
  batch_id: 'batch-1',
  attempt_id: 'attempt-1',
  ...overrides,
});

describe('CourseAssessmentDbService', () => {
  let svc: CourseAssessmentDbService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.query.mockResolvedValue({ values: [] });
    mockDb.run.mockResolvedValue({ changes: { changes: 0 } });
    vi.mocked(databaseService.getDb).mockReturnValue(mockDb as never);
    vi.mocked(databaseService.insert).mockResolvedValue(undefined);
    vi.mocked(databaseService.delete).mockResolvedValue(undefined);
    vi.mocked(databaseService.count).mockResolvedValue(0);
    svc = new CourseAssessmentDbService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── insert ─────────────────────────────────────────────────────────────────

  describe('insert', () => {
    it('serialises the event and derives content_id and created_at from it', async () => {
      const event = { eid: 'ASSESS', ets: 555, object: { id: 'content-9' } };
      await svc.insert(event, context, 'attempt-7');

      expect(databaseService.insert).toHaveBeenCalledWith('course_assessment', {
        assessment_event: JSON.stringify(event),
        content_id: 'content-9',
        created_at: 555,
        uid: 'user-1',
        course_id: 'course-1',
        batch_id: 'batch-1',
        attempt_id: 'attempt-7',
      });
    });

    it('falls back to an empty content_id when the event has no object', async () => {
      await svc.insert({ eid: 'ASSESS', ets: 1 }, context, 'a1');
      const [, data] = vi.mocked(databaseService.insert).mock.calls[0];
      expect(data.content_id).toBe('');
    });

    it('falls back to now when ets is missing or not a number', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(42_000));

      await svc.insert({ eid: 'ASSESS' }, context, 'a1');
      await svc.insert({ eid: 'ASSESS', ets: 'not-a-number' }, context, 'a2');

      expect(vi.mocked(databaseService.insert).mock.calls[0][1].created_at).toBe(42_000);
      expect(vi.mocked(databaseService.insert).mock.calls[1][1].created_at).toBe(42_000);
    });

    it('propagates database errors', async () => {
      vi.mocked(databaseService.insert).mockRejectedValue(new Error('constraint'));
      await expect(svc.insert({ ets: 1 }, context, 'a1')).rejects.toThrow('constraint');
    });
  });

  // ── getGroupedForSync ──────────────────────────────────────────────────────

  describe('getGroupedForSync', () => {
    it('queries the staging table ordered for stable grouping', async () => {
      await svc.getGroupedForSync();
      const [sql, params] = mockDb.query.mock.calls[0];
      expect(sql).toContain('FROM course_assessment');
      expect(sql).toContain('ORDER BY uid, course_id, batch_id, content_id, created_at ASC');
      expect(params).toEqual([]);
    });

    it('returns an empty array when there are no rows', async () => {
      mockDb.query.mockResolvedValue({});
      await expect(svc.getGroupedForSync()).resolves.toEqual([]);
    });

    it('groups rows sharing uid/course/batch/content/attempt into one group', async () => {
      mockDb.query.mockResolvedValue({
        values: [
          makeRow({ _id: 1, created_at: 100, assessment_event: '{"n":1}' }),
          makeRow({ _id: 2, created_at: 200, assessment_event: '{"n":2}' }),
        ],
      });

      const groups = await svc.getGroupedForSync();

      expect(groups).toHaveLength(1);
      expect(groups[0]).toMatchObject({
        uid: 'user-1',
        content_id: 'content-1',
        course_id: 'course-1',
        batch_id: 'batch-1',
        attempt_id: 'attempt-1',
        first_ts: 100,
        ids: [1, 2],
      });
      expect(groups[0].events).toEqual([{ n: 1 }, { n: 2 }]);
    });

    it('keeps a different attempt_id in a separate group', async () => {
      mockDb.query.mockResolvedValue({
        values: [
          makeRow({ _id: 1, attempt_id: 'attempt-1' }),
          makeRow({ _id: 2, attempt_id: 'attempt-2' }),
        ],
      });

      const groups = await svc.getGroupedForSync();
      expect(groups).toHaveLength(2);
      expect(groups.map((g) => g.attempt_id)).toEqual(['attempt-1', 'attempt-2']);
    });

    it('splits groups by uid, course_id, batch_id and content_id', async () => {
      mockDb.query.mockResolvedValue({
        values: [
          makeRow({ _id: 1 }),
          makeRow({ _id: 2, uid: 'user-2' }),
          makeRow({ _id: 3, course_id: 'course-2' }),
          makeRow({ _id: 4, batch_id: 'batch-2' }),
          makeRow({ _id: 5, content_id: 'content-2' }),
        ],
      });
      await expect(svc.getGroupedForSync()).resolves.toHaveLength(5);
    });

    it('uses the earliest row for first_ts and attempt_id', async () => {
      mockDb.query.mockResolvedValue({
        values: [
          makeRow({ _id: 1, created_at: 10 }),
          makeRow({ _id: 2, created_at: 999 }),
        ],
      });
      const [group] = await svc.getGroupedForSync();
      expect(group.first_ts).toBe(10);
    });

    it('skips malformed JSON events but still tracks their row ids', async () => {
      mockDb.query.mockResolvedValue({
        values: [
          makeRow({ _id: 1, assessment_event: 'not json' }),
          makeRow({ _id: 2, assessment_event: '{"ok":true}' }),
        ],
      });

      const [group] = await svc.getGroupedForSync();
      expect(group.events).toEqual([{ ok: true }]);
      expect(group.ids).toEqual([1, 2]);
    });
  });

  // ── deleteByIds ────────────────────────────────────────────────────────────

  describe('deleteByIds', () => {
    it('is a no-op for an empty id list', async () => {
      await svc.deleteByIds([]);
      expect(databaseService.getDb).not.toHaveBeenCalled();
      expect(mockDb.run).not.toHaveBeenCalled();
    });

    it('builds one placeholder per id and passes the ids as params', async () => {
      await svc.deleteByIds([1, 2, 3]);
      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM course_assessment WHERE _id IN (?, ?, ?)',
        [1, 2, 3]
      );
    });

    it('propagates driver errors', async () => {
      mockDb.run.mockRejectedValue(new Error('db locked'));
      await expect(svc.deleteByIds([1])).rejects.toThrow('db locked');
    });
  });

  // ── counts / clear ─────────────────────────────────────────────────────────

  describe('getCount', () => {
    it('counts every staging row', async () => {
      vi.mocked(databaseService.count).mockResolvedValue(12);
      await expect(svc.getCount()).resolves.toBe(12);
      expect(databaseService.count).toHaveBeenCalledWith('course_assessment');
    });
  });

  describe('clearAllForUser', () => {
    it('deletes only the given user rows', async () => {
      await svc.clearAllForUser('user-1');
      expect(databaseService.delete).toHaveBeenCalledWith('course_assessment', {
        eq: { uid: 'user-1' },
      });
    });
  });

  describe('getCountByUser', () => {
    it('counts unsent staging rows for the user', async () => {
      vi.mocked(databaseService.count).mockResolvedValue(3);
      await expect(svc.getCountByUser('user-1')).resolves.toBe(3);
      expect(databaseService.count).toHaveBeenCalledWith('course_assessment', {
        eq: { uid: 'user-1' },
      });
    });
  });
});
