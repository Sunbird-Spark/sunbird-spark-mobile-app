import { describe, expect, it } from 'vitest';
import {
  buildCourseContextId,
  buildCourseSummaryMapForContext,
  getCourseContextId,
  getOptionalNodeIds,
  getPathSummary,
  indexSummaryByCollectionId,
  normaliseSummaryReadRecord,
  normaliseSummaryRecords,
  parseCourseContextId,
} from './summaryMapper';
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

describe('normaliseSummaryRecords', () => {
  it('reads the spec shape (summary[] with collectionId/contextId) unchanged', () => {
    const recs = normaliseSummaryRecords({
      summary: [record({ collectionId: 'lp1', contextId: 'ctx1' })],
    });
    expect(recs).toEqual([expect.objectContaining({ collectionId: 'lp1', contextId: 'ctx1' })]);
  });

  it('reads the live shape (response[] with courseId/batchId) and normalises it', () => {
    const recs = normaliseSummaryRecords({
      response: [record({ courseId: 'lp1', batchId: 'ctx1' })],
    });
    expect(recs[0].collectionId).toBe('lp1');
    expect(recs[0].contextId).toBe('ctx1');
  });

  it('prefers the spec field when both are present', () => {
    const recs = normaliseSummaryRecords({
      summary: [record({ collectionId: 'lp1', courseId: 'legacy', contextId: 'ctx1', batchId: 'legacyctx' })],
    });
    expect(recs[0].collectionId).toBe('lp1');
    expect(recs[0].contextId).toBe('ctx1');
  });

  it('returns an empty array for a null/undefined response', () => {
    expect(normaliseSummaryRecords(null)).toEqual([]);
    expect(normaliseSummaryRecords(undefined)).toEqual([]);
  });

  it('defaults optionalNodes to [] when the record carries neither spelling', () => {
    const recs = normaliseSummaryRecords({ summary: [record({ collectionId: 'lp1' })] });
    expect(recs[0].optionalNodes).toEqual([]);
  });

  it('normalises the live snake_case optional_nodes', () => {
    const recs = normaliseSummaryRecords({ response: [record({ optional_nodes: ['leaf_a', 'leaf_b'] })] });
    expect(recs[0].optionalNodes).toEqual(['leaf_a', 'leaf_b']);
  });

  it('prefers an already-normalised optionalNodes over optional_nodes', () => {
    const recs = normaliseSummaryRecords({
      summary: [record({ optionalNodes: ['normalised'], optional_nodes: ['legacy'] })],
    });
    expect(recs[0].optionalNodes).toEqual(['normalised']);
  });
});

describe('normaliseSummaryReadRecord', () => {
  it('normalises the live single-record shape', () => {
    const rec = normaliseSummaryReadRecord({ response: record({ courseId: 'lp1', batchId: 'ctx1' }) });
    expect(rec?.collectionId).toBe('lp1');
    expect(rec?.contextId).toBe('ctx1');
  });

  it('returns undefined when neither summary nor response is present', () => {
    expect(normaliseSummaryReadRecord({})).toBeUndefined();
    expect(normaliseSummaryReadRecord(null)).toBeUndefined();
  });

  it('normalises optional_nodes and defaults it to []', () => {
    expect(normaliseSummaryReadRecord({ response: record({ optional_nodes: ['leaf_a'] })})?.optionalNodes).toEqual([
      'leaf_a',
    ]);
    expect(normaliseSummaryReadRecord({ response: record({}) })?.optionalNodes).toEqual([]);
  });
});

