import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseTimestamp,
  mergeScores,
  mergeItem,
  mergeContentLists,
  hasChanged,
  ContentStateSyncService,
} from './ContentStateSyncService';
import { getClient } from '../../lib/http-client';
import { networkService } from '../network/networkService';
import { keyValueDbService } from '../db/KeyValueDbService';
import type { ContentStateItem, ContentStateReadRequest } from '../../types/collectionTypes';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../../lib/http-client', () => ({
  getClient: vi.fn(),
}));

vi.mock('../network/networkService', () => ({
  networkService: { isConnected: vi.fn().mockReturnValue(true) },
}));

vi.mock('../db/KeyValueDbService', () => ({
  keyValueDbService: {
    getRaw:  vi.fn().mockResolvedValue(null),
    setRaw:  vi.fn().mockResolvedValue(undefined),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(
  contentId: string,
  overrides: Partial<ContentStateItem & Record<string, unknown>> = {},
): ContentStateItem {
  return { contentId, status: 0, score: [], ...overrides };
}

// ── parseTimestamp ────────────────────────────────────────────────────────────

describe('parseTimestamp', () => {
  it('returns 0 for null / undefined', () => {
    expect(parseTimestamp(null)).toBe(0);
    expect(parseTimestamp(undefined)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseTimestamp('')).toBe(0);
  });

  it('returns numeric input as-is when positive', () => {
    expect(parseTimestamp(1711440000000)).toBe(1711440000000);
  });

  it('returns 0 for non-positive numbers', () => {
    expect(parseTimestamp(0)).toBe(0);
    expect(parseTimestamp(-1)).toBe(0);
  });

  it('parses ISO string correctly', () => {
    const ts  = '2026-03-20T13:36:40.143+00:00';
    const ms  = parseTimestamp(ts);
    expect(ms).toBeGreaterThan(0);
    expect(new Date(ms).getFullYear()).toBe(2026);
  });

  it('parses Sunbird format "2026-03-20 19:06:20:143+0530"', () => {
    const ts  = '2026-03-20 19:06:20:143+0530';
    const ms  = parseTimestamp(ts);
    expect(ms).toBeGreaterThan(0);
    expect(new Date(ms).getFullYear()).toBe(2026);
  });

  it('later Sunbird timestamp produces higher value', () => {
    const earlier = parseTimestamp('2026-03-20 19:06:20:143+0530');
    const later   = parseTimestamp('2026-03-20 20:06:20:143+0530');
    expect(later).toBeGreaterThan(earlier);
  });

  it('returns 0 for unparseable string', () => {
    expect(parseTimestamp('not-a-date')).toBe(0);
  });
});

// ── mergeScores ───────────────────────────────────────────────────────────────

describe('mergeScores', () => {
  it('returns network scores when local is empty', () => {
    const network = [{ attemptId: 'a1', totalScore: 3 }];
    expect(mergeScores([], network)).toEqual(network);
  });

  it('returns local scores when network is empty', () => {
    const local = [{ attemptId: 'a1', totalScore: 2 }];
    expect(mergeScores(local, [])).toEqual(local);
  });

  it('unions non-overlapping attempt IDs', () => {
    const local   = [{ attemptId: 'a1', totalScore: 2 }];
    const network = [{ attemptId: 'a2', totalScore: 3 }];
    const merged  = mergeScores(local, network);
    expect(merged).toHaveLength(2);
    const ids = merged.map((s: any) => s.attemptId);
    expect(ids).toContain('a1');
    expect(ids).toContain('a2');
  });

  it('network entry wins on same attemptId collision', () => {
    const local   = [{ attemptId: 'a1', totalScore: 1 }]; // lower — local version
    const network = [{ attemptId: 'a1', totalScore: 3 }]; // higher — server-confirmed
    const merged  = mergeScores(local, network) as Array<{ attemptId: string; totalScore: number }>;
    expect(merged).toHaveLength(1);
    expect(merged[0].totalScore).toBe(3); // network wins
  });

  it('discards entries without an attemptId', () => {
    const local   = [{ totalScore: 2 }];     // no attemptId
    const network = [{ totalScore: 3 }];     // no attemptId
    expect(mergeScores(local, network)).toHaveLength(0);
  });

  it('local-only un-synced attempts are added after network entries', () => {
    const local   = [{ attemptId: 'offline-1', totalScore: 1 }];
    const network = [{ attemptId: 'online-1',  totalScore: 3 }];
    const merged  = mergeScores(local, network);
    expect(merged).toHaveLength(2);
  });
});

// ── mergeItem ─────────────────────────────────────────────────────────────────

describe('mergeItem — merge decision table', () => {
  it('COMPLETED (device) + IN_PROGRESS (cloud) → COMPLETED wins', () => {
    const local   = makeItem('c1', { status: 2, progress: 100 });
    const network = makeItem('c1', { status: 1, progress: 60  });
    const merged  = mergeItem(local, network);
    expect(merged.status).toBe(2);
    expect((merged as any).progress).toBe(100);
  });

  it('IN_PROGRESS 80% (device) + IN_PROGRESS 40% (cloud) → 80% wins', () => {
    const local   = makeItem('c1', { status: 1, progress: 80 });
    const network = makeItem('c1', { status: 1, progress: 40 });
    const merged  = mergeItem(local, network);
    expect(merged.status).toBe(1);
    expect((merged as any).progress).toBe(80);
  });

  it('IN_PROGRESS 60% (device) + COMPLETED (cloud) → COMPLETED wins', () => {
    const local   = makeItem('c1', { status: 1, progress: 60  });
    const network = makeItem('c1', { status: 2, progress: 100 });
    const merged  = mergeItem(local, network);
    expect(merged.status).toBe(2);
    expect((merged as any).progress).toBe(100);
  });

  it('COMPLETED (device) + COMPLETED (cloud) → COMPLETED, no conflict', () => {
    const local   = makeItem('c1', { status: 2, progress: 100 });
    const network = makeItem('c1', { status: 2, progress: 100 });
    const merged  = mergeItem(local, network);
    expect(merged.status).toBe(2);
  });

  it('higher viewCount wins', () => {
    const local   = makeItem('c1', { viewCount: 5 });
    const network = makeItem('c1', { viewCount: 3 });
    expect((mergeItem(local, network) as any).viewCount).toBe(5);

    const local2   = makeItem('c1', { viewCount: 2 });
    const network2 = makeItem('c1', { viewCount: 7 });
    expect((mergeItem(local2, network2) as any).viewCount).toBe(7);
  });

  it('higher completedCount wins', () => {
    const local   = makeItem('c1', { completedCount: 3 });
    const network = makeItem('c1', { completedCount: 1 });
    expect((mergeItem(local, network) as any).completedCount).toBe(3);
  });

  it('more recent lastAccessTime wins', () => {
    const local   = makeItem('c1', { lastAccessTime: '2026-03-20 20:00:00:000+0530' });
    const network = makeItem('c1', { lastAccessTime: '2026-03-20 18:00:00:000+0530' });
    const merged  = mergeItem(local, network) as any;
    expect(merged.lastAccessTime).toBe('2026-03-20 20:00:00:000+0530');
  });

  it('non-null lastCompletedTime wins over null', () => {
    const local   = makeItem('c1', { lastCompletedTime: null  });
    const network = makeItem('c1', { lastCompletedTime: '2026-03-19 17:08:07:089+0530' });
    const merged  = mergeItem(local, network) as any;
    expect(merged.lastCompletedTime).toBe('2026-03-19 17:08:07:089+0530');
  });

  it('more recent lastCompletedTime wins', () => {
    const local   = makeItem('c1', { lastCompletedTime: '2026-03-20 19:00:00:000+0530' });
    const network = makeItem('c1', { lastCompletedTime: '2026-03-19 12:00:00:000+0530' });
    const merged  = mergeItem(local, network) as any;
    expect(merged.lastCompletedTime).toBe('2026-03-20 19:00:00:000+0530');
  });

  it('merges score arrays from both sides', () => {
    const local   = makeItem('c1', { score: [{ attemptId: 'a1', totalScore: 2 }] });
    const network = makeItem('c1', { score: [{ attemptId: 'a2', totalScore: 3 }] });
    const merged  = mergeItem(local, network);
    expect(merged.score).toHaveLength(2);
  });

  it('preserves network metadata (batchId, courseId) in result', () => {
    const local   = makeItem('c1', { batchId: 'old-batch' });
    const network = makeItem('c1', { batchId: 'batch-1', courseId: 'course-1' });
    const merged  = mergeItem(local, network) as any;
    // Network batchId is the authoritative metadata value spread first,
    // then local spreads over it — local's batchId wins if present.
    // The important thing is courseId from network is preserved.
    expect(merged.courseId).toBe('course-1');
  });
});

// ── mergeContentLists ─────────────────────────────────────────────────────────

describe('mergeContentLists', () => {
  it('device-only items are kept (offline consumption)', () => {
    const local   = [makeItem('c1', { status: 2 })];
    const network: ContentStateItem[] = [];
    const merged  = mergeContentLists(local, network);
    expect(merged).toHaveLength(1);
    expect(merged[0].contentId).toBe('c1');
    expect(merged[0].status).toBe(2);
  });

  it('network-only items are kept (completed on another device)', () => {
    const local:   ContentStateItem[] = [];
    const network = [makeItem('c1', { status: 2 })];
    const merged  = mergeContentLists(local, network);
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe(2);
  });

  it('overlapping items are merged field-by-field', () => {
    const local   = [makeItem('c1', { status: 1, progress: 80 })];
    const network = [makeItem('c1', { status: 2, progress: 100 })];
    const merged  = mergeContentLists(local, network);
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe(2);
    expect((merged[0] as any).progress).toBe(100);
  });

  it('union scenario: device c1+c2, network c4+c5 → all four in result', () => {
    const local   = [makeItem('c1', { status: 2 }), makeItem('c2', { status: 2 })];
    const network = [makeItem('c4', { status: 2 }), makeItem('c5', { status: 2 })];
    const merged  = mergeContentLists(local, network);
    expect(merged).toHaveLength(4);
    const ids = merged.map((i) => i.contentId);
    expect(ids).toContain('c1');
    expect(ids).toContain('c2');
    expect(ids).toContain('c4');
    expect(ids).toContain('c5');
  });

  it('partial overlap: device c1+c2, network c2+c3 → c1+c2(merged)+c3', () => {
    const local   = [makeItem('c1', { status: 2 }), makeItem('c2', { status: 1, progress: 50 })];
    const network = [makeItem('c2', { status: 2, progress: 100 }), makeItem('c3', { status: 2 })];
    const merged  = mergeContentLists(local, network);
    expect(merged).toHaveLength(3);
    const c2 = merged.find((i) => i.contentId === 'c2')!;
    expect(c2.status).toBe(2);         // completed wins
    expect((c2 as any).progress).toBe(100);
  });

  it('no duplicates in result', () => {
    const item    = makeItem('c1', { status: 1 });
    const merged  = mergeContentLists([item], [item]);
    expect(merged).toHaveLength(1);
  });
});

// ── hasChanged ────────────────────────────────────────────────────────────────

describe('hasChanged', () => {
  it('returns false when lists are identical', () => {
    const list = [makeItem('c1', { status: 2, progress: 100 })];
    expect(hasChanged(list, list)).toBe(false);
  });

  it('returns true when lengths differ', () => {
    const source = [makeItem('c1')];
    const merged = [makeItem('c1'), makeItem('c2')];
    expect(hasChanged(source, merged)).toBe(true);
  });

  it('returns true when status changed', () => {
    const source = [makeItem('c1', { status: 1 })];
    const merged = [makeItem('c1', { status: 2 })];
    expect(hasChanged(source, merged)).toBe(true);
  });

  it('returns true when progress changed', () => {
    const source = [makeItem('c1', { progress: 40 })];
    const merged = [makeItem('c1', { progress: 80 })];
    expect(hasChanged(source, merged)).toBe(true);
  });

  it('returns true when score count changed', () => {
    const source = [makeItem('c1', { score: [] })];
    const merged = [makeItem('c1', { score: [{ attemptId: 'a1' }] })];
    expect(hasChanged(source, merged)).toBe(true);
  });

  it('returns true when a content ID is in merged but not in source', () => {
    const source = [makeItem('c1')];
    const merged = [makeItem('c2')]; // different id, same length
    expect(hasChanged(source, merged)).toBe(true);
  });
});

// ── ContentStateSyncService ───────────────────────────────────────────────────

describe('ContentStateSyncService', () => {
  let service:    ContentStateSyncService;
  let mockClient: { post: ReturnType<typeof vi.fn>; patch: ReturnType<typeof vi.fn> };

  const request: ContentStateReadRequest = {
    userId:     'user-1',
    courseId:   'course-1',
    batchId:    'batch-1',
    contentIds: ['c1', 'c2'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentStateSyncService();
    mockClient = { post: vi.fn(), patch: vi.fn() };
    (getClient as any).mockReturnValue(mockClient);
    (networkService.isConnected as any).mockReturnValue(true);
    (keyValueDbService.getRaw  as any).mockResolvedValue(null);
    (keyValueDbService.setRaw  as any).mockResolvedValue(undefined);
  });

  describe('offline path', () => {
    it('returns empty contentList when offline and no local DB', async () => {
      (networkService.isConnected as any).mockReturnValue(false);

      const result = await service.readContentState(request);

      expect(mockClient.post).not.toHaveBeenCalled();
      expect(result.data.contentList).toEqual([]);
    });

    it('returns local DB data when offline', async () => {
      (networkService.isConnected as any).mockReturnValue(false);
      (keyValueDbService.getRaw as any).mockResolvedValue(
        JSON.stringify({ contentList: [{ contentId: 'c1', status: 2 }] }),
      );

      const result = await service.readContentState(request);

      expect(mockClient.post).not.toHaveBeenCalled();
      expect(result.data.contentList).toHaveLength(1);
      expect(result.data.contentList![0].status).toBe(2);
    });
  });

  describe('online — no local data', () => {
    it('fetches network, caches to DB, returns network response', async () => {
      const networkData = { contentList: [{ contentId: 'c1', status: 1 }] };
      mockClient.post.mockResolvedValue({ data: networkData, status: 200, headers: {} });

      const result = await service.readContentState(request);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/course/v1/content/state/read',
        expect.objectContaining({ request: expect.objectContaining({ userId: 'user-1' }) }),
      );
      expect(keyValueDbService.setRaw).toHaveBeenCalled();
      expect(result.data.contentList).toHaveLength(1);
      // No PATCH triggered (local was empty)
      expect(mockClient.patch).not.toHaveBeenCalled();
    });

    it('passes fields parameter when provided', async () => {
      mockClient.post.mockResolvedValue({ data: { contentList: [] }, status: 200, headers: {} });

      await service.readContentState({ ...request, fields: ['progress', 'score'] });

      const callBody = mockClient.post.mock.calls[0][1];
      expect(callBody.request.fields).toEqual(['progress', 'score']);
    });

    it('omits fields key when fields array is empty', async () => {
      mockClient.post.mockResolvedValue({ data: { contentList: [] }, status: 200, headers: {} });

      await service.readContentState({ ...request, fields: [] });

      const callBody = mockClient.post.mock.calls[0][1];
      expect(callBody.request.fields).toBeUndefined();
    });
  });

  describe('online — local data exists, merge + bidirectional update', () => {
    it('device has completed content that network shows in-progress → PATCHes network', async () => {
      // Local: c1 completed (offline progress)
      (keyValueDbService.getRaw as any).mockResolvedValue(
        JSON.stringify({ contentList: [{ contentId: 'c1', status: 2, progress: 100 }] }),
      );
      // Network: c1 in-progress (stale)
      mockClient.post.mockResolvedValue({
        data:    { contentList: [{ contentId: 'c1', status: 1, progress: 60 }] },
        status:  200,
        headers: {},
      });
      mockClient.patch.mockResolvedValue({ data: {}, status: 200, headers: {} });

      const result = await service.readContentState(request);

      // UI sees completed
      expect(result.data.contentList![0].status).toBe(2);
      // Wait a tick for the fire-and-forget PATCH
      await Promise.resolve();
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/course/v1/content/state/update',
        expect.objectContaining({
          request: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });

    it('network has completed content that local shows in-progress → updates local DB', async () => {
      // Local: c1 in-progress
      (keyValueDbService.getRaw as any).mockResolvedValue(
        JSON.stringify({ contentList: [{ contentId: 'c1', status: 1, progress: 60 }] }),
      );
      // Network: c1 completed
      mockClient.post.mockResolvedValue({
        data:    { contentList: [{ contentId: 'c1', status: 2, progress: 100 }] },
        status:  200,
        headers: {},
      });

      const result = await service.readContentState(request);

      expect(result.data.contentList![0].status).toBe(2);
      expect(keyValueDbService.setRaw).toHaveBeenCalled();
      // PATCH not triggered (network already has better data)
      await Promise.resolve();
      expect(mockClient.patch).not.toHaveBeenCalled();
    });

    it('union: device has c1+c2, network has c3+c4 → returns all four', async () => {
      (keyValueDbService.getRaw as any).mockResolvedValue(
        JSON.stringify({
          contentList: [
            { contentId: 'c1', status: 2 },
            { contentId: 'c2', status: 2 },
          ],
        }),
      );
      mockClient.post.mockResolvedValue({
        data: {
          contentList: [
            { contentId: 'c3', status: 2 },
            { contentId: 'c4', status: 2 },
          ],
        },
        status:  200,
        headers: {},
      });
      mockClient.patch.mockResolvedValue({ data: {}, status: 200, headers: {} });

      const result = await service.readContentState(request);

      expect(result.data.contentList).toHaveLength(4);
      await Promise.resolve();
      expect(mockClient.patch).toHaveBeenCalled(); // local items unknown to network
    });

    it('both sides already identical → no PATCH, no local write', async () => {
      const same = JSON.stringify({ contentList: [{ contentId: 'c1', status: 2, progress: 100 }] });
      (keyValueDbService.getRaw as any).mockResolvedValue(same);
      mockClient.post.mockResolvedValue({
        data:    { contentList: [{ contentId: 'c1', status: 2, progress: 100 }] },
        status:  200,
        headers: {},
      });

      await service.readContentState(request);

      await Promise.resolve();
      expect(mockClient.patch).not.toHaveBeenCalled();
      // setRaw called once when local was empty initially — but here local has
      // data, so no update needed
      expect(keyValueDbService.setRaw).not.toHaveBeenCalled();
    });
  });

  describe('network failure fallback', () => {
    it('falls back to local DB when network POST fails', async () => {
      mockClient.post.mockRejectedValue(new Error('Network error'));
      (keyValueDbService.getRaw as any).mockResolvedValue(
        JSON.stringify({ contentList: [{ contentId: 'c1', status: 1 }] }),
      );

      const result = await service.readContentState(request);

      expect(result.data.contentList).toHaveLength(1);
    });

    it('returns empty contentList when network fails and DB is empty', async () => {
      mockClient.post.mockRejectedValue(new Error('Network error'));

      const result = await service.readContentState(request);

      expect(result.data.contentList).toEqual([]);
    });
  });

  describe('score merge in full flow', () => {
    it('unions offline attempts with server attempts', async () => {
      const offlineScore  = { attemptId: 'offline-1', totalScore: 2, totalMaxScore: 5 };
      const serverScore   = { attemptId: 'server-1',  totalScore: 4, totalMaxScore: 5 };

      (keyValueDbService.getRaw as any).mockResolvedValue(
        JSON.stringify({
          contentList: [{ contentId: 'c1', status: 1, score: [offlineScore] }],
        }),
      );
      mockClient.post.mockResolvedValue({
        data: {
          contentList: [{ contentId: 'c1', status: 1, score: [serverScore] }],
        },
        status:  200,
        headers: {},
      });

      const result = await service.readContentState(request);

      const item = result.data.contentList![0];
      expect(item.score).toHaveLength(2);
      const ids = (item.score as Array<{ attemptId: string }>).map((s) => s.attemptId);
      expect(ids).toContain('offline-1');
      expect(ids).toContain('server-1');
    });
  });
});
