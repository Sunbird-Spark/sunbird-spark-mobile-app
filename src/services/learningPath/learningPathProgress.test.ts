import { describe, expect, it } from 'vitest';
import {
  computeCourseProgress,
  computeLevelProgress,
  computePathProgress,
  deriveLevelStatuses,
  getAssessmentScore,
  getCourseContentStatus,
  getResumeTarget,
  isCertificateUnlocked,
  isLeafComplete,
  isOutcomeUnlocked,
} from './learningPathProgress';
import { parseLearningPath } from './learningPathMapper';
import { LP_HIERARCHY_WITH_ASSESSMENTS } from './__fixtures__/lpHierarchyWithAssessments.fixture';
import { LP_HIERARCHY_NO_ASSESSMENTS } from './__fixtures__/lpHierarchyNoAssessments.fixture';
import type { LPCourseNode, LevelProgressInfo } from '../../types/learningPathTypes';
import type { ViewerSummaryRecord } from '../../types/viewerServiceTypes';

function record(overrides: Partial<ViewerSummaryRecord>): ViewerSummaryRecord {
  return {
    userId: 'u1',
    active: true,
    status: 1,
    progress: 0,
    contentStatus: {},
    ...overrides,
  };
}

const model = parseLearningPath(LP_HIERARCHY_NO_ASSESSMENTS);
const [level1, level2] = model.levels;
const course1 = level1.courses[0]; // 2 leaves
const course2 = level2.courses[0]; // 1 leaf

describe('getCourseContentStatus', () => {
  it('returns undefined when neither record has a contentStatus', () => {
    expect(getCourseContentStatus(course1, new Map())).toBeUndefined();
  });

  it('merges path and course contentStatus, course wins per leaf', () => {
    const pathSummary = record({ contentStatus: { leaf1: 1, leaf2: 2 } });
    const summaryByCollectionId = new Map([
      [course1.identifier, record({ contentStatus: { leaf1: 2 } })],
    ]);
    const merged = getCourseContentStatus(course1, summaryByCollectionId, pathSummary);
    expect(merged).toEqual({ leaf1: 2, leaf2: 2 });
  });

  it('does not let an empty-but-present course contentStatus mask the path map', () => {
    const pathSummary = record({ contentStatus: { leaf1: 2 } });
    const summaryByCollectionId = new Map([[course1.identifier, record({ contentStatus: {} })]]);
    const merged = getCourseContentStatus(course1, summaryByCollectionId, pathSummary);
    expect(merged).toEqual({ leaf1: 2 });
  });
});

describe('isLeafComplete', () => {
  it('is true only for status === 2', () => {
    expect(isLeafComplete({ a: 2 }, 'a')).toBe(true);
    expect(isLeafComplete({ a: 1 }, 'a')).toBe(false);
    expect(isLeafComplete(undefined, 'a')).toBe(false);
  });
});

describe('computeCourseProgress', () => {
  it('is notStarted with no records', () => {
    const progress = computeCourseProgress(course1, new Map());
    expect(progress).toEqual({ pct: 0, completed: 0, total: 2, status: 'notStarted', optional: false });
  });

  it('derives pct from contentStatus when no aggregate percentage is present', () => {
    const summaryByCollectionId = new Map([
      [course1.identifier, record({ contentStatus: { [course1.leafIds[0]]: 2 } })],
    ]);
    const progress = computeCourseProgress(course1, summaryByCollectionId);
    expect(progress).toEqual({ pct: 50, completed: 1, total: 2, status: 'active', optional: false });
  });

  it('takes the MAX of aggregatePct and contentStatusPct - stale 0% aggregate never masks a completed leaf', () => {
    const summaryByCollectionId = new Map([
      [
        course1.identifier,
        record({ completionPercentage: 0, contentStatus: { [course1.leafIds[0]]: 2, [course1.leafIds[1]]: 2 } }),
      ],
    ]);
    const progress = computeCourseProgress(course1, summaryByCollectionId);
    expect(progress.pct).toBe(100);
    expect(progress.status).toBe('completed');
  });

  it('prefers a fresher aggregatePct over a stale contentStatus', () => {
    const summaryByCollectionId = new Map([
      [course1.identifier, record({ completionPercentage: 100, contentStatus: {} })],
    ]);
    const progress = computeCourseProgress(course1, summaryByCollectionId);
    expect(progress.pct).toBe(100);
    expect(progress.status).toBe('completed');
  });
});

describe('computeLevelProgress', () => {
  it('averages course percentages and counts completed courses', () => {
    const summaryByCollectionId = new Map([
      [course1.identifier, record({ completionPercentage: 100 })],
    ]);
    const progress = computeLevelProgress(level1, summaryByCollectionId);
    // level1 has only 1 course in this fixture
    expect(progress).toEqual({ pct: 100, completed: 1, total: 1, doneCourses: 1 });
  });

  it('is all zero for a level with no progress records', () => {
    const progress = computeLevelProgress(level2, new Map());
    expect(progress).toEqual({ pct: 0, completed: 0, total: 1, doneCourses: 0 });
  });
});