describe('getOptionalNodeIds', () => {
  it('is empty for an undefined path record', () => {
    expect(getOptionalNodeIds(undefined).size).toBe(0);
  });

  it('reads the path record alone', () => {
    const ids = getOptionalNodeIds(record({ optionalNodes: ['a', 'b'] }));
    expect([...ids].sort()).toEqual(['a', 'b']);
  });

  it('unions the path record with every per-course fan-out record', () => {
    const courses = new Map<string, ViewerSummaryRecord>([
      ['c1', record({ optionalNodes: ['b', 'c'] })],
      ['c2', record({ optionalNodes: ['d'] })],
      ['c3', record({})],
    ]);
    const ids = getOptionalNodeIds(record({ optionalNodes: ['a', 'b'] }), courses);
    expect([...ids].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('indexSummaryByCollectionId', () => {
  it('indexes by collectionId, later records winning on duplicate keys', () => {
    const map = indexSummaryByCollectionId([
      record({ collectionId: 'c1', progress: 10 }),
      record({ collectionId: 'c1', progress: 90 }),
    ]);
    expect(map.get('c1')?.progress).toBe(90);
  });

  it('skips records with no collectionId', () => {
    const map = indexSummaryByCollectionId([record({})]);
    expect(map.size).toBe(0);
  });
});

describe('buildCourseSummaryMapForContext', () => {
  it('returns an empty map when lpContextId is undefined', () => {
    expect(buildCourseSummaryMapForContext([record({ collectionId: 'c1', contextId: 'lp1:c1' })], undefined).size).toBe(
      0
    );
  });

  it('includes only records whose contextId is scoped to this lpContextId', () => {
    const map = buildCourseSummaryMapForContext(
      [
        record({ collectionId: 'c1', contextId: 'lp1:c1' }),
        record({ collectionId: 'c2', contextId: 'lp2:c2' }), // different path
      ],
      'lp1'
    );
    expect(map.has('c1')).toBe(true);
    expect(map.has('c2')).toBe(false);
  });

  it('excludes an unrelated standalone enrolment of the same course id (unenrolled-path leak guard)', () => {
    const map = buildCourseSummaryMapForContext(
      [record({ collectionId: 'c1', contextId: 'someOtherBatch' })],
      'lp1'
    );
    expect(map.has('c1')).toBe(false);
  });
});

describe('getPathSummary', () => {
  it('returns undefined when pathId is undefined or there is no match', () => {
    expect(getPathSummary([record({ collectionId: 'lp1' })], undefined)).toBeUndefined();
    expect(getPathSummary([record({ collectionId: 'lp1' })], 'lp2')).toBeUndefined();
  });

  it('returns the single match directly', () => {
    const rec = record({ collectionId: 'lp1', contextId: 'ctxA' });
    expect(getPathSummary([rec], 'lp1')).toBe(rec);
  });

  it('prefers an exact contextId match among several enrolments of the same path', () => {
    const a = record({ collectionId: 'lp1', contextId: 'ctxA' });
    const b = record({ collectionId: 'lp1', contextId: 'ctxB' });
    expect(getPathSummary([a, b], 'lp1', 'ctxB')).toBe(b);
  });

  it('prefers the record whose contextId is the prefix of an existing fan-out record', () => {
    const a = record({ collectionId: 'lp1', contextId: 'ctxA' });
    const b = record({ collectionId: 'lp1', contextId: 'ctxB' });
    const fanOut = record({ collectionId: 'course1', contextId: 'ctxB:course1' });
    expect(getPathSummary([a, b, fanOut], 'lp1')).toBe(b);
  });

  it('falls back to the most recently enrolled record', () => {
    const older = record({ collectionId: 'lp1', contextId: 'ctxA', enrolledDate: '2024-01-01' });
    const newer = record({ collectionId: 'lp1', contextId: 'ctxB', enrolledDate: '2024-06-01' });
    expect(getPathSummary([older, newer], 'lp1')).toBe(newer);
  });
});

describe('buildCourseContextId / getCourseContextId', () => {
  it('buildCourseContextId concatenates lpContextId and courseId with a colon', () => {
    expect(buildCourseContextId('lp1', 'c1')).toBe('lp1:c1');
  });

  it('getCourseContextId falls back to the constructed id when no fan-out record exists', () => {
    expect(getCourseContextId([], 'lp1', 'c1')).toBe('lp1:c1');
  });

  it('getCourseContextId prefers the actual fan-out record scoped to this lpContextId', () => {
    const records = [record({ collectionId: 'c1', contextId: 'lp1:c1' })];
    expect(getCourseContextId(records, 'lp1', 'c1')).toBe('lp1:c1');
  });

  it('getCourseContextId does not blindly construct an id that points at a batch with no fan-out record', () => {
    // course c1 was fanned out under a DIFFERENT lp context than the one being asked about
    const records = [record({ collectionId: 'c1', contextId: 'lp2:c1' })];
    expect(getCourseContextId(records, 'lp1', 'c1')).toBe('lp2:c1');
  });
});

describe('parseCourseContextId', () => {
  it('splits a composite context id into its parts', () => {
    expect(parseCourseContextId('lp1:c1')).toEqual({ lpContextId: 'lp1', courseId: 'c1' });
  });

  it('returns null for a plain (non-composite) context id', () => {
    expect(parseCourseContextId('plainBatch')).toBeNull();
  });

  it('returns null for null/undefined input', () => {
    expect(parseCourseContextId(null)).toBeNull();
    expect(parseCourseContextId(undefined)).toBeNull();
  });
});
