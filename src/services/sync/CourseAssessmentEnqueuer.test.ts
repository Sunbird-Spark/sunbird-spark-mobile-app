import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseAssessmentEnqueuer } from './CourseAssessmentEnqueuer';
import { courseAssessmentDbService } from '../db/CourseAssessmentDbService';
import { networkQueueDbService } from '../db/NetworkQueueDbService';

vi.mock('../db/CourseAssessmentDbService', () => ({
  courseAssessmentDbService: {
    insert:            vi.fn().mockResolvedValue(undefined),
    getGroupedForSync: vi.fn().mockResolvedValue([]),
    deleteByIds:       vi.fn().mockResolvedValue(undefined),
    getCount:          vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('../db/NetworkQueueDbService', () => ({
  networkQueueDbService: {
    insert: vi.fn().mockResolvedValue(undefined),
  },
}));

const CONTEXT = { userId: 'user-1', courseId: 'course-1', batchId: 'batch-1' };
const EVENT   = { eid: 'ASSESS', object: { id: 'content-1' }, ets: Date.now() };

describe('CourseAssessmentEnqueuer — attempt_id per play session', () => {
  let enqueuer: CourseAssessmentEnqueuer;

  beforeEach(() => {
    vi.clearAllMocks();
    enqueuer = new CourseAssessmentEnqueuer();
  });

  it('persists ASSESS event with the supplied attempt_id', async () => {
    await enqueuer.persistAssessEvent(EVENT, CONTEXT, 'attempt-abc');

    expect(courseAssessmentDbService.insert).toHaveBeenCalledWith(
      EVENT, CONTEXT, 'attempt-abc'
    );
  });

  it('two ASSESS events in the same play session share one attempt_id', async () => {
    const attemptId = 'uuid-from-start';

    await enqueuer.persistAssessEvent({ ...EVENT, mid: 'Q1' }, CONTEXT, attemptId);
    await enqueuer.persistAssessEvent({ ...EVENT, mid: 'Q2' }, CONTEXT, attemptId);

    const calls = vi.mocked(courseAssessmentDbService.insert).mock.calls;
    expect(calls[0][2]).toBe(attemptId);
    expect(calls[1][2]).toBe(attemptId);
  });

  it('close-and-reopen uses a different attempt_id (no reuse across sessions)', async () => {
    const session1Id = 'uuid-session-1';
    const session2Id = 'uuid-session-2'; // new UUID generated on next START

    await enqueuer.persistAssessEvent(EVENT, CONTEXT, session1Id);
    await enqueuer.persistAssessEvent(EVENT, CONTEXT, session2Id);

    const calls = vi.mocked(courseAssessmentDbService.insert).mock.calls;
    expect(calls[0][2]).not.toBe(calls[1][2]);
  });
});

// ── Helper ────────────────────────────────────────────────────────────────────

function makeGroup(overrides: Partial<{
  first_ts: number; events: any[]; ids: number[];
}> = {}) {
  return {
    uid:        'user-1',
    course_id:  'course-1',
    batch_id:   'batch-1',
    content_id: 'content-1',
    attempt_id: 'attempt-1',
    first_ts:   100,
    events:     [{ eid: 'ASSESS' }],
    ids:        [1],
    ...overrides,
  };
}

// ── aggregateAndEnqueue logical decisions ─────────────────────────────────────

describe('CourseAssessmentEnqueuer — aggregateAndEnqueue', () => {
  let enqueuer: CourseAssessmentEnqueuer;

  beforeEach(() => {
    vi.clearAllMocks();
    enqueuer = new CourseAssessmentEnqueuer();
    vi.mocked(networkQueueDbService.insert).mockResolvedValue('msg-uuid');
    vi.mocked(courseAssessmentDbService.deleteByIds).mockResolvedValue(undefined);
  });

  // ── assessmentTs accuracy ─────────────────────────────────────────────────

  it('assessmentTs — uses earliest created_at (first_ts=100) when rows exist at ts 100, 200, 300', async () => {
    vi.mocked(courseAssessmentDbService.getGroupedForSync).mockResolvedValue([
      makeGroup({ first_ts: 100, events: [{ eid: 'ASSESS' }, { eid: 'ASSESS' }, { eid: 'ASSESS' }], ids: [1, 2, 3] }),
    ]);

    await enqueuer.aggregateAndEnqueue('user-1');

    const insertArg = vi.mocked(networkQueueDbService.insert).mock.calls[0][0];
    const request = JSON.parse(insertArg.data).request;
    expect(request.assessments[0].assessmentTs).toBe(100);
  });

  // ── Malformed event JSON skipped ──────────────────────────────────────────

  it('malformed JSON — corrupt row skipped by DB layer; group still enqueued with remaining events', async () => {
    // DB service skips the malformed row at parse time; group arrives with 2 events (not 3)
    vi.mocked(courseAssessmentDbService.getGroupedForSync).mockResolvedValue([
      makeGroup({
        events: [{ eid: 'ASSESS', mid: 'Q1' }, { eid: 'ASSESS', mid: 'Q3' }], // Q2 was malformed
        ids:    [1, 2, 3],
      }),
    ]);

    const count = await enqueuer.aggregateAndEnqueue('user-1');

    expect(count).toBe(1); // group still enqueued
    const insertArg = vi.mocked(networkQueueDbService.insert).mock.calls[0][0];
    const request = JSON.parse(insertArg.data).request;
    expect(request.assessments[0].events).toHaveLength(2);
    // All 3 staging rows deleted (including the corrupt one)
    expect(courseAssessmentDbService.deleteByIds).toHaveBeenCalledWith([1, 2, 3]);
  });

  // ── Re-aggregation safety ─────────────────────────────────────────────────

  it('re-aggregation safety — second call returns 0 when staging table already cleared', async () => {
    vi.mocked(courseAssessmentDbService.getGroupedForSync)
      .mockResolvedValueOnce([makeGroup()]) // first call: rows present
      .mockResolvedValueOnce([]);           // second call: staging cleared by first

    const first  = await enqueuer.aggregateAndEnqueue('user-1');
    const second = await enqueuer.aggregateAndEnqueue('user-1');

    expect(first).toBe(1);
    expect(second).toBe(0);
    expect(networkQueueDbService.insert).toHaveBeenCalledOnce(); // only first call inserts
  });
});
