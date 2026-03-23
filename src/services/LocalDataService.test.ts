import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ContentStateUpdateRequest } from '../types/collectionTypes';

// ── Hoisted mock variables (must be created before vi.mock factories run) ──────

const mockContentStateUpdate = vi.hoisted(() => vi.fn());
const mockEnrol = vi.hoisted(() => vi.fn());
const mockGetJSON = vi.hoisted(() => vi.fn());
const mockSetJSON = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock('./network/networkService', () => ({
  networkService: { subscribe: vi.fn(), isConnected: vi.fn() },
}));

vi.mock('./db/KeyValueDbService', () => ({
  KVKey: {
    PENDING_CONTENT_STATE_Q: 'pending_content_state_q',
    PENDING_ENROL_Q: 'pending_enrol_q',
  },
  keyValueDbService: {
    getJSON: mockGetJSON,
    setJSON: mockSetJSON,
  },
}));

vi.mock('./course/BatchService', () => ({
  // Must use a regular function (not arrow) so it can be called with `new`
  BatchService: vi.fn().mockImplementation(function (this: any) {
    this.contentStateUpdate = mockContentStateUpdate;
    this.enrol = mockEnrol;
  }),
}));

import { localDataService } from './LocalDataService';
import { networkService } from './network/networkService';
import { keyValueDbService } from './db/KeyValueDbService';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Captures and returns the callback registered via networkService.subscribe */
function getNetworkCallback(): (state: { connected: boolean }) => Promise<void> {
  const calls = vi.mocked(networkService.subscribe).mock.calls;
  if (calls.length === 0) throw new Error('subscribe was not called');
  return calls[calls.length - 1][0] as any;
}

/** Trigger a connected event via the captured callback */
async function triggerConnect() {
  await getNetworkCallback()({ connected: true });
}

