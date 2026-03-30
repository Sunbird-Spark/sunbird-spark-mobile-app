import { describe, it, expect } from 'vitest';
import {
  getLeafContentIds,
  getLeafNodes,
  getEnrollmentForCollection,
  getContentStatusMap,
  getCourseProgressProps,
  getEnrollableBatches,
  getFirstCertPreviewUrl,
  isSelfAssess,
  getContentAttemptInfoMap,
  getNextContent,
} from './enrollmentMapper';
import type {
  HierarchyContentNode,
  TrackableCollection,
  ContentStateItem,
  BatchListItem,
} from '../../types/collectionTypes';

describe('enrollmentMapper', () => {
  describe('getLeafContentIds', () => {
    it('should return leaf content IDs from a flat hierarchy', () => {
      const node: HierarchyContentNode = {
        identifier: 'root',
        children: [
          { identifier: 'content-1', mimeType: 'video/mp4' },
          { identifier: 'content-2', mimeType: 'application/pdf' },
        ],
      };

      expect(getLeafContentIds(node)).toEqual(['content-1', 'content-2']);
    });

    it('should recursively extract leaf IDs from nested hierarchy', () => {
      const node: HierarchyContentNode = {
        identifier: 'root',
        children: [
          {
            identifier: 'unit-1',
            children: [
              { identifier: 'content-1', mimeType: 'video/mp4' },
              { identifier: 'content-2', mimeType: 'application/pdf' },
            ],
          },
          {
            identifier: 'unit-2',
            children: [{ identifier: 'content-3', mimeType: 'video/mp4' }],
          },
        ],
      };

      expect(getLeafContentIds(node)).toEqual(['content-1', 'content-2', 'content-3']);
    });

    it('should skip collection MIME type nodes', () => {
      const node: HierarchyContentNode = {
        identifier: 'root',
        children: [
          { identifier: 'content-1', mimeType: 'video/mp4' },
          { identifier: 'empty-unit', mimeType: 'application/vnd.ekstep.content-collection' },
        ],
      };

      expect(getLeafContentIds(node)).toEqual(['content-1']);
    });

    it('should return identifier for single leaf node', () => {
      const node: HierarchyContentNode = { identifier: 'leaf-1', mimeType: 'video/mp4' };

      expect(getLeafContentIds(node)).toEqual(['leaf-1']);
    });

    it('should return empty array for collection leaf without children', () => {
      const node: HierarchyContentNode = {
        identifier: 'unit',
        mimeType: 'application/vnd.ekstep.content-collection',
      };

      expect(getLeafContentIds(node)).toEqual([]);
    });
  });

  describe('getLeafNodes', () => {
    it('should return the full node object for a leaf', () => {
      const node: HierarchyContentNode = {
        identifier: 'l1',
        mimeType: 'video/mp4',
        maxAttempts: 3,
        name: 'Quiz 1',
      };
      const nodes = getLeafNodes(node);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].maxAttempts).toBe(3);
      expect(nodes[0].name).toBe('Quiz 1');
    });

    it('should recursively extract all leaf nodes from a tree', () => {
      const tree: HierarchyContentNode = {
        identifier: 'root',
        children: [
          {
            identifier: 'unit-1',
            children: [
              { identifier: 'l1', mimeType: 'video/mp4', maxAttempts: 2 },
              { identifier: 'l2', mimeType: 'application/pdf' },
            ],
          },
        ],
      };
      const nodes = getLeafNodes(tree);
      expect(nodes).toHaveLength(2);
      expect(nodes.find((n) => n.identifier === 'l1')?.maxAttempts).toBe(2);
      expect(nodes.find((n) => n.identifier === 'l2')?.identifier).toBe('l2');
    });

    it('should skip collection-mime nodes', () => {
      const node: HierarchyContentNode = {
        identifier: 'unit',
        mimeType: 'application/vnd.ekstep.content-collection',
      };
      expect(getLeafNodes(node)).toEqual([]);
    });

    it('IDs from getLeafNodes match IDs from getLeafContentIds', () => {
      const tree: HierarchyContentNode = {
        identifier: 'root',
        children: [
          { identifier: 'l1', mimeType: 'video/mp4' },
          { identifier: 'l2', mimeType: 'application/pdf' },
        ],
      };
      const nodeIds = getLeafNodes(tree).map((n) => n.identifier).sort();
      const leafIds = getLeafContentIds(tree).sort();
      expect(nodeIds).toEqual(leafIds);
    });
  });

  describe('getEnrollmentForCollection', () => {
    const enrollments: TrackableCollection[] = [
      { courseId: 'course-1', batchId: 'b1', userId: 'u1' },
      { contentId: 'course-2', batchId: 'b2', userId: 'u1' },
      { collectionId: 'course-3', batchId: 'b3', userId: 'u1' },
    ];

    it('should find enrollment by courseId', () => {
      const result = getEnrollmentForCollection(enrollments, 'course-1');
      expect(result?.batchId).toBe('b1');
    });

    it('should find enrollment by contentId', () => {
      const result = getEnrollmentForCollection(enrollments, 'course-2');
      expect(result?.batchId).toBe('b2');
    });

    it('should find enrollment by collectionId', () => {
      const result = getEnrollmentForCollection(enrollments, 'course-3');
      expect(result?.batchId).toBe('b3');
    });

    it('should return undefined when not found', () => {
      const result = getEnrollmentForCollection(enrollments, 'nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty enrollments', () => {
      const result = getEnrollmentForCollection([], 'course-1');
      expect(result).toBeUndefined();
    });
  });

  describe('getContentStatusMap', () => {
    it('should map contentId to status', () => {
      const contentList: ContentStateItem[] = [
        { contentId: 'c1', status: 2 },
        { contentId: 'c2', status: 1 },
        { contentId: 'c3', status: 0 },
      ];

      expect(getContentStatusMap(contentList)).toEqual({ c1: 2, c2: 1, c3: 0 });
    });

    it('should skip items with null/undefined status', () => {
      const contentList: ContentStateItem[] = [
        { contentId: 'c1', status: 2 },
        { contentId: 'c2' },
      ];

      const result = getContentStatusMap(contentList);
      expect(result).toEqual({ c1: 2 });
      expect(result.c2).toBeUndefined();
    });

    it('should return empty object for empty array', () => {
      expect(getContentStatusMap([])).toEqual({});
    });
  });

  describe('getCourseProgressProps', () => {
    it('should calculate correct progress metrics', () => {
      const leafIds = ['c1', 'c2', 'c3', 'c4'];
      const statusMap = { c1: 2, c2: 2, c3: 1, c4: 0 };

      const result = getCourseProgressProps(leafIds, statusMap);

      expect(result).toEqual({ total: 4, completed: 2, percentage: 50 });
    });

    it('should return 100% when all completed', () => {
      const leafIds = ['c1', 'c2'];
      const statusMap = { c1: 2, c2: 2 };

      expect(getCourseProgressProps(leafIds, statusMap).percentage).toBe(100);
    });

    it('should return 0% when none completed', () => {
      const leafIds = ['c1', 'c2'];
      const statusMap = { c1: 1, c2: 0 };

      expect(getCourseProgressProps(leafIds, statusMap).percentage).toBe(0);
    });

    it('should return 0% for empty leaf IDs', () => {
      const result = getCourseProgressProps([], {});

      expect(result).toEqual({ total: 0, completed: 0, percentage: 0 });
    });

    it('should handle missing content IDs in status map', () => {
      const leafIds = ['c1', 'c2', 'c3'];
      const statusMap = { c1: 2 };

      const result = getCourseProgressProps(leafIds, statusMap);

      expect(result).toEqual({ total: 3, completed: 1, percentage: 33 });
    });
  });

  describe('getEnrollableBatches', () => {
    it('should return only ongoing batches with open enrollment', () => {
      const batches: BatchListItem[] = [
        { identifier: 'b1', status: 1, enrollmentEndDate: '2099-12-31' },
        { identifier: 'b2', status: 0, enrollmentEndDate: '2099-12-31' }, // upcoming
        { identifier: 'b3', status: 2 }, // expired
        { identifier: 'b4', status: 1, enrollmentEndDate: '2020-01-01' }, // enrollment closed
      ];

      const result = getEnrollableBatches(batches);

      expect(result).toHaveLength(1);
      expect(result[0].identifier).toBe('b1');
    });

    it('should include ongoing batches with null enrollmentEndDate', () => {
      const batches: BatchListItem[] = [
        { identifier: 'b1', status: 1, enrollmentEndDate: null },
      ];

      const result = getEnrollableBatches(batches);

      expect(result).toHaveLength(1);
    });

    it('should include ongoing batches without enrollmentEndDate', () => {
      const batches: BatchListItem[] = [
        { identifier: 'b1', status: 1 },
      ];

      const result = getEnrollableBatches(batches);

      expect(result).toHaveLength(1);
    });

    it('should return empty array for empty input', () => {
      expect(getEnrollableBatches([])).toEqual([]);
    });
  });

  describe('getFirstCertPreviewUrl', () => {
    it('should return the previewUrl of the first cert template', () => {
      const templates = {
        tpl1: { previewUrl: 'https://example.com/cert1.svg' },
        tpl2: { previewUrl: 'https://example.com/cert2.svg' },
      };

      expect(getFirstCertPreviewUrl(templates)).toBe('https://example.com/cert1.svg');
    });

    it('should return undefined when no templates', () => {
      expect(getFirstCertPreviewUrl(undefined)).toBeUndefined();
    });

    it('should return undefined when templates object is empty', () => {
      expect(getFirstCertPreviewUrl({})).toBeUndefined();
    });

    it('should return undefined when first template has no previewUrl', () => {
      const templates = { tpl1: {} };

      expect(getFirstCertPreviewUrl(templates)).toBeUndefined();
    });
  });

  describe('isSelfAssess', () => {
    it('should return true for SelfAssess contentType', () => {
      expect(isSelfAssess({ identifier: 'id', contentType: 'SelfAssess' })).toBe(true);
    });

    it('should return false for other contentType', () => {
      expect(isSelfAssess({ identifier: 'id', contentType: 'Resource' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isSelfAssess(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSelfAssess(undefined)).toBe(false);
    });
  });

  describe('getContentAttemptInfoMap', () => {
    it('should map contentId to attempt info with best score', () => {
      const contentList: ContentStateItem[] = [
        {
          contentId: 'c1',
          score: [
            { totalScore: 5, totalMaxScore: 10 },
            { totalScore: 8, totalMaxScore: 10 },
          ],
        },
      ];

      const result = getContentAttemptInfoMap(contentList);

      expect(result.c1).toEqual({
        attemptCount: 2,
        bestScore: { totalScore: 8, totalMaxScore: 10 },
      });
    });

    it('should set attemptCount to 0 when score is not an array', () => {
      const contentList: ContentStateItem[] = [
        { contentId: 'c1' },
      ];

      const result = getContentAttemptInfoMap(contentList);

      expect(result.c1).toEqual({ attemptCount: 0 });
    });

    it('should handle empty score array', () => {
      const contentList: ContentStateItem[] = [
        { contentId: 'c1', score: [] },
      ];

      const result = getContentAttemptInfoMap(contentList);

      expect(result.c1).toEqual({ attemptCount: 0 });
    });

    it('should skip items with null contentId', () => {
      const contentList: ContentStateItem[] = [
        { contentId: null as any },
      ];

      const result = getContentAttemptInfoMap(contentList);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should return empty map for empty array', () => {
      expect(getContentAttemptInfoMap([])).toEqual({});
    });

    it('should keep all scores when count is within maxAttempts', () => {
      const contentList: ContentStateItem[] = [
        {
          contentId: 'c1',
          score: [
            { attemptId: 'a1', totalScore: 3, totalMaxScore: 5 },
            { attemptId: 'a2', totalScore: 4, totalMaxScore: 5 },
          ],
        },
      ];
      const result = getContentAttemptInfoMap(contentList, { c1: 4 });
      expect(result.c1.attemptCount).toBe(2); // under cap, no trimming
    });

    it('should cap to top-N by totalScore when count exceeds maxAttempts', () => {
      const contentList: ContentStateItem[] = [
        {
          contentId: 'c1',
          score: [
            { attemptId: 'a1', totalScore: 1, totalMaxScore: 5 },
            { attemptId: 'a2', totalScore: 5, totalMaxScore: 5 },
            { attemptId: 'a3', totalScore: 3, totalMaxScore: 5 },
            { attemptId: 'a4', totalScore: 4, totalMaxScore: 5 },
            { attemptId: 'a5', totalScore: 2, totalMaxScore: 5 },
          ],
        },
      ];
      const result = getContentAttemptInfoMap(contentList, { c1: 3 });
      // Keep top-3: a2(5), a4(4), a3(3) — a1 and a5 dropped
      expect(result.c1.attemptCount).toBe(3);
      expect(result.c1.bestScore?.totalScore).toBe(5);
    });

    it('local=3 + network=4 scores (6 unique) capped to maxAttempts=4', () => {
      const mergedScores = [
        { attemptId: 'local-1',  totalScore: 1, totalMaxScore: 5 },
        { attemptId: 'local-2',  totalScore: 2, totalMaxScore: 5 },
        { attemptId: 'local-3',  totalScore: 3, totalMaxScore: 5 },
        { attemptId: 'server-1', totalScore: 5, totalMaxScore: 5 },
        { attemptId: 'server-2', totalScore: 4, totalMaxScore: 5 },
        { attemptId: 'server-3', totalScore: 0, totalMaxScore: 5 },
      ];
      const contentList: ContentStateItem[] = [{ contentId: 'c1', score: mergedScores }];
      const result = getContentAttemptInfoMap(contentList, { c1: 4 });
      // top-4: server-1(5), server-2(4), local-3(3), local-2(2)
      expect(result.c1.attemptCount).toBe(4);
      expect(result.c1.bestScore?.totalScore).toBe(5);
    });

    it('should not cap when maxAttempts is 0 (unlimited)', () => {
      const contentList: ContentStateItem[] = [
        {
          contentId: 'c1',
          score: [
            { attemptId: 'a1', totalScore: 1, totalMaxScore: 5 },
            { attemptId: 'a2', totalScore: 2, totalMaxScore: 5 },
          ],
        },
      ];
      const result = getContentAttemptInfoMap(contentList, { c1: 0 });
      expect(result.c1.attemptCount).toBe(2);
    });

    it('should not cap content not in maxAttemptsMap', () => {
      const contentList: ContentStateItem[] = [
        {
          contentId: 'c1',
          score: [
            { attemptId: 'a1', totalScore: 1, totalMaxScore: 5 },
            { attemptId: 'a2', totalScore: 2, totalMaxScore: 5 },
            { attemptId: 'a3', totalScore: 3, totalMaxScore: 5 },
          ],
        },
      ];
      // c1 is not in the maxAttemptsMap; c2 is but has no scores
      const result = getContentAttemptInfoMap(contentList, { c2: 2 });
      expect(result.c1.attemptCount).toBe(3);
    });

    it('should handle score entries without totalScore/totalMaxScore', () => {
      const contentList: ContentStateItem[] = [
        { contentId: 'c1', score: [{ someOther: 'data' }] },
      ];

      const result = getContentAttemptInfoMap(contentList);

      expect(result.c1).toEqual({ attemptCount: 1 });
      expect(result.c1.bestScore).toBeUndefined();
    });
  });

  describe('getNextContent', () => {
    const hierarchy: HierarchyContentNode = {
      identifier: 'root',
      children: [
        {
          identifier: 'unit-1',
          children: [
            { identifier: 'c1', mimeType: 'video/mp4' },
            { identifier: 'c2', mimeType: 'video/mp4' },
          ],
        },
        {
          identifier: 'unit-2',
          children: [
            { identifier: 'c3', mimeType: 'application/pdf' },
          ],
        },
      ],
    };

    it('should return first incomplete content', () => {
      const statusMap = { c1: 2, c2: 1, c3: 0 };

      const result = getNextContent(hierarchy, statusMap);

      expect(result?.identifier).toBe('c2');
    });

    it('should return first content when nothing is completed', () => {
      const statusMap: Record<string, number> = {};

      const result = getNextContent(hierarchy, statusMap);

      expect(result?.identifier).toBe('c1');
    });

    it('should return null when all content is completed', () => {
      const statusMap = { c1: 2, c2: 2, c3: 2 };

      const result = getNextContent(hierarchy, statusMap);

      expect(result).toBeNull();
    });

    it('should skip completed content and find next in different unit', () => {
      const statusMap = { c1: 2, c2: 2, c3: 0 };

      const result = getNextContent(hierarchy, statusMap);

      expect(result?.identifier).toBe('c3');
    });

    it('should handle single leaf node that is incomplete', () => {
      const leaf: HierarchyContentNode = { identifier: 'leaf', mimeType: 'video/mp4' };

      const result = getNextContent(leaf, {});

      expect(result?.identifier).toBe('leaf');
    });

    it('should return null for single completed leaf node', () => {
      const leaf: HierarchyContentNode = { identifier: 'leaf', mimeType: 'video/mp4' };

      const result = getNextContent(leaf, { leaf: 2 });

      expect(result).toBeNull();
    });
  });
});
