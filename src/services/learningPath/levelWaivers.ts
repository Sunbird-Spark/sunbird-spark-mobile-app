import type { ViewerSummaryRecord } from '../../types/viewerServiceTypes';
import type { LearningPathModel, WaiverInfo } from '../../types/learningPathTypes';
import { getOptionalNodeIds } from '../viewer/summaryMapper';

/**
 * Derives per-Level waiver state from the Viewer Service's `optional_nodes` -
 * the prior assessment's own record of which content the learner was excused
 * from. A Level is `waived` when its own identifier is in the optional set
 * (the server waived the whole Level directly), or when every one of its
 * courses is individually optional (see `computeCourseProgress`'s `optional`
 * flag) - either way, nothing in the Level is left for the learner to do.
 *
 * `credited` / `creditedPending` are declared on `WaiverInfo` for the UI
 * (`LPStatusBadge`) but are never returned here - the Viewer Service has no
 * signal for credit-by-exam yet. Leaving them unreachable is deliberate:
 * wiring them up to `optional_nodes` (which only means "waived") would be
 * indistinguishable from a real credit grant and mislabel the badge.
 *
 * MOBILE: `note` is returned as an i18n KEY, not display text - see
 * `WaiverInfo`. The rendering component resolves it with its injected `t`.
 */
export function deriveWaiversFromOptionalNodes(
  model: LearningPathModel,
  pathSummary: ViewerSummaryRecord | undefined,
  summaryByCollectionId?: Map<string, ViewerSummaryRecord>
): Record<string, WaiverInfo> {
  const optionalNodes = getOptionalNodeIds(pathSummary, summaryByCollectionId);
  if (optionalNodes.size === 0) return {};

  const waivers: Record<string, WaiverInfo> = {};
  model.levels.forEach((level) => {
    const levelWaivedDirectly = optionalNodes.has(level.identifier);
    // Same `leafIds.length > 0` guard as `computeCourseProgress`, so the two
    // definitions of "optional course" cannot drift: without it, a leaf-less
    // course would be vacuously optional and waive its whole Level.
    const everyCourseOptional =
      level.courses.length > 0 &&
      level.courses.every(
        (course) =>
          optionalNodes.has(course.identifier) ||
          (course.leafIds.length > 0 && course.leafIds.every((id) => optionalNodes.has(id)))
      );
    if (levelWaivedDirectly || everyCourseOptional) {
      waivers[level.identifier] = {
        status: 'waived',
        note: 'learningPath.waivedByPriorAssessment',
      };
    }
  });
  return waivers;
}