/** Trigger a disconnected event */
async function triggerDisconnect() {
  await getNetworkCallback()({ connected: false });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LocalDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetJSON.mockResolvedValue(null);
    mockSetJSON.mockResolvedValue(undefined);
    mockContentStateUpdate.mockResolvedValue({ data: {}, status: 200 });
    mockEnrol.mockResolvedValue({ data: {}, status: 200 });
  });

  describe('init()', () => {
    it('registers a subscriber with networkService', () => {
      localDataService.init();

      expect(networkService.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it('does not flush when network is disconnected', async () => {
      localDataService.init();

      await triggerDisconnect();

      expect(keyValueDbService.getJSON).not.toHaveBeenCalled();
    });

    it('flushes both queues when network reconnects', async () => {
      localDataService.init();
      mockGetJSON
        .mockResolvedValueOnce([{ userId: 'u', courseId: 'c', batchId: 'b', contents: [], queuedAt: 1, retryCount: 0 }])
        .mockResolvedValueOnce([{ courseId: 'c', userId: 'u', batchId: 'b', queuedAt: 1, retryCount: 0 }]);

      await triggerConnect();

      // getJSON called once for content state queue, once for enrol queue
      expect(keyValueDbService.getJSON).toHaveBeenCalledTimes(2);
    });
  });

  describe('flushContentStateQueue()', () => {
    beforeEach(() => { localDataService.init(); });

    it('does nothing when queue is null', async () => {
      mockGetJSON.mockResolvedValueOnce(null);

      await triggerConnect();

      expect(mockContentStateUpdate).not.toHaveBeenCalled();
      expect(keyValueDbService.setJSON).not.toHaveBeenCalled();
    });

    it('does nothing when queue is empty array', async () => {
      mockGetJSON.mockResolvedValueOnce([]);

      await triggerConnect();

      expect(mockContentStateUpdate).not.toHaveBeenCalled();
    });

    it('calls contentStateUpdate for each queued item', async () => {
      const item1: ContentStateUpdateRequest & { queuedAt: number; retryCount: number } = {
        userId: 'user-1', courseId: 'course-1', batchId: 'batch-1',
        contents: [{ contentId: 'c1', status: 2 }],
        queuedAt: 1000, retryCount: 0,
      };
      const item2: ContentStateUpdateRequest & { queuedAt: number; retryCount: number } = {
        userId: 'user-2', courseId: 'course-2', batchId: 'batch-2',
        contents: [{ contentId: 'c2', status: 1 }],
        queuedAt: 2000, retryCount: 0,
      };
      mockGetJSON.mockResolvedValueOnce([item1, item2]);

      await triggerConnect();

      expect(mockContentStateUpdate).toHaveBeenCalledTimes(2);
      expect(keyValueDbService.setJSON).toHaveBeenCalledWith(
        'pending_content_state_q',
        [] // all succeeded → empty failed array
      );
    });

    it('includes assessments when present in queued item', async () => {
      const item: ContentStateUpdateRequest & { queuedAt: number; retryCount: number } = {
        userId: 'u', courseId: 'c', batchId: 'b',
        contents: [{ contentId: 'c1', status: 2 }],
        assessments: [{ assessmentTs: 1, batchId: 'b', courseId: 'c', userId: 'u', attemptId: 'a', contentId: 'c1', events: [] }],
        queuedAt: 1, retryCount: 0,
      };
      mockGetJSON.mockResolvedValueOnce([item]);

      await triggerConnect();

      const callArg = mockContentStateUpdate.mock.calls[0][0] as ContentStateUpdateRequest;
      expect(callArg.assessments).toHaveLength(1);
    });

    it('retains failed items with incremented retryCount', async () => {
      mockContentStateUpdate.mockRejectedValueOnce(new Error('Server error'));
      const item = { userId: 'u', courseId: 'c', batchId: 'b', contents: [], queuedAt: 1, retryCount: 0 };
      mockGetJSON.mockResolvedValueOnce([item]);

      await triggerConnect();

      expect(keyValueDbService.setJSON).toHaveBeenCalledWith(
        'pending_content_state_q',
        [expect.objectContaining({ retryCount: 1 })]
      );
    });

    it('drops items that have reached MAX_RETRIES (5)', async () => {
      mockContentStateUpdate.mockRejectedValueOnce(new Error('Persistent error'));
      // retryCount: 4 → after failure becomes 5 → dropped
      const item = { userId: 'u', courseId: 'c', batchId: 'b', contents: [], queuedAt: 1, retryCount: 4 };
      mockGetJSON.mockResolvedValueOnce([item]);

      await triggerConnect();

      expect(keyValueDbService.setJSON).toHaveBeenCalledWith('pending_content_state_q', []);
    });

    it('handles getJSON throwing gracefully (no crash)', async () => {
      mockGetJSON.mockRejectedValueOnce(new Error('DB error'));

      await expect(triggerConnect()).resolves.toBeUndefined();
    });
  });

  describe('flushEnrolQueue()', () => {
    beforeEach(() => { localDataService.init(); });

    it('does nothing when enrol queue is null', async () => {
      // content state queue → null, enrol queue → null
      mockGetJSON.mockResolvedValue(null);

      await triggerConnect();

      expect(mockEnrol).not.toHaveBeenCalled();
    });

    it('calls enrol for each queued item', async () => {
      const enrolItem = { courseId: 'c1', userId: 'u1', batchId: 'b1', queuedAt: 1, retryCount: 0 };
      // First getJSON call (content state) → null; second (enrol) → items
      mockGetJSON
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce([enrolItem]);

      await triggerConnect();

      expect(mockEnrol).toHaveBeenCalledWith('c1', 'u1', 'b1');
      expect(keyValueDbService.setJSON).toHaveBeenCalledWith('pending_enrol_q', []);
    });

    it('retains failed enrol items with incremented retryCount', async () => {
      mockEnrol.mockRejectedValueOnce(new Error('Enrol failed'));
      const enrolItem = { courseId: 'c', userId: 'u', batchId: 'b', queuedAt: 1, retryCount: 0 };
      mockGetJSON
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce([enrolItem]);

      await triggerConnect();

      expect(keyValueDbService.setJSON).toHaveBeenCalledWith(
        'pending_enrol_q',
        [expect.objectContaining({ retryCount: 1 })]
      );
    });

    it('drops enrol items that exceed MAX_RETRIES', async () => {
      mockEnrol.mockRejectedValueOnce(new Error('Persistent'));
      const enrolItem = { courseId: 'c', userId: 'u', batchId: 'b', queuedAt: 1, retryCount: 4 };
      mockGetJSON
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce([enrolItem]);

      await triggerConnect();

      expect(keyValueDbService.setJSON).toHaveBeenCalledWith('pending_enrol_q', []);
    });
  });

  describe('flushing guard', () => {
    it('does not start a second flush cycle while one is in progress', async () => {
      localDataService.init();

      let resolveFirstFlush!: () => void;
      mockGetJSON.mockImplementationOnce(
        () => new Promise<null>((resolve) => { resolveFirstFlush = () => resolve(null); })
      );

      // Start first flush (won't complete until resolveFirstFlush is called)
      const firstFlush = triggerConnect();

      // Immediately trigger a second connect event — flushing should be true, so it's skipped
      await triggerConnect();

      // getJSON should only have been called once (from the first flush)
      expect(keyValueDbService.getJSON).toHaveBeenCalledTimes(1);

      resolveFirstFlush();
      await firstFlush;
    });
  });
});
