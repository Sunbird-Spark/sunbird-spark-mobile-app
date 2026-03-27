import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseAssessmentEnqueuer } from './CourseAssessmentEnqueuer';
import { courseAssessmentDbService } from '../db/CourseAssessmentDbService';

vi.mock('../db/CourseAssessmentDbService', () => ({
  courseAssessmentDbService: {
    getLatestAttemptId: vi.fn(),
    insert:             vi.fn().mockResolvedValue(undefined),
    getGroupedForSync:  vi.fn().mockResolvedValue([]),
    deleteByIds:        vi.fn().mockResolvedValue(undefined),
    getCount:           vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('../db/NetworkQueueDbService', () => ({
  networkQueueDbService: {
    insert: vi.fn().mockResolvedValue(undefined),
  },
}));

const UID     = 'user-1';
const COURSE  = 'course-1';
const BATCH   = 'batch-1';
const CONTENT = 'content-1';

describe('CourseAssessmentEnqueuer — attempt_id stability', () => {
  let enqueuer: CourseAssessmentEnqueuer;

  beforeEach(() => {
    vi.clearAllMocks();
    enqueuer = new CourseAssessmentEnqueuer();
  });

  it('generates a new UUID when no staged rows exist (fresh attempt)', async () => {
    vi.mocked(courseAssessmentDbService.getLatestAttemptId).mockResolvedValue(null);

    const id = await enqueuer.resolveAttemptId(UID, COURSE, BATCH, CONTENT);

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('reuses attempt_id from DB when staged rows exist (crash recovery)', async () => {
    const crashedId = 'uuid-from-before-crash';
    vi.mocked(courseAssessmentDbService.getLatestAttemptId).mockResolvedValue(crashedId);

    const id = await enqueuer.resolveAttemptId(UID, COURSE, BATCH, CONTENT);

    expect(id).toBe(crashedId);
  });

  it('generates a different UUID on two successive fresh attempts (no pending rows)', async () => {
    vi.mocked(courseAssessmentDbService.getLatestAttemptId).mockResolvedValue(null);

    const first  = await enqueuer.resolveAttemptId(UID, COURSE, BATCH, CONTENT);
    const second = await enqueuer.resolveAttemptId(UID, COURSE, BATCH, CONTENT);

    expect(first).not.toBe(second);
  });
});
