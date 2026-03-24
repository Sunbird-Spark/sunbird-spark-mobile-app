import { Capacitor } from '@capacitor/core';
import { contentDbService } from '../db/ContentDbService';

/**
 * Resolves content metadata URLs to local filesystem paths when the content
 * has been downloaded (content_state === 2). This enables offline playback
 * across all player types.
 *
 * Players use different URL fields:
 * - Video: prefers `streamingUrl`, falls back to `artifactUrl`
 * - PDF/ePub: uses `artifactUrl`
 * - ECML/H5P: uses `streamingUrl` as the base directory
 * - QuML: uses hierarchy JSON (no URL resolution needed)
 *
 * Capacitor.convertFileSrc() converts native file:// paths to webview-accessible
 * URLs (e.g. capacitor://localhost/_capacitor_file_/...).
 */
export async function resolveContentForPlayer<T extends Record<string, any>>(
  contentId: string,
  metadata: T,
): Promise<T> {
  try {
    const entry = await contentDbService.getByIdentifier(contentId);

    if (!entry || entry.content_state !== 2 || !entry.path) {
      return metadata;
    }

    const resolved: Record<string, any> = { ...metadata };
    const basePath = entry.path.replace(/\/$/, ''); // Remove trailing slash if any

    // Capacitor.convertFileSrc converts file:// → https://localhost/_capacitor_file_/...
    // This absolute URL is required for <video>, <img>, etc. to load local files
    // through the Capacitor webview's asset handler.
    const toWebviewUrl = (path: string) => Capacitor.convertFileSrc(path);

    let localBasename = '';

    // Extract basename from artifactUrl
    if (resolved.artifactUrl) {
      const basename = String(resolved.artifactUrl).split('/').pop();
      if (basename) {
        localBasename = basename;
        // PDF and ePub players concatenate basePath + '/' + artifactUrl internally.
        // Giving them a full absolute path would result in a duplicate URL.
        resolved.artifactUrl = basename;
      }
    }

    // Resolve streamingUrl → local path (video player uses this)
    if (resolved.streamingUrl) {
      const basename = String(resolved.streamingUrl).split('/').pop();
      if (basename && !basename.includes('.m3u8')) {
        // For direct file URLs (mp4, webm), point to local file
        resolved.streamingUrl = toWebviewUrl(`${basePath}/${basename}`);
      } else if (localBasename) {
        // For HLS streams (.m3u8), fall back to local artifact file
        resolved.streamingUrl = toWebviewUrl(`${basePath}/${localBasename}`);
      }
    } else if (localBasename && String(resolved.mimeType).startsWith('video/')) {
      // No streamingUrl but we have a local video file (artifactUrl)
      // Set an absolute streamingUrl since the video player expects it
      resolved.streamingUrl = toWebviewUrl(`${basePath}/${localBasename}`);
    }

    // Set absolute basePath for all players (PDF/ECML use this as the root dir)
    resolved.basePath = toWebviewUrl(basePath);
    resolved.isAvailableLocally = true;

    return resolved as T;
  } catch {
    // If resolution fails, return original metadata (online playback still works)
    return metadata;
  }
}
