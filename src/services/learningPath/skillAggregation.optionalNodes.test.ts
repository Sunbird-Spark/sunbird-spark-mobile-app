import { describe, expect, it } from 'vitest';
import { parseLearningPath } from './learningPathMapper';
import { buildPathSkillSummary } from './skillAggregation';
import { LP_HIERARCHY_NO_ASSESSMENTS } from './__fixtures__/lpHierarchyNoAssessments.fixture';
import type { ViewerSummaryRecord } from '../../types/viewerServiceTypes';

const model = parseLearningPath(LP_HIERARCHY_NO_ASSESSMENTS);
const level1 = model.levels[0]!;

function pathSummaryWith(optionalNodes: string[]): ViewerSummaryRecord {
  return {
    userId: 'u1',
    collectionId: model.identifier,
    contextId: 'batch_1',
    active: true,
    status: 1,
    progress: 0,
    contentStatus: {},
    optionalNodes,
  };
}

describe('buildPathSkillSummary — optional_nodes', () => {
  it('does not credit a Level with no progress and no waiver', () => {
    const summary = buildPathSkillSummary(model, pathSummaryWith([]), new Map(), 'batch_1');
    level1.skills.forEach((skill) => expect(summary.gainedSkills.has(skill)).toBe(false));
  });

  it('credits a waived Level’s skills as gained', () => {
    // The Level's own id in optional_nodes waives it wholesale, so its skills
    // count even though `computeLevelProgress` never reaches 100 for it.
    const summary = buildPathSkillSummary(model, pathSummaryWith([level1.identifier]), new Map(), 'batch_1');
    expect(level1.skills.length).toBeGreaterThan(0);
    level1.skills.forEach((skill) => expect(summary.gainedSkills.has(skill)).toBe(true));
  });
});
