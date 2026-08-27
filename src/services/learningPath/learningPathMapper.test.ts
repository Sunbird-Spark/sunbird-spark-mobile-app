import { describe, expect, it } from 'vitest';
import { isAssessmentCourse, parseLearningPath } from './learningPathMapper';
import {
  LP_HIERARCHY_EMPTY,
  LP_HIERARCHY_WITH_ASSESSMENTS,
} from './__fixtures__/lpHierarchyWithAssessments.fixture';
import { LP_HIERARCHY_NO_ASSESSMENTS } from './__fixtures__/lpHierarchyNoAssessments.fixture';
import type { HierarchyContentNode } from '../../types/collectionTypes';

describe('parseLearningPath', () => {
  it('returns an empty model for a null/undefined root', () => {
    expect(parseLearningPath(null)).toEqual({
      identifier: '',
      name: '',
      policy: 'Fixed',
      levels: [],
      allSkills: [],
      courseTotal: 0,
      leafTotal: 0,
    });
    expect(parseLearningPath(undefined)).toEqual(
      expect.objectContaining({ identifier: '', levels: [] })
    );
  });

  it('handles a Learning Path with no children (empty path)', () => {
    const model = parseLearningPath(LP_HIERARCHY_EMPTY);
    expect(model.identifier).toBe('do_lp_empty');
    expect(model.levels).toEqual([]);
    expect(model.priorAssessment).toBeUndefined();
    expect(model.outcomeAssessment).toBeUndefined();
    expect(model.courseTotal).toBe(0);
    expect(model.leafTotal).toBe(0);
  });

  describe('with a prior + outcome assessment', () => {
    const model = parseLearningPath(LP_HIERARCHY_WITH_ASSESSMENTS);

    it('resolves the Diagnostic policy', () => {
      expect(model.policy).toBe('Diagnostic');
    });

    it('unwraps the first level into priorAssessment', () => {
      expect(model.priorAssessment).toBeDefined();
      expect(model.priorAssessment?.identifier).toBe('course_prior');
      expect(model.priorAssessment?.isAssessmentCourse).toBe(true);
      expect(model.priorAssessment?.questionCount).toBe(1);
    });

    it('unwraps the last level into outcomeAssessment', () => {
      expect(model.outcomeAssessment).toBeDefined();
      expect(model.outcomeAssessment?.identifier).toBe('course_outcome');
      expect(model.outcomeAssessment?.isAssessmentCourse).toBe(true);
    });

    it('keeps only the middle content level in levels[]', () => {
      expect(model.levels).toHaveLength(1);
      expect(model.levels[0].identifier).toBe('level_1');
    });

    it('does NOT unwrap a mid-level assessment course — it stays a normal course', () => {
      const midLevel = model.levels[0];
      const assessCourse = midLevel.courses.find((c) => c.identifier === 'course_1_assess');
      expect(assessCourse).toBeDefined();
      expect(assessCourse?.isAssessmentCourse).toBe(true);
      // still counted as a course of level_1, not unwrapped to priorAssessment/outcomeAssessment
      expect(midLevel.courses).toHaveLength(2);
    });

    it('unions skills in competencies -> skill -> se_skills order, de-duplicated', () => {
      const midLevel = model.levels[0];
      // level_1 declares its own `competencies`, so it takes precedence over the union of its courses' skills
      expect(midLevel.skills).toEqual(['Data literacy', 'Spreadsheet basics']);
    });

    it('falls back to the union of course skills when a level has no own skills', () => {
      // reconstruct a path whose only content level has no competencies of its own
      const noOwnSkillsRoot: HierarchyContentNode = {
        ...LP_HIERARCHY_WITH_ASSESSMENTS,
        children: LP_HIERARCHY_WITH_ASSESSMENTS.children!.map((lvl) =>
          lvl.identifier === 'level_1' ? { ...lvl, competencies: undefined, skill: undefined, se_skills: undefined } : lvl
        ),
      };
      const m = parseLearningPath(noOwnSkillsRoot);
      expect(m.levels[0].skills.sort()).toEqual(
        ['Data literacy', 'Spreadsheet basics'].sort()
      );
    });

    it('computes courseTotal including prior + outcome', () => {
      // 1 prior + 2 courses in level_1 + 1 outcome = 4
      expect(model.courseTotal).toBe(4);
    });

    it('unions allSkills across prior, levels, and outcome', () => {
      expect(model.allSkills).toEqual(
        expect.arrayContaining(['Data literacy', 'Spreadsheet basics', 'SQL basics'])
      );
    });

    it('computes leafTotal from the root leafNodesCount', () => {
      expect(model.leafTotal).toBe(6);
    });
  });

  describe('with no prior/outcome assessment (common case)', () => {
    const model = parseLearningPath(LP_HIERARCHY_NO_ASSESSMENTS);

    it('resolves the Fixed policy', () => {
      expect(model.policy).toBe('Fixed');
    });

    it('leaves priorAssessment/outcomeAssessment undefined', () => {
      expect(model.priorAssessment).toBeUndefined();
      expect(model.outcomeAssessment).toBeUndefined();
    });

    it('keeps both levels, sorted by index', () => {
      expect(model.levels.map((l) => l.identifier)).toEqual([
        'do_2146317426971115521341',
        'do_2146317426971197441343',
      ]);
    });

    it('builds LPUnitNode trees preserving CourseUnit nesting', () => {
      const course = model.levels[0].courses[0];
      expect(course.units).toHaveLength(2);
      expect(course.units?.[0].isUnit).toBe(true);
      expect(course.units?.[0].leafIds).toEqual(['do_21463158442296934411']);
    });

    it('flattens leafIds per course via getLeafContentIds', () => {
      const course = model.levels[0].courses[0];
      expect(course.leafIds).toEqual([
        'do_21463158442296934411',
        'do_214631592231313408130',
      ]);
      expect(course.leafNodesCount).toBe(2);
    });

    it('is not an assessment course when its leaves are ordinary resources', () => {
      const course = model.levels[0].courses[0];
      expect(course.isAssessmentCourse).toBe(false);
      expect(course.questionCount).toBeUndefined();
    });

    it('computes courseTotal across levels only', () => {
      expect(model.courseTotal).toBe(2);
    });

    it('computes leafTotal from the root leafNodesCount', () => {
      expect(model.leafTotal).toBe(3);
    });
  });
});

