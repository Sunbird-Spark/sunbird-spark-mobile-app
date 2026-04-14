import { describe, it, expect } from 'vitest';
import { buildCollectionCdata, buildObjectRollup } from './collectionTelemetryContext';
import type { HierarchyContentNode } from '../../types/collectionTypes';

describe('collectionTelemetryContext', () => {
  describe('buildCollectionCdata', () => {
    it('should return both course and batch cdata when both provided', () => {
      const result = buildCollectionCdata('collection-1', 'batch-1');

      expect(result).toEqual([
        { id: 'collection-1', type: 'course' },
        { id: 'batch-1', type: 'batch' },
      ]);
    });

    it('should return only course cdata when batchId is undefined', () => {
      const result = buildCollectionCdata('collection-1', undefined);

      expect(result).toEqual([{ id: 'collection-1', type: 'course' }]);
    });

    it('should return only batch cdata when collectionId is undefined', () => {
      const result = buildCollectionCdata(undefined, 'batch-1');

      expect(result).toEqual([{ id: 'batch-1', type: 'batch' }]);
    });

    it('should return empty array when both are undefined', () => {
      const result = buildCollectionCdata(undefined, undefined);

      expect(result).toEqual([]);
    });

    it('should return empty array when called with no arguments', () => {
      const result = buildCollectionCdata();

      expect(result).toEqual([]);
    });

    it('should skip empty string collectionId', () => {
      const result = buildCollectionCdata('', 'batch-1');

      expect(result).toEqual([{ id: 'batch-1', type: 'batch' }]);
    });
  });

  describe('buildObjectRollup', () => {
    const makeHierarchy = (): HierarchyContentNode => ({
      identifier: 'root',
      children: [
        {
          identifier: 'unit-1',
          children: [
            {
              identifier: 'sub-unit-1',
              children: [{ identifier: 'content-1' }],
            },
          ],
        },
        {
          identifier: 'unit-2',
          children: [{ identifier: 'content-2' }],
        },
      ],
    });

    it('should return ancestor rollup for deeply nested content', () => {
      const result = buildObjectRollup(makeHierarchy(), 'content-1');

      expect(result).toEqual({
        l1: 'root',
        l2: 'unit-1',
        l3: 'sub-unit-1',
      });
    });

    it('should return correct rollup for content at second level', () => {
      const result = buildObjectRollup(makeHierarchy(), 'content-2');

      expect(result).toEqual({
        l1: 'root',
        l2: 'unit-2',
      });
    });

    it('should return empty rollup for root node itself', () => {
      const result = buildObjectRollup(makeHierarchy(), 'root');

      expect(result).toEqual({});
    });

    it('should return empty object when hierarchyRoot is undefined', () => {
      const result = buildObjectRollup(undefined, 'content-1');

      expect(result).toEqual({});
    });

    it('should return empty object when contentId is undefined', () => {
      const result = buildObjectRollup(makeHierarchy(), undefined);

      expect(result).toEqual({});
    });

    it('should return empty object when contentId not found', () => {
      const result = buildObjectRollup(makeHierarchy(), 'nonexistent');

      expect(result).toEqual({});
    });

    it('should limit rollup to max 4 levels', () => {
      const deep: HierarchyContentNode = {
        identifier: 'l0',
        children: [{
          identifier: 'l1',
          children: [{
            identifier: 'l2',
            children: [{
              identifier: 'l3',
              children: [{
                identifier: 'l4',
                children: [{ identifier: 'target' }],
              }],
            }],
          }],
        }],
      };

      const result = buildObjectRollup(deep, 'target');

      expect(Object.keys(result)).toHaveLength(4);
      expect(result.l1).toBe('l0');
      expect(result.l2).toBe('l1');
      expect(result.l3).toBe('l2');
      expect(result.l4).toBe('l3');
      expect(result).not.toHaveProperty('l5');
    });
  });
});
