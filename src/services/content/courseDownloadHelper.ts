import { downloadManager } from '../download_manager';
import { contentDbService } from '../db/ContentDbService';
import { databaseService } from '../db/DatabaseService';
import type { DownloadRequest } from '../download_manager/types';
import type { HierarchyContentNode } from '../../types/collectionTypes';
import { flattenLeafNodes, isDownloadable } from './hierarchyUtils';
import { downloadSpineEcar } from './spineDownloadHelper';

const TAG = '[courseDownloadHelper]';

export interface BulkDownloadResult {
  enqueued: number;
  skippedLocal: number;
  skippedNotDownloadable: number;
  spineStatus: 'started' | 'already_imported' | 'no_download_url' | 'skipped';
}

/**
 * Enqueues downloads for all downloadable leaf nodes under the given hierarchy nodes.
 * Also triggers spine ECAR download for offline hierarchy support (Hybrid approach).
 *
 * Only checks ContentDb for already-downloaded items (content_state=2).
 * Queue deduplication is handled automatically by DownloadManager.enqueue() —
 * it skips items already in the queue unless they are in a terminal state (FAILED/CANCELLED).
 *
 * @param collectionId — used as `parentIdentifier` to group downloads for aggregate progress
 * @param nodes — hierarchy children to download (could be full course or single unit)
 * @param options.priority — download priority for leaf content (default 0)
 * @param options.spineDownloadUrl — the course root's downloadUrl for spine ECAR
 * @param options.pkgVersion — course root's pkgVersion for spine filename
 */
export async function startBulkDownload(
  collectionId: string,
  nodes: HierarchyContentNode[],
  options?: {
    priority?: number;
    spineDownloadUrl?: string;
    pkgVersion?: number;
  },
): Promise<BulkDownloadResult> {
  const priority = options?.priority ?? 0;
  await databaseService.initialize();

  // Download spine ECAR first (priority=1, higher than leaf content)
  // This populates ContentDb with hierarchy metadata for offline fallback
  let spineStatus: BulkDownloadResult['spineStatus'] = 'skipped';
  if (options?.spineDownloadUrl) {
    spineStatus = await downloadSpineEcar(collectionId, options.spineDownloadUrl, options.pkgVersion);
    console.debug(TAG, 'Spine download status:', spineStatus);
  }

  const leaves = flattenLeafNodes(nodes);
  let skippedLocal = 0;
  let skippedNotDownloadable = 0;
  const toEnqueue: DownloadRequest[] = [];

  for (const leaf of leaves) {
    if (!isDownloadable(leaf)) {
      skippedNotDownloadable++;
      continue;
    }

    // Check if already downloaded locally (DM doesn't know about ContentDb)
    const localEntry = await contentDbService.getByIdentifier(leaf.identifier);
    if (localEntry && localEntry.content_state === 2) {
      skippedLocal++;
      continue;
    }

    // No need to check download queue — DownloadManager.enqueue() handles
    // deduplication automatically (skips items already in non-terminal states)

    toEnqueue.push({
      identifier: leaf.identifier,
      parentIdentifier: collectionId,
      downloadUrl: leaf.downloadUrl!,
      filename: `${leaf.identifier}_${leaf.pkgVersion ?? 1}.ecar`,
      mimeType: leaf.mimeType || 'application/ecar',
      priority,
      contentMeta: {
        identifier: leaf.identifier,
        name: leaf.name,
        mimeType: leaf.mimeType,
        pkgVersion: leaf.pkgVersion,
        size: leaf.size,
        downloadUrl: leaf.downloadUrl,
      },
    });
  }

  if (toEnqueue.length > 0) {
    console.debug(TAG, `Enqueuing ${toEnqueue.length} downloads for collection ${collectionId}`);
    await downloadManager.enqueue(toEnqueue);
  }

  return {
    enqueued: toEnqueue.length,
    skippedLocal,
    skippedNotDownloadable,
    spineStatus,
  };
}
