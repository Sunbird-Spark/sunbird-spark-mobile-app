import { Filesystem } from '@capacitor/filesystem';
import { contentDbService } from '../db/ContentDbService';
import { downloadDbService } from '../db/DownloadDbService';
import { databaseService } from '../db/DatabaseService';
import { downloadManager } from '../download_manager';

const TAG = '[contentDeleteHelper]';

export interface DeleteResult {
  deleted: boolean;
  freedBytes: number;
}

/**
 * Deletes downloaded content from device.
 *
 * Deletion strategy:
 * - ref_count ≤ 1 → hard delete (remove DB row + artifacts entirely)
 * - ref_count > 1 → soft delete (remove artifacts, keep DB row with content_state=1)
 */
export async function deleteDownloadedContent(identifier: string): Promise<DeleteResult> {
  console.debug(TAG, 'deleteDownloadedContent called for', identifier);

  try {
    const entry = await contentDbService.getByIdentifier(identifier);
    if (!entry) {
      console.debug(TAG, identifier, 'not eligible for deletion — no entry in db');
      return { deleted: false, freedBytes: 0 };
    }

    const freedBytes = entry.size_on_device || 0;
    console.debug(TAG, identifier, 'found locally, ref_count:', entry.ref_count, 'size:', freedBytes, 'path:', entry.path);

    // 1. Cancel any active download
    const queueEntry = await downloadManager.getEntry(identifier);
    if (queueEntry && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(queueEntry.state)) {
      console.debug(TAG, identifier, 'cancelling active download, state:', queueEntry.state);
      await downloadManager.cancel(identifier);
    }

    // 2. Delete artifact files from filesystem
    if (entry.path) {
      console.debug(TAG, identifier, 'removing files at path:', entry.path);
      await Filesystem.rmdir({ path: entry.path, recursive: true }).catch((err) => {
        console.warn(TAG, identifier, 'failed to remove files (may already be gone):', err);
      });
    }

    // 3. Hard delete or soft delete based on ref_count
    if (entry.ref_count <= 1) {
      console.debug(TAG, identifier, 'hard delete (ref_count ≤ 1)');
      await contentDbService.delete(identifier);
    } else {
      console.debug(TAG, identifier, 'soft delete (ref_count:', entry.ref_count, '→ decrement, set content_state=1)');
      await contentDbService.decrementRefCount(identifier);
      await contentDbService.update(identifier, {
        content_state: 1, // ONLY_SPINE — metadata only
        size_on_device: 0,
      });
    }

    // 4. Clean up download_queue entry
    await downloadDbService.delete(identifier);

    console.debug(TAG, identifier, 'deletion complete, freed', freedBytes, 'bytes');
    return { deleted: true, freedBytes };
  } catch (error) {
    console.error(TAG, 'Failed to delete content for', identifier, error);
    throw error;
  }
}
