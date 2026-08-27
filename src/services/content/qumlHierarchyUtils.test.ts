import { describe, it, expect } from 'vitest';
import {
  collectQuestionIds,
  replaceQuestionsInHierarchy,
  ensureMaxScore,
  resolveMaxScore,
  applyMaxScore,
  alignResponseDeclarationTypes,
  QUESTION_MIME,
  QUESTIONSET_MIME,
} from './qumlHierarchyUtils';

describe('collectQuestionIds', () => {
  it('returns [] for null/empty nodes', () => {
    expect(collectQuestionIds(null)).toEqual([]);
    expect(collectQuestionIds({})).toEqual([]);
  });

  it('collects question identifiers across nested children, in order', () => {
    const tree = {
      mimeType: QUESTIONSET_MIME,
      identifier: 'qs_root',
      children: [
        { mimeType: QUESTION_MIME, identifier: 'q1' },
        {
          mimeType: QUESTIONSET_MIME,
          identifier: 'section',
          children: [
            { mimeType: QUESTION_MIME, identifier: 'q2' },
            { mimeType: QUESTION_MIME, identifier: 'q3' },
          ],
        },
      ],
    };
    expect(collectQuestionIds(tree)).toEqual(['q1', 'q2', 'q3']);
  });

  it('ignores question nodes without an identifier', () => {
    const tree = {
      mimeType: QUESTIONSET_MIME,
      children: [{ mimeType: QUESTION_MIME }],
    };
    expect(collectQuestionIds(tree)).toEqual([]);
  });
});

describe('replaceQuestionsInHierarchy', () => {
  it('replaces question stubs with full objects from the map', () => {
    const map = new Map<string, any>([['q1', { identifier: 'q1', body: '<p>full</p>' }]]);
    const tree = {
      mimeType: QUESTIONSET_MIME,
      children: [{ mimeType: QUESTION_MIME, identifier: 'q1' }],
    };
    const result = replaceQuestionsInHierarchy(tree, map);
    expect(result.children[0]).toEqual(
      expect.objectContaining({ identifier: 'q1', body: '<p>full</p>' })
    );
  });

  it('keeps the existing node when the question is not in the map', () => {
    const stub = { mimeType: QUESTION_MIME, identifier: 'q9' };
    const tree = { mimeType: QUESTIONSET_MIME, children: [stub] };
    const result = replaceQuestionsInHierarchy(tree, new Map());
    expect(result.children[0]).toBe(stub);
  });

  it('applies maxScore and response-type alignment to every replaced question', () => {
    const map = new Map<string, any>([
      [
        'q1',
        {
          identifier: 'q1',
          maxScore: 2,
          responseDeclaration: { response1: { correctResponse: { value: '0' } } },
          interactions: { response1: { options: [{ value: 0 }, { value: 1 }] } },
        },
      ],
    ]);
    const tree = { mimeType: QUESTIONSET_MIME, children: [{ mimeType: QUESTION_MIME, identifier: 'q1' }] };
    const result = replaceQuestionsInHierarchy(tree, map);
    const q1 = result.children[0];
    expect(q1.outcomeDeclaration.maxScore.defaultValue).toBe(2);
    expect(q1.responseDeclaration.response1.type).toBe('integer');
  });
});

describe('resolveMaxScore', () => {
  it('prefers the top-level maxScore', () => {
    expect(resolveMaxScore({ maxScore: 5, outcomeDeclaration: { maxScore: { defaultValue: 9 } } })).toBe(5);
  });

  it('falls back to outcomeDeclaration.maxScore.defaultValue', () => {
    expect(resolveMaxScore({ outcomeDeclaration: { maxScore: { defaultValue: 3 } } })).toBe(3);
  });

  it('defaults to 1 when neither is present or valid', () => {
    expect(resolveMaxScore({})).toBe(1);
    expect(resolveMaxScore({ maxScore: 0 })).toBe(1);
    expect(resolveMaxScore({ maxScore: -1 })).toBe(1);
  });
});

