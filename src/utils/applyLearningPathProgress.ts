import { getPathSummary } from '../services/viewer/summaryMapper';
import { isLearningPathCategory } from './isLearningPath';
import type { TrackableCollection } from '../types/collectionTypes';
import type { ViewerSummaryRecord } from '../types/viewerServiceTypes';

/**
 * Learning Paths are v1/Viewer-Service-only (see `LearningPathPage.tsx`) — their
 * `completionPercentage`/`status` from the legacy `course/v1/user/enrollment/list`
 * record is the plain enrolment row, not the rolled-up path progress, and is never
 * kept in sync with it. Seen live: My Learning showed a Learning Path as 100%
 * complete while its own Overview ledger (sourced from the Viewer Service summary)
 * correctly showed "not started".
 *
 * Overwrites `completionPercentage`/`status` on every enrolled Learning Path item
 * with the same `pathSummary.completionPercentage` that `computePathProgress`
 * (the Overview page's own progress source) prefers, so every screen that lists
 * enrolled items agrees with the Overview page. Course items pass through untouched.
 */
export function applyLearningPathProgress(
  items: TrackableCollection[],
  summaryRecords: ViewerSummaryRecord[]
): TrackableCollection[] {
  return items.map((item) => {
    if (!isLearningPathCategory(item.content?.primaryCategory)) return item;

    const pathId = item.collectionId || item.courseId;
    const pathSummary = getPathSummary(summaryRecords, pathId, item.batchId);
    const completionPercentage = pathSummary?.completionPercentage ?? 0;
    const status = completionPercentage >= 100 ? 2 : completionPercentage > 0 ? 1 : 0;

    return { ...item, completionPercentage, status };
  });
}
