import { useMemo } from 'react';
import type { LearningPathModel, WaiverInfo } from '../types/learningPathTypes';
import type { ViewerSummaryRecord } from '../types/viewerServiceTypes';
import { deriveWaiversFromOptionalNodes } from '../services/learningPath/levelWaivers';

/**
 * Per-Level waiver/credit state, derived from the Viewer Service's
 * `optional_nodes` (see `deriveWaiversFromOptionalNodes`) — the prior
 * assessment's own record of which Levels/courses the learner was excused
 * from. `deriveLevelStatuses` falls through to its policy-derived lock/unlock
 * logic when a Level has no waiver entry, so an empty map (no `optional_nodes`
 * yet) is behaviour-identical to the old stub this replaced.
 *
 * MOBILE: unlike the portal's hook, this does NOT resolve `note` to display
 * text — it stays an i18n key, which the rendering component translates with
 * its injected `t` (see `lpTFunction.ts`). That keeps the hook's return value
 * identical to the pure derivation `skillAggregation.ts` consumes.
 *
 * `credited` / `creditedPending` never appear here — see
 * `deriveWaiversFromOptionalNodes`'s doc comment.
 */
export function useLevelWaivers(
  model: LearningPathModel,
  pathSummary: ViewerSummaryRecord | undefined,
  summaryByCollectionId?: Map<string, ViewerSummaryRecord>
): Record<string, WaiverInfo> {
  return useMemo(
    () => deriveWaiversFromOptionalNodes(model, pathSummary, summaryByCollectionId),
    [model, pathSummary, summaryByCollectionId]
  );
}