describe('applyMaxScore', () => {
  it('mirrors the resolved value into both outcomeDeclaration.maxScore.defaultValue and the top-level maxScore', () => {
    const node: any = { maxScore: 4 };
    applyMaxScore(node);
    expect(node.outcomeDeclaration.maxScore.defaultValue).toBe(4);
    expect(node.maxScore).toBe(4);
  });

  it('preserves an existing outcomeDeclaration.maxScore.cardinality/type', () => {
    const node = { outcomeDeclaration: { maxScore: { cardinality: 'multiple', type: 'string', defaultValue: 7 } } };
    applyMaxScore(node);
    expect(node.outcomeDeclaration.maxScore).toEqual({ cardinality: 'multiple', type: 'string', defaultValue: 7 });
  });

  it('normalises a JSON-string outcomeDeclaration without throwing', () => {
    const node = { outcomeDeclaration: JSON.stringify({ maxScore: { defaultValue: 6 } }) };
    applyMaxScore(node);
    expect(typeof node.outcomeDeclaration).toBe('object');
    expect((node.outcomeDeclaration as any).maxScore.defaultValue).toBe(6);
  });
});

describe('alignResponseDeclarationTypes', () => {
  it('sets type: integer when interaction options are all numeric and the declared type is not integer', () => {
    const node: any = {
      responseDeclaration: { response1: { correctResponse: { value: '0' } } },
      interactions: { response1: { options: [{ value: 0 }, { value: 1 }] } },
    };
    alignResponseDeclarationTypes(node);
    expect(node.responseDeclaration.response1.type).toBe('integer');
  });

  it('is a no-op when the declaration already says integer', () => {
    const node: any = {
      responseDeclaration: { response1: { type: 'integer', correctResponse: { value: 0 } } },
      interactions: { response1: { options: [{ value: 0 }] } },
    };
    alignResponseDeclarationTypes(node);
    expect(node.responseDeclaration.response1.type).toBe('integer');
  });

  it('is a no-op when interaction options are not all numeric (e.g. text options)', () => {
    const node: any = {
      responseDeclaration: { response1: { correctResponse: { value: 'a' } } },
      interactions: { response1: { options: [{ value: 'a' }, { value: 'b' }] } },
    };
    alignResponseDeclarationTypes(node);
    expect(node.responseDeclaration.response1.type).toBeUndefined();
  });

  it('is a no-op when there is no responseDeclaration at all', () => {
    expect(() => alignResponseDeclarationTypes({})).not.toThrow();
  });
});

describe('ensureMaxScore', () => {
  it('adds outcomeDeclaration.maxScore when missing', () => {
    const result = ensureMaxScore({ maxScore: 3 });
    expect(result.outcomeDeclaration.maxScore).toEqual({
      cardinality: 'single',
      type: 'integer',
      defaultValue: 3,
    });
  });

  it('defaults maxScore to 1 when no maxScore field is present', () => {
    const result = ensureMaxScore({});
    expect(result.outcomeDeclaration.maxScore.defaultValue).toBe(1);
  });

  it('recomputes from an existing outcomeDeclaration.maxScore.defaultValue, preserving its value', () => {
    // ensureMaxScore now aliases applyMaxScore, which always recomputes (rather
    // than skipping when a maxScore object is already present) so the top-level
    // `maxScore` mirror is never allowed to silently disagree with it.
    const existing = { cardinality: 'single', type: 'integer', defaultValue: 9 };
    const result = ensureMaxScore({ outcomeDeclaration: { maxScore: existing } });
    expect(result.outcomeDeclaration.maxScore.defaultValue).toBe(9);
    expect(result.maxScore).toBe(9);
  });

  it('normalises a stringified outcomeDeclaration into an object (no throw)', () => {
    const metadata = {
      outcomeDeclaration: JSON.stringify({ maxScore: { defaultValue: 5 } }),
    };
    const result = ensureMaxScore(metadata);
    expect(typeof result.outcomeDeclaration).toBe('object');
    expect(result.outcomeDeclaration.maxScore.defaultValue).toBe(5);
  });

  it('recovers to an object when outcomeDeclaration is an unparseable string', () => {
    const result = ensureMaxScore({ outcomeDeclaration: 'not json', maxScore: 2 });
    expect(typeof result.outcomeDeclaration).toBe('object');
    expect(result.outcomeDeclaration.maxScore.defaultValue).toBe(2);
  });
});
