import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseAssessmentEnqueuer } from './CourseAssessmentEnqueuer';
import { courseAssessmentDbService } from '../db/CourseAssessmentDbService';

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