describe('computePathProgress', () => {
  it('is all zero with no path summary', () => {
    const progress = computePathProgress(model, undefined, new Map());
    expect(progress).toEqual({ pct: 0, completed: 0, total: model.leafTotal, doneLevels: 0, levelCount: 2 });
  });

  it('prefers the path record own completionPercentage', () => {
    const pathSummary = record({ completionPercentage: 42, contentStatus: {} });
    const progress = computePathProgress(model, pathSummary, new Map());
    expect(progress.pct).toBe(42);
    expect(progress.levelCount).toBe(2);
  });

  it('falls back to contentStatus-derived pct when completionPercentage is absent', () => {
    const pathSummary = record({
      contentStatus: { [course1.leafIds[0]]: 2, [course1.leafIds[1]]: 2, [course2.leafIds[0]]: 2 },
    });
    const progress = computePathProgress(model, pathSummary, new Map());
    expect(progress.pct).toBe(100); // 3/3 leaves complete
  });

  it('counts a level as done only once its course-progress average hits 100%', () => {
    const summaryByCollectionId = new Map([
      [course1.identifier, record({ completionPercentage: 100 })],
      [course2.identifier, record({ completionPercentage: 100 })],
    ]);
    const pathSummary = record({ completionPercentage: 100 });
    const progress = computePathProgress(model, pathSummary, summaryByCollectionId);
    expect(progress.doneLevels).toBe(2);
  });
});

describe('deriveLevelStatuses', () => {
  const notStarted: LevelProgressInfo = { pct: 0, completed: 0, total: 1, doneCourses: 0 };
  const active: LevelProgressInfo = { pct: 40, completed: 0, total: 1, doneCourses: 0 };
  const completed: LevelProgressInfo = { pct: 100, completed: 1, total: 1, doneCourses: 1 };

  it('Fixed: unlocks level 0 always, subsequent levels only once the previous is 100%', () => {
    const statuses = deriveLevelStatuses(model, 'Fixed', [active, notStarted], false);
    expect(statuses).toEqual(['active', 'locked']);
  });

  it('Fixed: level 2 unlocks once level 1 completes', () => {
    const statuses = deriveLevelStatuses(model, 'Fixed', [completed, notStarted], false);
    expect(statuses).toEqual(['completed', 'notStarted']);
  });

  it('Diagnostic: every level stays locked until the prior assessment is done', () => {
    const statuses = deriveLevelStatuses(model, 'Diagnostic', [notStarted, notStarted], false);
    expect(statuses).toEqual(['locked', 'locked']);
  });

  it('Diagnostic: levels open (independently of each other) once the prior assessment is done', () => {
    const statuses = deriveLevelStatuses(model, 'Diagnostic', [active, notStarted], true);
    expect(statuses).toEqual(['active', 'notStarted']);
  });

  it('a completed level always reports completed regardless of policy', () => {
    const statuses = deriveLevelStatuses(model, 'Fixed', [completed, completed], false);
    expect(statuses).toEqual(['completed', 'completed']);
  });

  it('a waiver entry always wins over the derived state', () => {
    const statuses = deriveLevelStatuses(
      model,
      'Fixed',
      [notStarted, notStarted],
      false,
      { [level1.identifier]: { status: 'waived', note: 'credit by exam' } }
    );
    expect(statuses[0]).toBe('waived');
  });

  it('returns locked when a level has no progress entry at all', () => {
    const statuses = deriveLevelStatuses(model, 'Fixed', [], false);
    expect(statuses).toEqual(['locked', 'locked']);
  });
});

describe('isOutcomeUnlocked', () => {
  it('is false when there are no levels', () => {
    expect(isOutcomeUnlocked([])).toBe(false);
  });

  it('is false unless every level is 100%', () => {
    expect(
      isOutcomeUnlocked([
        { pct: 100, completed: 1, total: 1, doneCourses: 1 },
        { pct: 99, completed: 0, total: 1, doneCourses: 0 },
      ])
    ).toBe(false);
  });

  it('is true when every level is 100%', () => {
    expect(
      isOutcomeUnlocked([
        { pct: 100, completed: 1, total: 1, doneCourses: 1 },
        { pct: 100, completed: 1, total: 1, doneCourses: 1 },
      ])
    ).toBe(true);
  });
});

