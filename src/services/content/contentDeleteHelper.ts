import { Filesystem } from '@capacitor/filesystem';
import { contentDbService } from '../db/ContentDbService';
import { downloadDbService } from '../db/DownloadDbService';
import { downloadManager } from '../download_manager';

const TAG = '[contentDeleteHelper]';

export interface DeleteResult {
  deleted: boolean;
  freedBytes: number;
}

/**
 * Deletes downloaded content from device.
 *
 * Deletion strategy for leaf content:
 * - ref_count ≤ 1 → hard delete (remove DB row + artifacts entirely)
 * - ref_count > 1 → soft delete (set visibility=Parent, decrement ref_count, keep artifacts)
 *
 * Deletion strategy for collections:
 * - Decrement ref_count on all child contents
 * - Remove the collection entry itself
 */
export async function deleteDownloadedContent(identifier: string): Promise<DeleteResult> {
  console.debug(TAG, 'deleteDownloadedContent called for', identifier);

  try {
    const entry = await contentDbService.getByIdentifier(identifier);
    if (!entry) {
      console.debug(TAG, identifier, 'not eligible for deletion — no entry in db');
      return { deleted: false, freedBytes: 0 };
    }

    console.debug(TAG, identifier, 'found locally, ref_count:', entry.ref_count, 'size:', entry.size_on_device, 'path:', entry.path);

    // 1. Cancel any active download
    const queueEntry = await downloadManager.getEntry(identifier);
    if (queueEntry && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(queueEntry.state)) {
      console.debug(TAG, identifier, 'cancelling active download, state:', queueEntry.state);
      await downloadManager.cancel(identifier);
    }

    // 2. If this is a collection, decrement ref_count on all child contents
    const isCollection = entry.mime_type?.includes('collection');
    if (isCollection && entry.child_nodes) {
      const childIds = entry.child_nodes.split(',').filter(Boolean);
      if (childIds.length > 0) {
        console.debug(TAG, identifier, 'deleting collection — decrementing', childIds.length, 'children');
        await decrementChildrenRefCounts(childIds);
      }
    }

    // 3. Hard delete or soft delete based on ref_count
    if (entry.ref_count <= 1) {
      // No other references — remove artifacts and DB row entirely
      console.debug(TAG, identifier, 'hard delete (ref_count ≤ 1)');
      if (entry.path) {
        console.debug(TAG, identifier, 'removing files at path:', entry.path);
        // entry.path is a full URI from getUri() — pass directly, no directory parameter
        await Filesystem.rmdir({ path: entry.path, recursive: true }).catch((err) => {
          console.warn(TAG, identifier, 'failed to remove files (may already be gone):', err);
        });
      }
      await contentDbService.delete(identifier);
    } else {
      // Content is still referenced by a collection — keep artifacts on disk so
      // offline playback within the collection still works. Just downgrade
      // visibility to 'Parent' (hidden from standalone Downloads list) and
      // decrement ref_count.
      console.debug(TAG, identifier, 'soft delete (ref_count:', entry.ref_count, '→ decrement, set visibility=Parent)');
      await contentDbService.decrementRefCount(identifier);
      await contentDbService.update(identifier, {
        visibility: 'Parent',
      });
    }

    // 4. Clean up download_queue entry
    await downloadDbService.delete(identifier);

    // 5. Library cleanup: if this was a leaf content that was hard-deleted,
    //    check if any parent collection is now orphaned (all children gone).
    //    If so, remove the spine-only collection node from Downloads.
    if (!isCollection && entry.ref_count <= 1) {
      await cleanupOrphanedCollections(identifier);
    }

    // 6. Notify listeners (UI refresh)
    downloadManager.notifyContentDeleted(identifier);

    // Only count freed bytes for hard deletes — soft deletes keep artifacts on disk.
    const freedBytes = entry.ref_count <= 1 ? (entry.size_on_device || 0) : 0;
    console.debug(TAG, identifier, 'deletion complete, freed', freedBytes, 'bytes');
    return { deleted: true, freedBytes };
  } catch (error) {
    console.error(TAG, 'Failed to delete content for', identifier, error);
    throw error;
  }
}

/**
 * After a leaf content is hard-deleted, check if any parent collection that
 * listed it as a child is now "orphaned" — meaning ALL its children have been
 * deleted. If so, remove the skeletal collection node from the Downloads list.
 */
async function cleanupOrphanedCollections(deletedChildId: string): Promise<void> {
  try {
    const collections = await contentDbService.getCollectionsContainingChild(deletedChildId);
    for (const collection of collections) {
      if (!collection.child_nodes) continue;

      const childIds = collection.child_nodes.split(',').filter(Boolean);
      if (childIds.length === 0) continue;

      // Check how many children still exist in ContentDb with content_state=2
      const remaining = await contentDbService.getByIdentifiers(childIds);
      const downloadedChildren = remaining.filter((c) => c.content_state === 2);

      if (downloadedChildren.length === 0) {
        // All children are gone — remove the orphaned collection
        console.debug(TAG, collection.identifier, 'orphaned collection — all children deleted, removing');
        if (collection.path) {
          // collection.path is a full URI from getUri() — pass directly, no directory parameter
          await Filesystem.rmdir({ path: collection.path, recursive: true }).catch(() => {});
        }
        await contentDbService.delete(collection.identifier);
        await downloadDbService.delete(collection.identifier);
        downloadManager.notifyContentDeleted(collection.identifier);
      }
    }
  } catch (err) {
    console.warn(TAG, 'cleanupOrphanedCollections failed (non-fatal):', err);
  }
}

/**
 * Decrement ref_count for each child content of a deleted collection.
 * Children with ref_count reaching 0 are hard-deleted (artifacts + DB row).
 * Children with ref_count > 0 after decrement keep their artifacts (may belong
 * to another collection or standalone download).
 */
async function decrementChildrenRefCounts(childIds: string[]): Promise<void> {
  const children = await contentDbService.getByIdentifiers(childIds);

  for (const child of children) {
    if (child.ref_count <= 1) {
      // Last reference — hard delete
      console.debug(TAG, child.identifier, 'child hard delete (ref_count ≤ 1)');
      if (child.path) {
        await Filesystem.rmdir({ path: child.path, recursive: true }).catch(() => {});
      }
      await contentDbService.delete(child.identifier);
      await downloadDbService.delete(child.identifier);
    } else {
      // Still referenced elsewhere — just decrement
      console.debug(TAG, child.identifier, 'child decrement ref_count:', child.ref_count, '→', child.ref_count - 1);
      await contentDbService.decrementRefCount(child.identifier);
    }
  }
}
