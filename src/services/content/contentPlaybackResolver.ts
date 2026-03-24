import { Capacitor } from '@capacitor/core';
import { Filesystem, Encoding } from '@capacitor/filesystem';
import { contentDbService } from '../db/ContentDbService';

const TAG = '[contentPlaybackResolver]';

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

    // entry.path is the content DIRECTORY (file:///…/content/<id>/).
    // Defensive: if it looks like a file path (has extension), use parent dir.
    let basePath = entry.path.replace(/\/$/, '');
    if (/\.\w{2,5}$/.test(basePath)) {
      basePath = basePath.substring(0, basePath.lastIndexOf('/'));
    }

    console.debug(TAG, 'resolving', {
      contentId,
      entryPath: entry.path,
      basePath,
      artifactUrl: resolved.artifactUrl,
      streamingUrl: resolved.streamingUrl,
      mimeType: resolved.mimeType,
    });

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

    // Resolve streamingUrl for local playback.
    // IMPORTANT: The sunbird-video-player, when isAvailableLocally=true, constructs
    // the final URL as `streamingUrl + '/' + artifactUrl`. So streamingUrl must be
    // the DIRECTORY path, not the full file URL — otherwise the filename gets doubled
    // (e.g. .../bunny.webm/bunny.webm).
    const mime = String(resolved.mimeType);
    const isH5pOrHtml = mime === 'application/vnd.ekstep.h5p-archive'
      || mime === 'application/vnd.ekstep.html-archive';

    if (String(resolved.mimeType).startsWith('video/')) {
      // Video player: set streamingUrl to directory so player appends artifactUrl
      resolved.streamingUrl = toWebviewUrl(basePath);
    } else if (isH5pOrHtml) {
      // H5P/HTML: The genie-canvas renderer builds the iframe URL using basePath
      // config, NOT streamingUrl. Set streamingUrl to the content directory (where
      // index.html lives) so any fallback logic still points to the right place.
      resolved.streamingUrl = toWebviewUrl(basePath);
    } else if (resolved.streamingUrl) {
      const basename = String(resolved.streamingUrl).split('/').pop();
      if (basename && !basename.includes('.m3u8')) {
        resolved.streamingUrl = toWebviewUrl(`${basePath}/${basename}`);
      } else if (localBasename) {
        resolved.streamingUrl = toWebviewUrl(`${basePath}/${localBasename}`);
      }
    }

    // Resolve appIcon / posterImage to local file if downloaded
    if (resolved.appIconLocal) {
      resolved.appIcon = toWebviewUrl(`${basePath}/${resolved.appIconLocal}`);
      if (resolved.posterImage) {
        resolved.posterImage = resolved.appIcon;
      }
    }

    // For ECML/H5P/HTML content: load body from local filesystem if not already present.
    // The renderer needs the body JSON to render stages/scenes. Without it, the renderer
    // tries to fetch from the API which fails offline.
    const ecmlMimeTypes = [
      'application/vnd.ekstep.ecml-archive',
      'application/vnd.ekstep.h5p-archive',
      'application/vnd.ekstep.html-archive',
    ];
    if (!resolved.body && ecmlMimeTypes.includes(String(resolved.mimeType))) {
      resolved.body = await loadLocalBody(basePath);
    }

    // Set absolute basePath for all players (PDF/ECML use this as the root dir)
    resolved.basePath = toWebviewUrl(basePath);
    resolved.isAvailableLocally = true;

    console.debug(TAG, 'resolved', {
      contentId,
      artifactUrl: resolved.artifactUrl,
      streamingUrl: resolved.streamingUrl,
      basePath: resolved.basePath,
    });

    return resolved as T;
  } catch {
    // If resolution fails, return original metadata (online playback still works)
    return metadata;
  }
}

/**
 * Try to read the ECML body from the extracted content directory.
 * Checks for index.json first, then index.ecml (JSON-encoded).
 */
async function loadLocalBody(basePath: string): Promise<Record<string, unknown> | null> {
  for (const filename of ['index.json', 'index.ecml']) {
    try {
      const result = await Filesystem.readFile({
        path: `${basePath}/${filename}`,
        encoding: Encoding.UTF8,
      });
      const parsed = JSON.parse(result.data as string);
      console.debug(TAG, 'loaded local body from', filename);
      return parsed;
    } catch {
      // File doesn't exist or isn't valid JSON — try next
    }
  }
  return null;
}
