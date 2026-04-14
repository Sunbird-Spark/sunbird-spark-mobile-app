import { downloadManager } from '../download_manager';
import { contentDbService } from '../db/ContentDbService';
import { databaseService } from '../db/DatabaseService';
import type { DownloadRequest } from '../download_manager/types';

const TAG = '[spineDownloadHelper]';

export type SpineDownloadResult =
  | 'started'
  | 'already_imported'
  | 'no_download_url';

/**
 * Downloads the spine ECAR for a course/collection.
 *
 * The spine ECAR is a lightweight ZIP containing only the manifest.json
 * with metadata for all child contents (no actual artifacts). When imported
 * by ImportService, it creates DB entries for all children at content_state=ONLY_SPINE,
 * giving the app the full hierarchy tree for offline display.
 *
 * The spine is downloaded with priority=1 (higher than leaf content at priority=0)
 * so it completes first, matching the old app's two-phase model.
 *
 * Queue deduplication is handled by DownloadManager.enqueue() — if the spine
 * is already queued/downloading, it will be skipped automatically.
 *
 * @param collectionId — the course/collection identifier
 * @param downloadUrl — the spine ECAR download URL (from hierarchy API root node)
 * @param pkgVersion — package version for filename construction
 */
export async function downloadSpineEcar(
  collectionId: string,
  downloadUrl: string | undefined,
  pkgVersion?: number,
): Promise<SpineDownloadResult> {
  if (!downloadUrl) {
    console.warn(TAG, 'No downloadUrl for spine of', collectionId);
    return 'no_download_url';
  }

  await databaseService.initialize();

  // Check if spine is already imported (course root exists in ContentDb with state >= 1)
  // This is a ContentDb check that DownloadManager can't do
  const existing = await contentDbService.getByIdentifier(collectionId);
  if (existing && existing.content_state >= 1) {
    console.debug(TAG, collectionId, 'spine already imported (content_state:', existing.content_state, ')');
    return 'already_imported';
  }

  // No need to check download queue — DownloadManager.enqueue() handles
  // deduplication automatically (skips items already in non-terminal states)

  const request: DownloadRequest = {
    identifier: collectionId,
    downloadUrl,
    filename: `${collectionId}_${pkgVersion ?? 1}_spine.ecar`,
    mimeType: 'application/ecar',
    priority: 1, // Higher priority — spine downloads before leaf content
    contentMeta: {
      identifier: collectionId,
      pkgVersion,
      isSpine: true,
    },
  };

  console.debug(TAG, 'Enqueuing spine download for', collectionId);
  await downloadManager.enqueue([request]);
  return 'started';
}
