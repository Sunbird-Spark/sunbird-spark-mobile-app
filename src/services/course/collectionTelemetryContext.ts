import type { HierarchyContentNode } from '../../types/collectionTypes';

export interface CdataItem {
  id: string;
  type: string;
}

/**
 * Build cdata array for player telemetry context.
 * When playing inside a collection with a batch, tags every telemetry event
 * with course + batch identifiers so the backend attributes progress correctly.
 */
export function buildCollectionCdata(
  collectionId?: string,
  batchId?: string,
): CdataItem[] {
  const cdata: CdataItem[] = [];
  if (collectionId) cdata.push({ id: collectionId, type: 'course' });
  if (batchId) cdata.push({ id: batchId, type: 'batch' });
  return cdata;
}

/**
 * Build objectRollup from the collection hierarchy tree.
 * Walks the tree to find the content node, then returns its ancestor IDs
 * mapped to l1..l4 (max 4 levels).
 *
 * Example: { l1: 'collection-id', l2: 'unit-id', l3: 'sub-unit-id' }
 */
export function buildObjectRollup(
  hierarchyRoot: HierarchyContentNode | undefined,
  contentId: string | undefined,
): Record<string, string> {
  if (!hierarchyRoot || !contentId) return {};

  const ancestors: string[] = [];

  function findPath(
    node: HierarchyContentNode,
    target: string,
    path: string[],
  ): boolean {
    if (node.identifier === target) {
      ancestors.push(...path);
      return true;
    }
    if (node.children) {
      for (const child of node.children) {
        if (findPath(child, target, [...path, node.identifier])) return true;
      }
    }
    return false;
  }

  findPath(hierarchyRoot, contentId, []);

  const rollup: Record<string, string> = {};
  ancestors.forEach((id, i) => {
    if (i < 4) rollup[`l${i + 1}`] = id;
  });
  return rollup;
}
