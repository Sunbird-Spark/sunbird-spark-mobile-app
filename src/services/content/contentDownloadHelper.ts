import { downloadManager } from '../download_manager';
import { contentDbService } from '../db/ContentDbService';
import { databaseService } from '../db/DatabaseService';
import type { DownloadRequest } from '../download_manager/types';
import { NON_DOWNLOADABLE_MIME_TYPES } from './hierarchyUtils';

const TAG = '[contentDownloadHelper]';

export type ContentMeta = {
  identifier: string;
  downloadUrl?: string;
  name?: string;
  mimeType?: string;
  pkgVersion?: number;
  size?: number;
  [key: string]: unknown;
};

export type DownloadResult = 'started' | 'already_downloaded' | 'in_progress' | 'not_available';

/**
 * Validates preconditions and enqueues a single content download.
 * Returns a status string for UI toast messages.
 */
export async function startContentDownload(
  contentMeta: ContentMeta,
  options?: { parentIdentifier?: string; priority?: number },
): Promise<DownloadResult> {
  console.debug(TAG, 'startContentDownload called', {
    identifier: contentMeta.identifier,
    downloadUrl: contentMeta.downloadUrl ? '(present)' : '(missing)',
    mimeType: contentMeta.mimeType,
    pkgVersion: contentMeta.pkgVersion,
    priority: options?.priority,
  });

  if (!contentMeta.downloadUrl) {
    console.warn(TAG, 'No downloadUrl for', contentMeta.identifier, '— returning not_available');
    return 'not_available';
  }

  // Streaming-only content (YouTube, external URLs) cannot play offline
  if (contentMeta.mimeType && NON_DOWNLOADABLE_MIME_TYPES.includes(contentMeta.mimeType)) {
    console.warn(TAG, contentMeta.identifier, 'is streaming-only (mimeType:', contentMeta.mimeType, ')');
    return 'not_available';
  }

  try {
    await databaseService.initialize();
    const localEntry = await contentDbService.getByIdentifier(contentMeta.identifier);
    if (localEntry && localEntry.content_state === 2) {
      // If visibility is 'Parent' and this is a standalone download (no parentIdentifier),
      // proceed to enqueue so the fast-path can upgrade visibility to 'Default' + bump ref_count.
      if (localEntry.visibility === 'Parent' && !options?.parentIdentifier) {
        console.debug(TAG, contentMeta.identifier, 'exists locally as Parent — will upgrade to Default');
      } else {
        console.debug(TAG, contentMeta.identifier, 'already downloaded locally (content_state=2)');
        return 'already_downloaded';
      }
    }

    const queueEntry = await downloadManager.getEntry(contentMeta.identifier);
    if (queueEntry && !['FAILED', 'CANCELLED', 'COMPLETED'].includes(queueEntry.state)) {
      console.debug(TAG, contentMeta.identifier, 'already in queue with state:', queueEntry.state);
      return 'in_progress';
    }

    const request: DownloadRequest = {
      identifier: contentMeta.identifier,
      downloadUrl: contentMeta.downloadUrl,
      filename: `${contentMeta.identifier}_${contentMeta.pkgVersion ?? 1}.ecar`,
      mimeType: contentMeta.mimeType || 'application/ecar',
      parentIdentifier: options?.parentIdentifier,
      priority: options?.priority ?? 0,
      contentMeta: contentMeta as Record<string, unknown>,
    };

    console.debug(TAG, 'Enqueuing download', {
      identifier: request.identifier,
      filename: request.filename,
      mimeType: request.mimeType,
      priority: request.priority,
      downloadUrl: request.downloadUrl.substring(0, 80) + '...',
    });

    await downloadManager.enqueue([request]);
    console.debug(TAG, contentMeta.identifier, 'enqueued successfully');
    return 'started';
  } catch (error) {
    console.error(TAG, 'Failed to start download for', contentMeta.identifier, error);
    throw error;
  }
}
