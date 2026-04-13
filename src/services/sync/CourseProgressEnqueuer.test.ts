import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseProgressEnqueuer } from './CourseProgressEnqueuer';
import { networkQueueDbService } from '../db/NetworkQueueDbService';
import { enrolledCoursesDbService } from '../db/EnrolledCoursesDbService';
import { keyValueDbService } from '../db/KeyValueDbService';
import { NetworkQueueType } from './types';

vi.mock('../db/NetworkQueueDbService', () => ({
  networkQueueDbService: {
    insert: vi.fn().mockResolvedValue('msg-uuid'),
  },
}));

vi.mock('../db/EnrolledCoursesDbService', () => ({
  enrolledCoursesDbService: {
    updateProgress: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../db/KeyValueDbService', () => ({
  keyValueDbService: {
    getRaw: vi.fn().mockResolvedValue(null),
    setRaw: vi.fn().mockResolvedValue(undefined),
  },
}));

const BASE_REQUEST = {
  userId: 'user-1',
  contents: [{
    contentId: 'content-1',
    courseId: 'course-1',
    batchId: 'batch-1',
    status: 1 as 0 | 1 | 2,
    progress: 50,
  }],
};

describe('CourseProgressEnqueuer', () => {
  let enqueuer: CourseProgressEnqueuer;

  beforeEach(() => {
    vi.clearAllMocks();
    enqueuer = new CourseProgressEnqueuer();
    vi.mocked(networkQueueDbService.insert).mockResolvedValue('msg-uuid');
    vi.mocked(enrolledCoursesDbService.updateProgress).mockResolvedValue(undefined);
    vi.mocked(keyValueDbService.getRaw).mockResolvedValue(null);
    vi.mocked(keyValueDbService.setRaw).mockResolvedValue(undefined);
  });

  it('inserts one COURSE_PROGRESS row into network_queue', async () => {
    await enqueuer.enqueue(BASE_REQUEST);

    expect(networkQueueDbService.insert).toHaveBeenCalledOnce();
    const arg = vi.mocked(networkQueueDbService.insert).mock.calls[0][0];
    expect(arg.type).toBe(NetworkQueueType.COURSE_PROGRESS);
    expect(arg.priority).toBe(1);
    expect(arg.item_count).toBe(1);
  });

  it('updates enrolled_courses progress with correct status string', async () => {
    await enqueuer.enqueue(BASE_REQUEST); // progress=50

    expect(enrolledCoursesDbService.updateProgress).toHaveBeenCalledWith(
      'course-1', 'user-1', 50, 'active',
    );
  });

  it('maps status 1 with progress 0 → "not-started" in enrolled_courses', async () => {
    await enqueuer.enqueue({
      ...BASE_REQUEST,
      contents: [{ ...BASE_REQUEST.contents[0], status: 1, progress: 0 }],
    });

    expect(enrolledCoursesDbService.updateProgress).toHaveBeenCalledWith(
      'course-1', 'user-1', 0, 'not-started',
    );
  });

  it('maps status 0 → "not-started" in enrolled_courses', async () => {
    await enqueuer.enqueue({
      ...BASE_REQUEST,
      contents: [{ ...BASE_REQUEST.contents[0], status: 0, progress: 0 }],
    });

    expect(enrolledCoursesDbService.updateProgress).toHaveBeenCalledWith(
      'course-1', 'user-1', 0, 'not-started',
    );
  });

  it('maps status 2 → "completed" in enrolled_courses', async () => {
    await enqueuer.enqueue({
      ...BASE_REQUEST,
      contents: [{ ...BASE_REQUEST.contents[0], status: 2, progress: 100 }],
    });

    expect(enrolledCoursesDbService.updateProgress).toHaveBeenCalledWith(
      'course-1', 'user-1', 100, 'completed',
    );
  });


  it('still inserts into network_queue even when enrolled_courses update fails', async () => {
    vi.mocked(enrolledCoursesDbService.updateProgress).mockRejectedValue(new Error('DB locked'));

    await expect(enqueuer.enqueue(BASE_REQUEST)).resolves.toBeUndefined();
    expect(networkQueueDbService.insert).toHaveBeenCalledOnce();
  });


  it('processes multiple content items in one request', async () => {
    const request = {
      userId: 'user-1',
      contents: [
        { contentId: 'c1', courseId: 'course-1', batchId: 'batch-1', status: 1 as 0 | 1 | 2, progress: 30 },
        { contentId: 'c2', courseId: 'course-1', batchId: 'batch-1', status: 2 as 0 | 1 | 2, progress: 100 },
      ],
    };

    await enqueuer.enqueue(request);

    expect(enrolledCoursesDbService.updateProgress).toHaveBeenCalledTimes(2);
    const arg = vi.mocked(networkQueueDbService.insert).mock.calls[0][0];
    expect(arg.item_count).toBe(2);
  });
});
