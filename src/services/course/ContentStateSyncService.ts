import { getClient, ApiResponse } from '../../lib/http-client';
import { buildOfflineResponse } from '../../lib/http-client/offlineResponse';
import type {
  ContentStateItem,
  ContentStateReadRequest,
  ContentStateReadResponse,
} from '../../types/collectionTypes';
import { keyValueDbService } from '../db/KeyValueDbService';
import { networkService } from '../network/networkService';

// ── Timestamp parsing ────────────────────────────────────────────────────────

/**
 * Parse a Sunbird timestamp string (or number) to milliseconds.
 *
 * Handles:
 *   - Numbers (already ms epoch)
 *   - ISO strings: "2026-03-20T19:06:20.143+05:30"
 *   - Sunbird format: "2026-03-20 19:06:20:143+0530"
 *     (space separator, colon before milliseconds, no colon in tz offset)
 *
 * Returns 0 for null / undefined / unparseable values.
 */
export function parseTimestamp(ts: unknown): number {
  if (ts == null) return 0;
  if (typeof ts === 'number') return ts > 0 ? ts : 0;
  if (typeof ts !== 'string' || ts.trim() === '') return 0;

  // Normalise Sunbird format step by step:
  //  "2026-03-20 19:06:20:143+0530"
  //  → "2026-03-20T19:06:20.143+0530"  (space→T, 3rd colon→dot)
  //  → "2026-03-20T19:06:20.143+05:30" (insert : in tz offset)
  const normalized = ts
    .replace(' ', 'T')
    .replace(/(\d{2}:\d{2}:\d{2}):(\d{3})/, '$1.$2')
    .replace(/([+-])(\d{2})(\d{2})$/, '$1$2:$3');

  const ms = new Date(normalized).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

// ── Score array merge ────────────────────────────────────────────────────────

/**
 * Union two score arrays by `attemptId` and enforce `maxAttempts` constraints.
 *
 * Rules:
 *  - Network entries are authoritative (server-confirmed) — they win on
 *    `attemptId` collision.
 *  - Local-only entries represent un-synced offline attempts and are appended.
 *  - If combined count > maxAttempts: Sort by score DESC and take the Top N.
 */
export function mergeScores(
  local: unknown[],
  network: unknown[],
  maxAttempts?: number
): unknown[] {
  const map = new Map<string, unknown>();

  for (const s of network) {
    const id = (s as Record<string, unknown>)?.attemptId as string | undefined;
    if (id) map.set(id, s);
  }
  for (const s of local) {
    const id = (s as Record<string, unknown>)?.attemptId as string | undefined;
    if (id && !map.has(id)) map.set(id, s);
  }

  const combined = Array.from(map.values());

  // Enforcement of maxAttempts rule: Keep Top N highest scores
  if (typeof maxAttempts === 'number' && maxAttempts > 0 && combined.length > maxAttempts) {
    return combined
      .sort((a, b) => {
        const scoreA = (a as any).totalScore ?? 0;
        const scoreB = (b as any).totalScore ?? 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        // Tie-break: more recent attempt wins
        const tsA = parseTimestamp((a as any).lastAttemptedOn);
        const tsB = parseTimestamp((b as any).lastAttemptedOn);
        return tsB - tsA;
      })
      .slice(0, maxAttempts);
  }

  return combined;
}

// ── Per-item merge ───────────────────────────────────────────────────────────

function getNum(item: ContentStateItem, field: string): number {
  const v = (item as Record<string, unknown>)[field];
  return typeof v === 'number' ? v : 0;
}

function getField(item: ContentStateItem, field: string): unknown {
  return (item as Record<string, unknown>)[field];
}

/**
 * Merge two content state items using best-wins rules per field:
 *
 *  status          → higher value wins (2 > 1 > 0; completed beats everything)
 *  progress        → higher value wins
 *  viewCount       → higher value wins
 *  completedCount  → higher value wins
 *  lastAccessTime  → more recent timestamp wins
 *  lastCompletedTime → more recent wins; null loses to any non-null value
 *  score           → union by attemptId (network authoritative on collision)
 *
 * All other fields come from network (authoritative metadata: batchId,
 * courseId, collectionId, etc.) with local overriding only the above fields.
 */
export function mergeItem(
  local: ContentStateItem,
  network: ContentStateItem,
  maxAttempts?: number,
): ContentStateItem {
  const localAccessTs = parseTimestamp(getField(local, 'lastAccessTime'));
  const networkAccessTs = parseTimestamp(getField(network, 'lastAccessTime'));

  const localCompletedTs = parseTimestamp(getField(local, 'lastCompletedTime'));
  const networkCompletedTs = parseTimestamp(getField(network, 'lastCompletedTime'));

  const mergedLastAccessTime =
    localAccessTs >= networkAccessTs
      ? getField(local, 'lastAccessTime')
      : getField(network, 'lastAccessTime');

  const mergedLastCompletedTime = (() => {
    if (localCompletedTs === 0 && networkCompletedTs === 0)
      return getField(local, 'lastCompletedTime') ?? null;
    if (localCompletedTs === 0) return getField(network, 'lastCompletedTime');
    if (networkCompletedTs === 0) return getField(local, 'lastCompletedTime');
    return localCompletedTs >= networkCompletedTs
      ? getField(local, 'lastCompletedTime')
      : getField(network, 'lastCompletedTime');
  })();

  const mergedScores = mergeScores(
    Array.isArray(local.score) ? local.score : [],
    Array.isArray(network.score) ? network.score : [],
    maxAttempts,
  );

  return {
    // 1. Start with network as the metadata base (batchId, courseId, etc.)
    ...network,
    // 2. Overlay local fields (may have fresher non-progress data)
    ...local,
    // 3. Override with explicitly merged progress fields (always wins)
    contentId: local.contentId,
    status: Math.max(local.status ?? 0, network.status ?? 0),
    progress: Math.max(getNum(local, 'progress'), getNum(network, 'progress')),
    viewCount: Math.max(getNum(local, 'viewCount'), getNum(network, 'viewCount')),
    completedCount: Math.max(getNum(local, 'completedCount'), getNum(network, 'completedCount')),
    lastAccessTime: mergedLastAccessTime,
    lastCompletedTime: mergedLastCompletedTime,
    score: mergedScores,
  };
}

// ── Content list union merge ─────────────────────────────────────────────────

/**
 * Merge two content lists using a union strategy:
 *
 *  • Items present in both   → merge per field (best-wins)
 *  • Items only in local     → keep as-is (offline consumption the server
 *                               doesn't know about yet)
 *  • Items only in network   → keep as-is (progress from another device /
 *                               session that the local DB missed)
 *
 * Example: local has c1, c2 completed; network has c4, c5 completed.
 * Result: c1, c2, c4, c5 all completed → sent to UI and written to both sides.
 */
export function mergeContentLists(
  local: ContentStateItem[],
  network: ContentStateItem[],
  maxAttemptsMap?: Record<string, number>,
): ContentStateItem[] {
  const networkMap = new Map<string, ContentStateItem>(
    network.map((i) => [i.contentId, i]),
  );

  const result: ContentStateItem[] = [];
  const seen = new Set<string>();

  // Local-first: merge with network counterpart if it exists
  for (const l of local) {
    const n = networkMap.get(l.contentId);
    const maxAttempts = maxAttemptsMap?.[l.contentId];
    result.push(n ? mergeItem(l, n, maxAttempts) : l);
    seen.add(l.contentId);
  }

  // Network-only items (not in local at all)
  for (const n of network) {
    if (!seen.has(n.contentId)) {
      result.push(n);
    }
  }

  return result;
}

// ── Dirty-check ──────────────────────────────────────────────────────────────

/**
 * Returns true when the merged list has changed relative to `source` in a
 * way that warrants writing back to that source.
 *
 * Checks: item count, status, progress, score count.
 * (viewCount / completedCount changes are server-computed and follow status.)
 */
export function hasChanged(
  source: ContentStateItem[],
  merged: ContentStateItem[],
): boolean {
  if (source.length !== merged.length) return true;

  const sourceMap = new Map<string, ContentStateItem>(
    source.map((i) => [i.contentId, i]),
  );

  for (const item of merged) {
    const orig = sourceMap.get(item.contentId);
    if (!orig) return true;

    if ((orig.status ?? 0) !== (item.status ?? 0)) return true;

    // Progress — compare numerically (0 if absent)
    if (getNum(orig, 'progress') !== getNum(item, 'progress')) return true;

    // Score details — compare contents (ID, score, and timestamp)
    const scoreA = Array.isArray(orig.score) ? (orig.score as any[]) : [];
    const scoreB = Array.isArray(item.score) ? (item.score as any[]) : [];
    if (scoreA.length !== scoreB.length) return true;

    for (let i = 0; i < scoreA.length; i++) {
      if (scoreA[i].attemptId !== scoreB[i].attemptId) return true;
      if (scoreA[i].totalScore !== scoreB[i].totalScore) return true;
      if (scoreA[i].lastAttemptedOn !== scoreB[i].lastAttemptedOn) return true;
    }
  }

  return false;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class ContentStateSyncService {
  /**
   * Reads content state with an offline-first bidirectional merge strategy.
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ OFFLINE                                                             │
   * │   Return local DB data.  Empty list if DB has nothing yet.         │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ ONLINE — no local data                                              │
   * │   Fetch network → cache to local DB → return network response.     │
   * ├─────────────────────────────────────────────────────────────────────┤
   * │ ONLINE — local data exists                                          │
   * │   1. Fetch network response.                                        │
   * │   2. Read local DB.                                                 │
   * │   3. Merge: union of items, best-wins per field.                   │
   * │   4. merged ≠ network → PATCH /content/state/update (background).  │
   * │   5. merged ≠ local   → write merged to local DB.                  │
   * │   6. Return merged list to caller.                                  │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * Network PATCH errors are swallowed — the local DB is always correct.
   */
  async readContentState(
    request: ContentStateReadRequest & { maxAttemptsMap?: Record<string, number> },
  ): Promise<ApiResponse<ContentStateReadResponse>> {
    const cacheKey = `cache:content_state_${request.userId}_${request.courseId}_${request.batchId}`;

    // ── Offline path ────────────────────────────────────────────────────
    if (!networkService.isConnected()) {
      return this.readFromDb(cacheKey);
    }

    // ── Online: fetch from network ──────────────────────────────────────
    let networkResponse: ApiResponse<ContentStateReadResponse>;
    try {
      const body: Record<string, unknown> = {
        userId: request.userId,
        courseId: request.courseId,
        batchId: request.batchId,
        contentIds: request.contentIds,
      };
      if (request.fields?.length) body.fields = request.fields;

      networkResponse = await getClient().post<ContentStateReadResponse>(
        '/course/v1/content/state/read',
        { request: body },
      );
    } catch {
      // Network unavailable → fall back to local DB
      return this.readFromDb(cacheKey);
    }

    const networkList: ContentStateItem[] = networkResponse.data?.contentList ?? [];

    // ── Read local DB ───────────────────────────────────────────────────
    let localList: ContentStateItem[] = [];
    try {
      const raw = await keyValueDbService.getRaw(cacheKey);
      if (raw) {
        localList = (JSON.parse(raw) as ContentStateReadResponse).contentList ?? [];
      }
    } catch (err) {
      console.warn('[ContentStateSyncService] Failed to read local cache:', err);
    }

    // ── No local data → cache and return network ────────────────────────
    if (localList.length === 0) {
      try {
        await keyValueDbService.setRaw(cacheKey, JSON.stringify(networkResponse.data ?? {}));
      } catch (err) {
        console.warn('[ContentStateSyncService] Failed to cache network response:', err);
      }
      return networkResponse;
    }

    // ── Merge ───────────────────────────────────────────────────────────
    const mergedList = mergeContentLists(localList, networkList, request.maxAttemptsMap);

    const networkNeedsUpdate = hasChanged(networkList, mergedList);
    const localNeedsUpdate = hasChanged(localList, mergedList);

    // Patch network in background — don't block the UI
    if (networkNeedsUpdate) {
      void this.patchNetworkWithMerged(request, mergedList);
    }

    // Update local DB synchronously so subsequent offline reads are correct
    if (localNeedsUpdate) {
      try {
        await keyValueDbService.setRaw(
          cacheKey,
          JSON.stringify({ ...(networkResponse.data ?? {}), contentList: mergedList }),
        );
      } catch (err) {
        console.warn('[ContentStateSyncService] Failed to write merged state to DB:', err);
      }
    }

    return {
      ...networkResponse,
      data: { ...(networkResponse.data ?? {}), contentList: mergedList },
    };
  }

  /**
   * Read the local content state cache for a course and return the locally-
   * calculated completion percentage, or null if no cache exists yet.
   *
   * Used by EnrollmentService to keep MyLearning progress in sync with the
   * per-leaf-node progress shown on the Collection Details page.
   */
  async getLocalCompletionPercentage(
    userId: string,
    courseId: string,
    batchId: string,
    leafNodesCount: number,
  ): Promise<number | null> {
    if (!leafNodesCount || leafNodesCount <= 0) return null;
    const cacheKey = `cache:content_state_${userId}_${courseId}_${batchId}`;
    const raw = await keyValueDbService.getRaw(cacheKey).catch(() => null);
    if (!raw) return null;
    const contentList = (JSON.parse(raw) as ContentStateReadResponse).contentList ?? [];
    if (contentList.length === 0) return null;
    const completed = contentList.filter(item => item.status === 2).length;
    return Math.round((completed / leafNodesCount) * 100);
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async readFromDb(
    cacheKey: string,
  ): Promise<ApiResponse<ContentStateReadResponse>> {
    try {
      const raw = await keyValueDbService.getRaw(cacheKey);
      const data: ContentStateReadResponse = raw
        ? (JSON.parse(raw) as ContentStateReadResponse)
        : { contentList: [] };
      return buildOfflineResponse<ContentStateReadResponse>(data);
    } catch {
      return buildOfflineResponse<ContentStateReadResponse>({ contentList: [] });
    }
  }

  /**
   * PATCH the network with the merged content state so the server catches up
   * to any offline progress the device accumulated.
   *
   * Only `status` and `lastAccessTime` are sent — `progress`, `viewCount`,
   * and `completedCount` are server-computed and will update automatically.
   *
   * Errors are swallowed; on next online read the merge will retry.
   */
  private async patchNetworkWithMerged(
    request: ContentStateReadRequest,
    mergedList: ContentStateItem[],
  ): Promise<void> {
    try {
      const contents = mergedList.map((item) => ({
        contentId: item.contentId,
        status: item.status ?? 0,
        courseId: request.courseId,
        batchId: request.batchId,
        ...(getField(item, 'lastAccessTime') != null && {
          lastAccessTime: String(getField(item, 'lastAccessTime')),
        }),
        ...(item.score && { score: item.score }),
      }));

      await getClient().patch<unknown>('/course/v1/content/state/update', {
        request: { userId: request.userId, contents },
      });
    } catch (err) {
      console.warn(
        '[ContentStateSyncService] Background network PATCH failed; will retry on next read:',
        err,
      );
    }
  }
}

export const contentStateSyncService = new ContentStateSyncService();
