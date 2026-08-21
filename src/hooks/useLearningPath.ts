import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from './useCollection';
import { useViewerSummary } from './useViewerSummary';
import { useLearningPathEnrollment } from './useLearningPathEnrollment';
import { useLevelWaivers } from './useLevelWaivers';
import { parseLearningPath } from '../services/learningPath/learningPathMapper';
import {
  computeCourseProgress,
  computeLevelProgress,
  computePathProgress,
  deriveLevelStatuses,
  isCertificateUnlocked,
  isOutcomeUnlocked,
  getResumeTarget,
} from '../services/learningPath/learningPathProgress';
import { getPathSummary, buildCourseSummaryMapForContext } from '../services/viewer/summaryMapper';

/**
 * Composes the Learning Path hierarchy, Viewer Service progress, and
 * enrolment state into the single object every LP screen consumes.
 *
 * Creator/mentor management surfaces from the portal PR
 * (`isMentorViewingPath`, batch dashboards) are out of scope for the mobile
 * consumption UI — `isCreatorViewingOwnPath` is kept only to block a path's
 * own creator from seeing the learner enrol prompt, mirroring how
 * `CollectionPage` already handles `isCreator` for Courses.
 */
export function useLearningPath(pathId: string | undefined, contextIdParam: string | undefined) {
  const { isAuthenticated, userId: currentUserId } = useAuth();
  const { data: hierarchyData, isLoading: hierarchyLoading, isError: hierarchyError } = useCollection(pathId);
  const { data: summaryRecords = [], isLoading: summaryLoading } = useViewerSummary();
  const enrollment = useLearningPathEnrollment(pathId, contextIdParam, summaryRecords, isAuthenticated);
  const waivers = useLevelWaivers(pathId);

  const isCreatorViewingOwnPath =
    !!isAuthenticated && !!hierarchyData?.createdBy && !!currentUserId && hierarchyData.createdBy === currentUserId;
  const isTrackable = (hierarchyData?.trackable?.enabled?.toLowerCase() ?? '') === 'yes';

  const model = useMemo(() => parseLearningPath(hierarchyData?.hierarchyRoot ?? null), [hierarchyData]);
  const pathSummary = useMemo(
    () => getPathSummary(summaryRecords, pathId, contextIdParam),
    [summaryRecords, pathId, contextIdParam]
  );
  const summaryByCollectionId = useMemo(
    () => buildCourseSummaryMapForContext(summaryRecords, enrollment.effectiveContextId),
    [summaryRecords, enrollment.effectiveContextId]
  );

  const progress = useMemo(
    () => computePathProgress(model, pathSummary, summaryByCollectionId),
    [model, pathSummary, summaryByCollectionId]
  );

  const levelProgress = useMemo(
    () => model.levels.map((level) => computeLevelProgress(level, summaryByCollectionId, pathSummary)),
    [model.levels, summaryByCollectionId, pathSummary]
  );

  const priorProgress = useMemo(
    () => (model.priorAssessment ? computeCourseProgress(model.priorAssessment, summaryByCollectionId, pathSummary) : null),
    [model.priorAssessment, summaryByCollectionId, pathSummary]
  );
  const priorState = { progress: priorProgress, done: !model.priorAssessment || (priorProgress?.pct ?? 0) >= 100 };

  const outcomeProgress = useMemo(
    () =>
      model.outcomeAssessment ? computeCourseProgress(model.outcomeAssessment, summaryByCollectionId, pathSummary) : null,
    [model.outcomeAssessment, summaryByCollectionId, pathSummary]
  );
  const outcomeState = {
    progress: outcomeProgress,
    // A path made entirely of a prior + outcome assessment has zero content
    // Levels left once `parseLearningPath` unwraps both out of `model.levels` -
    // `isOutcomeUnlocked([])` is `false` (correctly locked for a path with no
    // outcome assessment and nothing else), so that case is special-cased here,
    // where `model.outcomeAssessment`'s presence is known, rather than in
    // `isOutcomeUnlocked` itself.
    unlocked: model.levels.length === 0 ? Boolean(model.outcomeAssessment) : isOutcomeUnlocked(levelProgress),
    done: (outcomeProgress?.pct ?? 0) >= 100,
  };

  const certificateUnlocked = isCertificateUnlocked(!!model.outcomeAssessment, levelProgress, outcomeProgress);

  const levelStatuses = useMemo(
    () => deriveLevelStatuses(model, model.policy, levelProgress, priorState.done, waivers),
    [model, levelProgress, priorState.done, waivers]
  );

  const resumeTarget = useMemo(
    () => getResumeTarget(model, pathSummary, summaryRecords),
    [model, pathSummary, summaryRecords]
  );

  return {
    model,
    policy: model.policy,
    progress,
    levelProgress,
    levelStatuses,
    priorState,
    outcomeState,
    certificateUnlocked,
    enrollment,
    resumeTarget,
    pathSummary,
    summaryByCollectionId,
    summaryRecords,
    createdBy: hierarchyData?.createdBy,
    /** Full nested Level→Course→Unit→Resource tree, for player telemetry rollup building. */
    hierarchyRoot: hierarchyData?.hierarchyRoot,
    isTrackable,
    isCreatorViewingOwnPath,
    isLoading: hierarchyLoading || summaryLoading,
    isError: hierarchyError,
  };
}