describe('isAssessmentCourse', () => {
  it('is false when leafIds is empty', () => {
    const node: HierarchyContentNode = {
      identifier: 'c1',
      mimeType: 'application/vnd.ekstep.content-collection',
      children: [],
    };
    expect(isAssessmentCourse(node, [])).toBe(false);
  });

  it('is true only when every leaf is a QuestionSet by objectType or mimeType', () => {
    const allQuml: HierarchyContentNode = {
      identifier: 'c2',
      mimeType: 'application/vnd.ekstep.content-collection',
      children: [
        { identifier: 'q1', mimeType: 'application/vnd.sunbird.questionset', objectType: 'QuestionSet' },
        { identifier: 'q2', mimeType: 'application/vnd.sunbird.question', objectType: 'QuestionSet' },
      ],
    };
    expect(isAssessmentCourse(allQuml, ['q1', 'q2'])).toBe(true);
  });

  it('is false when the course mixes a QuML leaf with an ordinary resource', () => {
    const mixed: HierarchyContentNode = {
      identifier: 'c3',
      mimeType: 'application/vnd.ekstep.content-collection',
      children: [
        { identifier: 'q1', mimeType: 'application/vnd.sunbird.questionset', objectType: 'QuestionSet' },
        { identifier: 'r1', mimeType: 'application/pdf' },
      ],
    };
    expect(isAssessmentCourse(mixed, ['q1', 'r1'])).toBe(false);
  });

  it('does NOT treat legacy ECML assessment resources as QuML question sets', () => {
    const ecml: HierarchyContentNode = {
      identifier: 'c4',
      mimeType: 'application/vnd.ekstep.content-collection',
      children: [{ identifier: 'e1', mimeType: 'application/vnd.ekstep.ecml-archive' }],
    };
    expect(isAssessmentCourse(ecml, ['e1'])).toBe(false);
  });
});
