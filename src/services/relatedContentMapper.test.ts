import { describe, expect, it } from 'vitest';
import { mapSearchContentToRelatedContentItems } from './relatedContentMapper';
import type { ContentSearchItem } from '../types/contentTypes';

const COLLECTION_MIME = 'application/vnd.ekstep.content-collection';

const makeItem = (overrides: Partial<ContentSearchItem> = {}): ContentSearchItem => ({
  identifier: 'do_1',
  name: 'Test Item',
  visibility: 'default',
  mimeType: 'application/pdf',
  ...overrides,
});

describe('mapSearchContentToRelatedContentItems', () => {
  it('returns empty array when items is undefined', () => {
    expect(mapSearchContentToRelatedContentItems(undefined)).toEqual([]);
  });

  it('returns empty array when items is empty', () => {
    expect(mapSearchContentToRelatedContentItems([])).toEqual([]);
  });

  it('filters out items with non-default visibility', () => {
    const items = [
      makeItem({ identifier: 'do_1', visibility: 'default' }),
      makeItem({ identifier: 'do_2', visibility: 'parent' }),
    ];
    const result = mapSearchContentToRelatedContentItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].identifier).toBe('do_1');
  });

  it('filters out items with a parent', () => {
    const items = [
      makeItem({ identifier: 'do_1' }),
      makeItem({ identifier: 'do_2', parent: 'do_parent' }),
    ];
    const result = mapSearchContentToRelatedContentItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].identifier).toBe('do_1');
  });

  it('excludes item matching excludeId', () => {
    const items = [
      makeItem({ identifier: 'do_1' }),
      makeItem({ identifier: 'do_2' }),
    ];
    const result = mapSearchContentToRelatedContentItems(items, 'do_1');
    expect(result).toHaveLength(1);
    expect(result[0].identifier).toBe('do_2');
  });

  it('limits results to 3 by default', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeItem({ identifier: `do_${i}` })
    );
    const result = mapSearchContentToRelatedContentItems(items);
    expect(result).toHaveLength(3);
  });

  it('respects custom limit', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeItem({ identifier: `do_${i}` })
    );
    const result = mapSearchContentToRelatedContentItems(items, undefined, 5);
    expect(result).toHaveLength(5);
  });

  it('sets cardType to "collection" for collection mime type', () => {
    const items = [makeItem({ mimeType: COLLECTION_MIME })];
    const result = mapSearchContentToRelatedContentItems(items);
    expect(result[0].cardType).toBe('collection');
  });

  it('sets cardType to "resource" for non-collection mime type', () => {
    const items = [makeItem({ mimeType: 'application/pdf' })];
    const result = mapSearchContentToRelatedContentItems(items);
    expect(result[0].cardType).toBe('resource');
  });

  it('maps name with fallback to "Untitled"', () => {
    const items = [makeItem({ name: undefined })];
    const result = mapSearchContentToRelatedContentItems(items);
    expect(result[0].name).toBe('Untitled');
  });

  it('maps creator from creator field first, then createdBy', () => {
    const items1 = [makeItem({ creator: 'Alice', createdBy: 'Bob' })];
    expect(mapSearchContentToRelatedContentItems(items1)[0].creator).toBe('Alice');

    const items2 = [makeItem({ creator: undefined, createdBy: 'Bob' })];
    expect(mapSearchContentToRelatedContentItems(items2)[0].creator).toBe('Bob');

    const items3 = [makeItem({ creator: undefined, createdBy: undefined })];
    expect(mapSearchContentToRelatedContentItems(items3)[0].creator).toBe('Unknown');
  });

  it('maps image fields with fallback chain', () => {
    const items = [makeItem({ appIcon: 'a.png', posterImage: undefined, thumbnail: 'c.png' })];
    const result = mapSearchContentToRelatedContentItems(items);
    expect(result[0].appIcon).toBe('a.png');
    expect(result[0].posterImage).toBe('a.png'); // falls back to appIcon

    const items2 = [makeItem({ appIcon: undefined, posterImage: undefined, thumbnail: 'c.png' })];
    const result2 = mapSearchContentToRelatedContentItems(items2);
    expect(result2[0].appIcon).toBe('c.png');
    expect(result2[0].posterImage).toBe('c.png');
  });
});