describe('isCertificateUnlocked', () => {
  const allLevelsDone: LevelProgressInfo[] = [
    { pct: 100, completed: 1, total: 1, doneCourses: 1 },
  ];
  const notAllLevelsDone: LevelProgressInfo[] = [
    { pct: 50, completed: 0, total: 1, doneCourses: 0 },
  ];

  it('is false when levels are not all complete, regardless of outcome', () => {
    expect(isCertificateUnlocked(true, notAllLevelsDone, { pct: 100, completed: 1, total: 1 })).toBe(false);
  });

  // An assessment-only path (root unwraps entirely into prior + outcome) has no
  // content Levels, and `isOutcomeUnlocked([])` is false — which used to lock
  // the certificate forever. Mirrors useLearningPath's own special case.
  describe('assessment-only path (no content Levels)', () => {
    it('unlocks once the outcome assessment is done', () => {
      expect(isCertificateUnlocked(true, [], { pct: 100, completed: 1, total: 1 })).toBe(true);
    });

    it('stays locked while the outcome assessment is incomplete', () => {
      expect(isCertificateUnlocked(true, [], { pct: 40, completed: 0, total: 1 })).toBe(false);
    });

    it('stays locked when there is no outcome assessment either (degenerate path)', () => {
      expect(isCertificateUnlocked(false, [], null)).toBe(false);
    });
  });

  it('unlocks on levels alone when there is no outcome assessment', () => {
    expect(isCertificateUnlocked(false, allLevelsDone, null)).toBe(true);
  });

  it('with an outcome assessment, requires the outcome itself to hit 100% too', () => {
    expect(isCertificateUnlocked(true, allLevelsDone, { pct: 50, completed: 0, total: 1 })).toBe(false);
    expect(isCertificateUnlocked(true, allLevelsDone, { pct: 100, completed: 1, total: 1 })).toBe(true);
  });

  it('is not gated on the whole-path completionPercentage (which the caller never passes in)', () => {
    // Regression guard: the function signature intentionally has no path-level pct parameter.
    expect(isCertificateUnlocked(true, allLevelsDone, { pct: 100, completed: 1, total: 1 })).toBe(true);
  });
});

describe('getAssessmentScore', () => {
  it('returns null when there is no assessmentStatus on the path summary', () => {
    expect(getAssessmentScore('course_prior', record({}))).toBeNull();
  });

  it('resolves by identifier first', () => {
    const pathSummary = record({
      assessmentStatus: { course_prior: { score: 8, max_score: 10, attempts: 2 } },
    });
    expect(getAssessmentScore('course_prior', pathSummary)).toEqual({ score: 8, maxScore: 10, attemptCount: 2 });
  });

  it('falls back to leafIds when the course identifier itself has no entry', () => {
    const pathSummary = record({
      assessmentStatus: { qs_prior: { score: 5, max_score: 10 } },
    });
    expect(getAssessmentScore('course_prior', pathSummary, ['qs_prior'])).toEqual({ score: 5, maxScore: 10 });
  });
});

describe('getResumeTarget', () => {
  it('returns null when the path summary has no contextId (not enrolled)', () => {
    expect(getResumeTarget(model, undefined)).toBeNull();
  });

  it('resumes at the path record lastReadContentId when it maps to a known course', () => {
    const pathSummary = record({ contextId: 'ctx1', lastReadContentId: course1.leafIds[0] });
    const target = getResumeTarget(model, pathSummary, [pathSummary]);
    expect(target?.collectionId).toBe(course1.identifier);
    expect(target?.contentId).toBe(course1.leafIds[0]);
  });

  it('falls back to the first incomplete leaf in document order when lastReadContentId is unset', () => {
    const pathSummary = record({
      contextId: 'ctx1',
      contentStatus: { [course1.leafIds[0]]: 2 },
    });
    const target = getResumeTarget(model, pathSummary, [pathSummary]);
    expect(target?.contentId).toBe(course1.leafIds[1]);
  });

  it('resolves the course fan-out contextId over a blindly-constructed one', () => {
    const pathSummary = record({ contextId: 'ctx1', lastReadContentId: course1.leafIds[0] });
    const fanOutRecord = record({
      collectionId: course1.identifier,
      contextId: `ctx1:${course1.identifier}`,
    });
    const target = getResumeTarget(model, pathSummary, [pathSummary, fanOutRecord]);
    expect(target?.contextId).toBe(`ctx1:${course1.identifier}`);
  });
});

// Sanity check against the richer fixture with prior/outcome assessments unwrapped.
describe('progress helpers against LP_HIERARCHY_WITH_ASSESSMENTS', () => {
  const fullModel = parseLearningPath(LP_HIERARCHY_WITH_ASSESSMENTS);

  it('computes prior assessment course progress independently of content levels', () => {
    expect(fullModel.priorAssessment).toBeDefined();
    const progress = computeCourseProgress(fullModel.priorAssessment as LPCourseNode, new Map());
    expect(progress.status).toBe('notStarted');
  });

  it('outcome unlock requires the single content level complete', () => {
    expect(fullModel.levels).toHaveLength(1);
    expect(isOutcomeUnlocked([{ pct: 100, completed: 1, total: 1, doneCourses: 1 }])).toBe(true);
    expect(isOutcomeUnlocked([{ pct: 0, completed: 0, total: 1, doneCourses: 0 }])).toBe(false);
  });
});
