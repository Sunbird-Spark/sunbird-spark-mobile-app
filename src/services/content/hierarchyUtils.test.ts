import { describe, it, expect } from 'vitest';
import type { HierarchyContentNode } from '../../types/collectionTypes';
import {
  isCollectionNode,
  isDownloadable,
  flattenLeafNodes,
  calculateDownloadSize,
  filterHierarchyTree,
  formatBytes,
} from './hierarchyUtils';

const COLLECTION_MIME = 'application/vnd.ekstep.content-collection';

// ── Helpers to build test nodes ──

function makeLeaf(id: string, overrides?: Partial<HierarchyContentNode>): HierarchyContentNode {
  return {
    identifier: id,
    name: `Leaf ${id}`,
    mimeType: 'application/pdf',
    downloadUrl: `https://cdn.example.com/${id}.ecar`,
    size: 1000,
    pkgVersion: 1,
    ...overrides,
  };
}

function makeUnit(id: string, children: HierarchyContentNode[]): HierarchyContentNode {
  return {
    identifier: id,
    name: `Unit ${id}`,
    mimeType: COLLECTION_MIME,
    children,
  };
}

// ── Tests ──

describe('isCollectionNode', () => {
  it('returns true for collection mime type', () => {
    expect(isCollectionNode(makeUnit('u1', []))).toBe(true);
  });

  it('returns false for leaf nodes', () => {
    expect(isCollectionNode(makeLeaf('l1'))).toBe(false);
  });

  it('handles undefined mimeType', () => {
    expect(isCollectionNode({ identifier: 'x' })).toBe(false);
  });
});

describe('isDownloadable', () => {
  it('returns true for a normal leaf with downloadUrl', () => {
    expect(isDownloadable(makeLeaf('l1'))).toBe(true);
  });

  it('returns false when downloadUrl is missing', () => {
    expect(isDownloadable(makeLeaf('l1', { downloadUrl: undefined }))).toBe(false);
  });

  it('returns false for YouTube streaming content', () => {
    expect(
      isDownloadable(makeLeaf('l1', { mimeType: 'video/x-youtube' })),
    ).toBe(false);
  });

  it('returns false for external URL content', () => {
    expect(
      isDownloadable(makeLeaf('l1', { mimeType: 'text/x-url' })),
    ).toBe(false);
  });

  it('returns false for questionset content', () => {
    expect(
      isDownloadable(makeLeaf('l1', { mimeType: 'application/vnd.sunbird.questionset' })),
    ).toBe(false);
  });
});

describe('flattenLeafNodes', () => {
  it('returns empty array for empty input', () => {
    expect(flattenLeafNodes([])).toEqual([]);
  });

  it('returns leaf nodes directly from top level', () => {
    const leaves = flattenLeafNodes([makeLeaf('a'), makeLeaf('b')]);
    expect(leaves.map((l) => l.identifier)).toEqual(['a', 'b']);
  });

  it('extracts leaves from nested units', () => {
    const tree = [
      makeUnit('u1', [makeLeaf('a'), makeLeaf('b')]),
      makeUnit('u2', [makeLeaf('c')]),
    ];
    const leaves = flattenLeafNodes(tree);
    expect(leaves.map((l) => l.identifier)).toEqual(['a', 'b', 'c']);
  });

  it('handles 3+ levels of nesting', () => {
    const tree = [
      makeUnit('u1', [
        makeUnit('sub1', [makeLeaf('a'), makeLeaf('b')]),
        makeLeaf('c'),
      ]),
    ];
    const leaves = flattenLeafNodes(tree);
    expect(leaves.map((l) => l.identifier)).toEqual(['a', 'b', 'c']);
  });

  it('skips empty units', () => {
    const tree = [makeUnit('u1', []), makeUnit('u2', [makeLeaf('a')])];
    expect(flattenLeafNodes(tree).map((l) => l.identifier)).toEqual(['a']);
  });
});

describe('calculateDownloadSize', () => {
  it('sums sizes of downloadable non-local leaves', () => {
    const tree = [
      makeUnit('u1', [
        makeLeaf('a', { size: 500 }),
        makeLeaf('b', { size: 1500 }),
      ]),
    ];
    const result = calculateDownloadSize(tree, new Set());
    expect(result.totalBytes).toBe(2000);
    expect(result.downloadableCount).toBe(2);
    expect(result.alreadyLocalCount).toBe(0);
  });

  it('excludes already-local items', () => {
    const tree = [
      makeUnit('u1', [
        makeLeaf('a', { size: 500 }),
        makeLeaf('b', { size: 1500 }),
      ]),
    ];
    const localSet = new Set(['a']);
    const result = calculateDownloadSize(tree, localSet);
    expect(result.totalBytes).toBe(1500);
    expect(result.downloadableCount).toBe(1);
    expect(result.alreadyLocalCount).toBe(1);
  });

  it('excludes non-downloadable items', () => {
    const tree = [
      makeUnit('u1', [
        makeLeaf('a', { size: 500 }),
        makeLeaf('b', { size: 1000, downloadUrl: undefined }),
        makeLeaf('c', { size: 800, mimeType: 'video/x-youtube' }),
      ]),
    ];
    const result = calculateDownloadSize(tree, new Set());
    expect(result.totalBytes).toBe(500);
    expect(result.downloadableCount).toBe(1);
  });

  it('handles missing size as 0', () => {
    const tree = [makeLeaf('a', { size: undefined })];
    const result = calculateDownloadSize(tree, new Set());
    expect(result.totalBytes).toBe(0);
    expect(result.downloadableCount).toBe(1);
  });
});

describe('filterHierarchyTree', () => {
  it('returns only leaves present in localIdentifiers', () => {
    const tree = [
      makeUnit('u1', [makeLeaf('a'), makeLeaf('b')]),
      makeUnit('u2', [makeLeaf('c')]),
    ];
    const filtered = filterHierarchyTree(tree, new Set(['a', 'c']));
    expect(filtered.length).toBe(2);
    expect(filtered[0].children?.map((c) => c.identifier)).toEqual(['a']);
    expect(filtered[1].children?.map((c) => c.identifier)).toEqual(['c']);
  });

  it('prunes empty units', () => {
    const tree = [
      makeUnit('u1', [makeLeaf('a')]),
      makeUnit('u2', [makeLeaf('b')]),
    ];
    const filtered = filterHierarchyTree(tree, new Set(['a']));
    expect(filtered.length).toBe(1);
    expect(filtered[0].identifier).toBe('u1');
  });

  it('returns empty array when no content is local', () => {
    const tree = [makeUnit('u1', [makeLeaf('a')])];
    expect(filterHierarchyTree(tree, new Set())).toEqual([]);
  });

  it('handles deeply nested structures', () => {
    const tree = [
      makeUnit('u1', [
        makeUnit('sub1', [makeLeaf('a'), makeLeaf('b')]),
        makeUnit('sub2', [makeLeaf('c')]),
      ]),
    ];
    const filtered = filterHierarchyTree(tree, new Set(['b']));
    expect(filtered.length).toBe(1);
    expect(filtered[0].children?.length).toBe(1);
    expect(filtered[0].children?.[0].identifier).toBe('sub1');
    expect(filtered[0].children?.[0].children?.length).toBe(1);
    expect(filtered[0].children?.[0].children?.[0].identifier).toBe('b');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes with decimal', () => {
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2 GB');
  });
});
