import type {
  HierarchyContentNode,
  TrackableCollection,
  ContentStateItem,
  BatchListItem,
} from '../../types/collectionTypes';

const COLLECTION_MIME = 'application/vnd.ekstep.content-collection';

/** Recursively extract all leaf (playable) content IDs from hierarchy.
 *  Skips collection/unit nodes — only actual content items count toward progress. */
export function getLeafContentIds(node: HierarchyContentNode): string[] {
  if (node.children?.length) {
    return node.children.flatMap(getLeafContentIds);
  }
  // Leaf node: only include if it's NOT a collection/unit node
  if ((node.mimeType ?? '').toLowerCase() === COLLECTION_MIME) return [];
  return [node.identifier];
}

/**
 * Recursively extract all leaf (playable) nodes as full objects from hierarchy.
 * Use this when you need node metadata (e.g. maxAttempts) beyond just the ID.
 */
export function getLeafNodes(node: HierarchyContentNode): HierarchyContentNode[] {
  if (node.children?.length) {
    return node.children.flatMap(getLeafNodes);
  }
  if ((node.mimeType ?? '').toLowerCase() === COLLECTION_MIME) return [];
  return [node];
}

/** Find the user's enrollment for a specific course. */
export function getEnrollmentForCollection(
  enrollments: TrackableCollection[],
  courseId: string
): TrackableCollection | undefined {
  return enrollments.find((e) =>
    e.courseId === courseId ||
    e.contentId === courseId ||
    e.collectionId === courseId
  );
}

/** Map contentId -> status from content state response. */
export function getContentStatusMap(
  contentList: ContentStateItem[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of contentList) {
    if (item.status != null) {
      map[item.contentId] = item.status;
    }
  }
  return map;
}

/** Calculate course progress: { total, completed, percentage }. */
export function getCourseProgressProps(
  leafContentIds: string[],
  contentStatusMap: Record<string, number>
): { total: number; completed: number; percentage: number } {
  const total = leafContentIds.length;
  const completed = leafContentIds.filter((id) => contentStatusMap[id] === 2).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percentage };
}

/** Filter batches that are still enrollable (ongoing + enrollment window open). */
export function getEnrollableBatches(batches: BatchListItem[]): BatchListItem[] {
  const now = new Date();
  return batches.filter((b) => {
    if (b.status !== 1) return false; // only ongoing
    if (b.enrollmentEndDate && new Date(b.enrollmentEndDate) < now) return false;
    return true;
  });
}

/** Get first certificate template preview URL from batch read response. */
export function getFirstCertPreviewUrl(
  certTemplates: Record<string, { previewUrl?: string }> | undefined
): string | undefined {
  if (!certTemplates) return undefined;
  const firstKey = Object.keys(certTemplates)[0];
  return firstKey ? certTemplates[firstKey].previewUrl : undefined;
}

/** Whether a hierarchy node is SelfAssess (quiz) — attempt limits apply only to these. */
export function isSelfAssess(node: HierarchyContentNode | null | undefined): boolean {
  return (node?.contentType ?? '') === 'SelfAssess';
}

export interface ContentScoreInfo {
  totalScore: number;
  totalMaxScore: number;
}

export interface ContentAttemptInfo {
  attemptCount: number;
  bestScore?: ContentScoreInfo;
}

/**
 * Map contentId → { attemptCount, bestScore } from content state.
 *
 * `maxAttemptsMap` is optional. When provided and a content item has more score
 * entries than its allowed `maxAttempts`, the scores are sorted descending by
 * `totalScore` and only the top `maxAttempts` entries are kept.  This ensures
 * `attemptCount` (= effective score array length) never exceeds `maxAttempts`
 * and always reflects the highest-scoring attempts.
 *
 * Example: maxAttempts=4, local has 3 scores, network has 4 scores (one shared).
 * After merge: 6 unique entries → sorted by totalScore → keep top 4.
 * Result: attemptCount=4, bestScore = highest totalScore among those 4.
 */
export function getContentAttemptInfoMap(
  contentList:     ContentStateItem[],
  maxAttemptsMap?: Record<string, number>,
): Record<string, ContentAttemptInfo> {
  const map: Record<string, ContentAttemptInfo> = {};

  contentList.forEach((item) => {
    if (item.contentId == null) return;

    const rawScores = Array.isArray(item.score) ? item.score : [];
    const maxAttempts = maxAttemptsMap?.[item.contentId];

    // Cap to top-N by totalScore when maxAttempts is defined and exceeded
    let scores = rawScores;
    if (typeof maxAttempts === 'number' && maxAttempts > 0 && rawScores.length > maxAttempts) {
      scores = [...rawScores]
        .sort((a, b) => {
          const aScore = typeof (a as any)?.totalScore === 'number' ? (a as any).totalScore : 0;
          const bScore = typeof (b as any)?.totalScore === 'number' ? (b as any).totalScore : 0;
          return bScore - aScore; // descending
        })
        .slice(0, maxAttempts);
    }

    const attemptCount = scores.length;
    const entry: ContentAttemptInfo = { attemptCount };

    if (scores.length > 0) {
      let best: ContentScoreInfo | undefined;
      for (const s of scores) {
        const attempt = s as { totalScore?: number; totalMaxScore?: number } | undefined;
        if (
          attempt &&
          typeof attempt.totalScore === 'number' &&
          typeof attempt.totalMaxScore === 'number'
        ) {
          if (!best || attempt.totalScore > best.totalScore) {
            best = { totalScore: attempt.totalScore, totalMaxScore: attempt.totalMaxScore };
          }
        }
      }
      if (best) entry.bestScore = best;
    }

    map[item.contentId] = entry;
  });

  return map;
}

/** Find the next incomplete content (for Resume button). */
export function getNextContent(
  node: HierarchyContentNode,
  statusMap: Record<string, number>
): HierarchyContentNode | null {
  if (!node.children?.length) {
    return statusMap[node.identifier] !== 2 ? node : null;
  }
  for (const child of node.children) {
    const found = getNextContent(child, statusMap);
    if (found) return found;
  }
  return null;
}
