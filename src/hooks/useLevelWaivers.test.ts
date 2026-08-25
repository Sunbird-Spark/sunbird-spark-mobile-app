import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLevelWaivers } from './useLevelWaivers';
import { parseLearningPath } from '../services/learningPath/learningPathMapper';
import { LP_HIERARCHY_NO_ASSESSMENTS } from '../services/learningPath/__fixtures__/lpHierarchyNoAssessments.fixture';
import { LP_HIERARCHY_WITH_ASSESSMENTS } from '../services/learningPath/__fixtures__/lpHierarchyWithAssessments.fixture';
import type { ViewerSummaryRecord } from '../types/viewerServiceTypes';

// No i18n mock here, unlike the portal's copy of this test: on mobile the hook
// returns `note` as a raw key for the rendering component's injected `t`.
const model = parseLearningPath(LP_HIERARCHY_NO_ASSESSMENTS);

function summaryWith(optionalNodes: string[]): ViewerSummaryRecord {
  return { userId: 'u1', active: true, status: 1, progress: 0, contentStatus: {}, optionalNodes };
}

describe('useLevelWaivers', () => {
  it('returns an empty map when the path record has no optional_nodes', () => {
    const { result } = renderHook(() => useLevelWaivers(model, undefined));
    expect(result.current).toEqual({});
  });

  it('returns an empty map when optional_nodes is empty', () => {
    const { result } = renderHook(() => useLevelWaivers(model, summaryWith([])));
    expect(result.current).toEqual({});
  });

  it("waives a level whose own identifier is in optional_nodes, with the note left as an i18n key", () => {
    const levelId = model.levels[0]!.identifier;
    const { result } = renderHook(() => useLevelWaivers(model, summaryWith([levelId])));
    expect(result.current[levelId]).toEqual({
      status: 'waived',
      note: 'learningPath.waivedByPriorAssessment',
    });
  });

  it('waives a level when every one of its courses is individually optional', () => {
    const level = model.levels[0]!;
    const courseIds = level.courses.map((c) => c.identifier);
    const { result } = renderHook(() => useLevelWaivers(model, summaryWith(courseIds)));
    expect(result.current[level.identifier]?.status).toBe('waived');
  });

  it('does not waive a level when only some of its courses are optional', () => {
    // The no-assessments fixture has single-course levels, so use the
    // two-course level_1 from the assessments fixture — otherwise this case
    // would be vacuous.
    const fullModel = parseLearningPath(LP_HIERARCHY_WITH_ASSESSMENTS);
    const level = fullModel.levels[0]!;
    expect(level.courses.length).toBeGreaterThan(1);
    const { result } = renderHook(() => useLevelWaivers(fullModel, summaryWith([level.courses[0]!.identifier])));
    expect(result.current[level.identifier]).toBeUndefined();
  });

  it('picks up optional ids carried only by the per-course fan-out records', () => {
    const level = model.levels[0]!;
    const byCollection = new Map<string, ViewerSummaryRecord>([
      [level.courses[0]!.identifier, summaryWith([level.identifier])],
    ]);
    const { result } = renderHook(() => useLevelWaivers(model, summaryWith([]), byCollection));
    expect(result.current[level.identifier]?.status).toBe('waived');
  });
});
