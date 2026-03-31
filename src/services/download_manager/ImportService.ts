import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Zip } from 'capa-zip';
import { CapacitorHttp } from '@capacitor/core';
import { DatabaseService, databaseService } from '../db/DatabaseService';
import { ContentDbService, contentDbService } from '../db/ContentDbService';
import { NON_DOWNLOADABLE_MIME_TYPES } from '../content/hierarchyUtils';
import type { ImportResult, ImportPhase, ContentEntry } from './types';

type ProgressCallback = (phase: ImportPhase, percent: number) => void;
type CancelChecker = () => Promise<boolean>;

const CONTENT_DIR = 'content';

/** Shape of each item inside the manifest archive */
interface ManifestItem {
  identifier: string;
  mimeType?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentType?: string;
  artifactUrl?: string;
  visibility?: string;
  audience?: string | string[];
  primaryCategory?: string;
  status?: string;
  expires?: string;
  pkgVersion?: number;
  pragma?: string | string[];
  dialcodes?: string | string[];
  childNodes?: string | string[];
  [key: string]: unknown;
}

/** Shape of the parsed manifest file */
interface ManifestData {
  ver: string | number;
  archive?: {
    items?: ManifestItem[];
  };
}

export class ImportService {
  constructor(
    private db: DatabaseService,
    private contentDb: ContentDbService
  ) { }

  /**
   * Import a downloaded .ecar file into the content database.
   *
   * Two-stage pipeline:
   * Stage 1: Unzip .ecar → tmp/{uuid}/ (manifest + artifact zips)
   * Stage 2: For each item, extract/copy payload → content/{identifier}/
   */
  async import(
    identifier: string,
    sourcePath: string,
    contentMeta?: Record<string, unknown>,
    isCancelled?: CancelChecker,
    onProgress?: ProgressCallback,
    parentIdentifier?: string,
  ): Promise<ImportResult> {
    let tmpDir: string | undefined;

    try {
      // ══ STAGE 1: Extract .ecar → temp dir ══
      await this.checkCancelled(isCancelled);
      onProgress?.('EXTRACTING', 0);

      tmpDir = `tmp/${identifier}_${Date.now()}`;
      await Filesystem.mkdir({ path: tmpDir, directory: Directory.Data, recursive: true }).catch(() => { });
      const tmpUri = (await Filesystem.getUri({ path: tmpDir, directory: Directory.Data })).uri;

      await Zip.unzip({ sourceFile: sourcePath, destinationPath: tmpUri });

      // ══ VALIDATE: Read manifest + dedup ══
      await this.checkCancelled(isCancelled);
      onProgress?.('VALIDATING', 20);

      const manifest = await this.readManifest(tmpUri);
      const allItems = this.parseManifestItems(manifest);
      if (allItems.length === 0) {
        return { status: 'FAILED', identifiers: [], errors: ['No items in manifest'] };
      }

      // Dedup against existing content DB
      const existingEntries = await this.contentDb.getByIdentifiers(
        allItems.map((i) => i.identifier)
      );
      const existingMap = new Map(existingEntries.map(e => [e.identifier, e]));

      // Filter: skip expired, already-imported same/newer version
      const itemsToImport = this.filterItems(allItems, existingMap);
      if (itemsToImport.length === 0) {
        return { status: 'ALREADY_EXIST', identifiers: [] };
      }

      // Detect collection (spine) import: if the root item is a collection,
      // all other items are children and should get visibility='Parent'.
      // Also, if parentIdentifier is set, this leaf ECAR was enqueued as part
      // of a collection batch — treat all items as collection children.
      const rootItem = allItems.find((i) => i.identifier === identifier);
      const isCollectionImport = !!rootItem?.mimeType?.includes('collection');
      const isEnqueuedAsChild = !!parentIdentifier;

      // ══ STAGE 2: Extract payloads + write to content DB ══
      await this.checkCancelled(isCancelled);
      onProgress?.('IMPORTING_CONTENT', 40);

      const importedIds: string[] = [];

      for (const item of itemsToImport) {
        await this.checkCancelled(isCancelled);
        const existing = existingMap.get(item.identifier);

        // Create content/{identifier}/ directory
        const contentPath = `${CONTENT_DIR}/${item.identifier}`;
        await Filesystem.mkdir({ path: contentPath, directory: Directory.Data, recursive: true }).catch(() => { });
        const destUri = (
          await Filesystem.getUri({ path: contentPath, directory: Directory.Data })
        ).uri;

        // Extract/copy payload based on contentDisposition + contentEncoding
        const contentState = await this.extractPayload(item, tmpUri, destUri);


        // H5P/HTML: The genie-canvas renderer's htmlrenderer plugin constructs
        // iframe URLs as: {host}/assets/public/content/{type}/{id}-latest/index.html
        // (using config.s3ContentHost = "/assets/public/content/" and s3_folders).
        // Move extracted content into that directory structure so the renderer
        // finds index.html at the expected path.
        await this.restructureForRenderer(item, destUri);

        // Build content DB row + upsert
        // For spine ECARs: all non-root items are children.
        // For leaf ECARs with parentIdentifier: all items are children.
        const isChildOfCollection = isCollectionImport
          ? item.identifier !== identifier
          : isEnqueuedAsChild;
        const row = this.constructContentRow(
          item,
          destUri,
          String(manifest.ver),
          contentState,
          existing,
          isChildOfCollection
        );
        await this.contentDb.upsert(row);
        importedIds.push(item.identifier);
      }

      await this.checkCancelled(isCancelled);
      onProgress?.('CREATING_MANIFEST', 70);
      await this.copyManifestToContentDir(identifier, tmpUri);

      // ══ CLEANUP ══
      onProgress?.('CLEANING_UP', 90);
      await Filesystem.rmdir({
        path: tmpDir,
        directory: Directory.Data,
        recursive: true,
      }).catch(() => { });
      tmpDir = undefined;
      await Filesystem.deleteFile({ path: sourcePath }).catch(() => { });

      // Download appIcon for offline use (best-effort, non-blocking)
      if (contentMeta) {
        const iconUrl = (contentMeta as Record<string, unknown>).appIcon as string
          || (contentMeta as Record<string, unknown>).posterImage as string;
        if (iconUrl && iconUrl.startsWith('http')) {
          await this.downloadIcon(identifier, iconUrl).catch((err) => {
            console.warn('[ImportService] Icon download failed (non-fatal):', err);
          });
        }
      }

      // Deferred size update (5s later)
      setTimeout(() => this.updateSizesOnDevice(importedIds), 5000);

      onProgress?.('COMPLETED', 100);
      return { status: 'SUCCESS', identifiers: importedIds };
    } catch (err) {
      if ((err as Error).message === 'IMPORT_CANCELLED') {
        return { status: 'CANCELLED', identifiers: [] };
      }
      return { status: 'FAILED', identifiers: [], errors: [(err as Error).message] };
    } finally {
      if (tmpDir) {
        await Filesystem.rmdir({
          path: tmpDir,
          directory: Directory.Data,
          recursive: true,
        }).catch(() => { });
      }
    }
  }

  // ══════════════════════════════════════════════════
  //  Stage 2: Payload extraction (per content item)
  // ══════════════════════════════════════════════════

  /**
   * Extract or copy content payload from temp dir to final content dir.
   * Returns the resolved content_state (0=ONLY_SPINE or 2=ARTIFACT_AVAILABLE).
   */
  private async extractPayload(
    item: ManifestItem,
    tmpUri: string,
    destUri: string
  ): Promise<number> {
    const artifactUrl = item.artifactUrl;
    const disposition = item.contentDisposition || 'inline';
    const encoding = item.contentEncoding || 'gzip';
    const mimeType = item.mimeType || '';
    const isCollection = mimeType.toLowerCase().includes('collection');
    const isQuestionSet = mimeType.toLowerCase().includes('questionset');
    const isNonDownloadable = NON_DOWNLOADABLE_MIME_TYPES.some(m => m.toLowerCase() === mimeType.toLowerCase());

    // Collections / question sets → metadata available (hierarchy), no playable binary component
    if (isCollection || isQuestionSet) return 2;

    // Online-only content (YouTube, external URLs) → metadata only, no artifact
    if (isNonDownloadable || disposition === 'online') return 0;

    // No artifact URL, or artifact URL is a remote server path (https://...).
    // This happens in spine ECARs where leaf items list the CDN URL but the
    // actual file is delivered in the individual leaf ECAR.
    if (!artifactUrl || artifactUrl.toLowerCase().startsWith('http')) return 0;

    const itemSourcePath = `${tmpUri}/${artifactUrl}`;

    if (
      mimeType === 'application/epub' ||
      mimeType === 'application/epub+zip'
    ) {
      // EPUB → copy directly
      await this.copyAsset(itemSourcePath, destUri);
    } else if (mimeType === 'application/vnd.ekstep.ecml-archive') {
      // ECML archives: attempt normal unzip first.
      // Older ECML ECARs contain absolute entry paths (e.g. /assets/...) that capa-zip rejects.
      // Fall back to our multi-threaded fflate worker to sanitize and extract.
      try {
        await Zip.unzip({ sourceFile: itemSourcePath, destinationPath: destUri });
      } catch (err) {
        const msg = String((err as Error)?.message ?? err);
        if (msg.toLowerCase().includes('invalid zip entry path') || msg.toLowerCase().includes('invalid zip')) {
          console.warn('[ImportService] ECML artifact has absolute entry paths — extracting with worker:', msg);
          await this.extractWithWorker(itemSourcePath, destUri);
        } else {
          throw err;
        }
      }
    } else {
      // Default (inline + gzip) → unzip
      await Zip.unzip({ sourceFile: itemSourcePath, destinationPath: destUri });
    }
    return 2; // ARTIFACT_AVAILABLE
  }

  private async copyAsset(source: string, destDir: string): Promise<void> {
    const filename = source.split('/').pop() || 'artifact';
    await Filesystem.copy({ from: source, to: `${destDir}/${filename}` });
  }

  /**
   * Extract a ZIP using fflate in a multi-threaded Web Worker.
   * Repairs absolute entries (stripping leading slashes) while remaining non-blocking to the main UI thread.
   */
  private async extractWithWorker(sourceFile: string, destDir: string): Promise<void> {
    const fileResult = await Filesystem.readFile({ path: sourceFile });

    // Capacitor/Filesystem.readFile returns Base64 by default.
    // Convert Base64 string to Uint8Array buffer for fflate.
    const binaryString = atob(fileResult.data as string);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const buffer = bytes.buffer;

    // In Capacitor/Vite environments, we load the worker as a separate asset.
    const worker = new Worker(new URL('./unzipWorker.ts', import.meta.url), { type: 'module' });

    return new Promise((resolve, reject) => {
      worker.onmessage = async (e) => {
        const { status, files, error } = e.data;
        if (status === 'error') {
          worker.terminate();
          reject(new Error(error));
          return;
        }

        // Iteratively write each sanitized file back to the filesystem
        let count = 0;
        for (const [path, data] of Object.entries(files as Record<string, Uint8Array>)) {
          const fullPath = `${destDir}/${path}`;
          const parentDir = fullPath.slice(0, fullPath.lastIndexOf('/'));
          await Filesystem.mkdir({ path: parentDir, recursive: true }).catch(() => { });

          // Fast conversion: Use chunked fromCharCode to avoid stack limits and slowness.
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < data.length; i += chunkSize) {
            binary += String.fromCharCode(...data.subarray(i, i + chunkSize));
          }

          await Filesystem.writeFile({
            path: fullPath,
            data: btoa(binary),
          });
          count++;
        }

        console.debug('[ImportService] Multi-threaded worker extracted', count, 'entries to:', destDir);
        worker.terminate();
        resolve();
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };

      // Send the compressed binary payload to the background thread
      worker.postMessage({ zipData: buffer }, [buffer as ArrayBuffer]);
    });
  }

  // ══════════════════════════════════════════════════
  //  Manifest item → content DB row mapping
  // ══════════════════════════════════════════════════

  private constructContentRow(
    item: ManifestItem,
    destPath: string,
    manifestVersion: string,
    contentState: number,
    existing?: ContentEntry,
    isChildOfCollection?: boolean,
  ): ContentEntry {
    const isCollection = item.mimeType?.includes('collection');
    // Visibility rules:
    // 1. Never downgrade existing 'Default' → 'Parent' (content may have been individually downloaded)
    // 2. Children of a collection import get 'Parent' so they don't appear individually in Downloads
    // 3. Otherwise read from manifest (standalone imports get 'Default')
    // 4. Upgrade 'Parent' → 'Default' if this is a standalone import (isChildOfCollection=false)
    const manifestVisibility = this.readVisibility(item);
    let visibility = existing ? existing.visibility : (isChildOfCollection ? 'Parent' : manifestVisibility);

    if (visibility === 'Parent' && !isChildOfCollection && manifestVisibility === 'Default') {
      visibility = 'Default';
    }
    // If content exists but had no artifact (state 0/1, e.g. spine entry), this import
    // is fulfilling the first reference - don't increment. If it already had an
    // artifact (state 2), this is an additional reference (standalone after collection,
    // or second collection) - increment ref_count.
    const refCount = existing
      ? (existing.content_state === 2 ? existing.ref_count + 1 : existing.ref_count)
      : 1;

    // content_state never downgrades (ARTIFACT_AVAILABLE → ONLY_SPINE)
    const resolvedState =
      existing && existing.content_state > contentState
        ? existing.content_state
        : contentState;

    return {
      identifier: item.identifier,
      server_data: existing?.server_data || '',
      local_data: JSON.stringify(item),
      mime_type: item.mimeType || '',
      path:
        isCollection && visibility === 'Parent'
          ? null // Units have no artifact dir
          : destPath,
      visibility,
      server_last_updated_on: null,
      local_last_updated_on: new Date().toISOString(),
      ref_count: refCount,
      content_state: resolvedState,
      content_type: item.contentType || '',
      audience: this.joinArray(item.audience) || 'Learner',
      size_on_device: 0,
      pragma: this.joinArray(item.pragma) || '',
      manifest_version: manifestVersion,
      dialcodes: this.joinArray(item.dialcodes),
      child_nodes: this.joinArray(item.childNodes),
      primary_category: item.primaryCategory || '',
    };
  }

  // ══════════════════════════════════════════════════
  //  Helpers
  // ══════════════════════════════════════════════════

  private filterItems(
    items: ManifestItem[],
    existingMap: Map<string, ContentEntry>
  ): ManifestItem[] {
    return items.filter((item) => {
      // Skip expired drafts
      if (item.status === 'Draft' && this.isExpired(item.expires)) return false;

      const existing = existingMap.get(item.identifier);
      if (!existing) return true; // new content

      // Allow re-import if existing entry is spine-only (no artifact extracted yet).
      // Spine ECARs create entries with content_state=0 for leaf content; the
      // individual leaf ECAR must still be imported to extract the actual file.
      if (existing.content_state < 2) return true;

      // Allow re-import if visibility is being upgraded from 'Parent' to 'Default'.
      // This happens when a content item previously imported as part of a collection
      // (Parent visibility) is now being imported standalone.
      if (this.readVisibility(item) === 'Default' && existing.visibility === 'Parent') {
        return true;
      }

      // Skip same/newer version already fully imported
      try {
        const existingData = JSON.parse(existing.local_data) as { pkgVersion?: number };
        return (item.pkgVersion ?? 0) > (existingData.pkgVersion || 0);
      } catch {
        return true;
      }
    });
  }

  private isExpired(expires?: string): boolean {
    if (!expires) return false;
    return new Date(expires).getTime() < Date.now();
  }

  private readVisibility(item: ManifestItem): 'Default' | 'Parent' {
    return item.visibility === 'Parent' ? 'Parent' : 'Default';
  }

  private joinArray(arr?: string | string[]): string {
    if (!arr) return '';
    return Array.isArray(arr) ? arr.join(',') : String(arr);
  }

  /**
   * Download appIcon/posterImage to the content directory for offline display.
   * Saves as `content/{identifier}/appIcon.{ext}` and updates local_data JSON.
   */
  private async downloadIcon(identifier: string, iconUrl: string): Promise<void> {
    const ext = iconUrl.split('?')[0].split('.').pop()?.toLowerCase() || 'png';
    const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext) ? ext : 'png';
    const iconFilename = `appIcon.${safeExt}`;
    const contentPath = `${CONTENT_DIR}/${identifier}`;
    const iconPath = `${contentPath}/${iconFilename}`;

    // Download icon bytes using Capacitor HTTP (avoids CORS)
    const response = await CapacitorHttp.get({
      url: iconUrl,
      responseType: 'blob',
    });

    if (response.status !== 200) return;

    // Write the base64 data to file
    await Filesystem.writeFile({
      path: iconPath,
      directory: Directory.Data,
      data: response.data,
    });

    // Update local_data with relative icon filename so it can be resolved later
    const entry = await this.contentDb.getByIdentifier(identifier);
    if (entry?.local_data) {
      try {
        const localData = JSON.parse(entry.local_data);
        localData.appIconLocal = iconFilename;
        await this.contentDb.update(identifier, { local_data: JSON.stringify(localData) });
      } catch { /* ignore parse errors */ }
    }

    console.debug('[ImportService] Icon saved:', iconPath);
  }

  private async updateSizesOnDevice(ids: string[]): Promise<void> {
    for (const id of ids) {
      try {
        const entry = await this.contentDb.getByIdentifier(id);
        if (entry?.path) {
          const stat = await Filesystem.stat({ path: entry.path });
          await this.contentDb.updateSizeOnDevice(id, stat.size);
        }
      } catch {
        /* ignore */
      }
    }
  }

  private async checkCancelled(fn?: CancelChecker): Promise<void> {
    if (fn && (await fn())) throw new Error('IMPORT_CANCELLED');
  }

  private async readManifest(tmpUri: string): Promise<ManifestData> {
    // Always prefer manifest.json — it has the standard { archive: { items: [...] } }
    // structure that parseManifestItems expects. hierarchy.json has a different nested
    // format ({ collection: { children: [...] } }) that isn't compatible.
    // Spine ECARs ship BOTH files; leaf ECARs only have manifest.json.
    try {
      const r = await Filesystem.readFile({
        path: `${tmpUri}/manifest.json`,
        encoding: Encoding.UTF8,
      });
      return JSON.parse(r.data as string) as ManifestData;
    } catch {
      try {
        // Fallback to hierarchy.json (shouldn't normally be needed)
        const r = await Filesystem.readFile({
          path: `${tmpUri}/hierarchy.json`,
          encoding: Encoding.UTF8,
        });
        return JSON.parse(r.data as string) as ManifestData;
      } catch {
        throw new Error('IMPORT_FAILED_MANIFEST_NOT_FOUND');
      }
    }
  }

  private parseManifestItems(manifest: ManifestData): ManifestItem[] {
    if (manifest.ver === 1.0) {
      throw new Error('IMPORT_FAILED_UNSUPPORTED_MANIFEST');
    }
    const archive = manifest.archive;
    if (!archive?.items) {
      throw new Error('IMPORT_FAILED_NO_CONTENT_METADATA');
    }
    return archive.items;
  }

  private async copyManifestToContentDir(
    identifier: string,
    tmpUri: string
  ): Promise<void> {
    const contentPath = `${CONTENT_DIR}/${identifier}`;
    await Filesystem.mkdir({
      path: contentPath,
      directory: Directory.Data,
      recursive: true,
    }).catch(() => { });
    const destUri = (
      await Filesystem.getUri({ path: contentPath, directory: Directory.Data })
    ).uri;

    // Copy manifest.json or hierarchy.json
    for (const name of ['manifest.json', 'hierarchy.json']) {
      try {
        await Filesystem.copy({
          from: `${tmpUri}/${name}`,
          to: `${destUri}/${name}`,
        });
      } catch {
        /* file may not exist */
      }
    }
  }

  /**
   * Mime-type → subfolder used by the genie-canvas htmlrenderer plugin.
   * Matches the `s3_folders` map in coreplugins.js.
   */
  private static readonly RENDERER_S3_FOLDERS: Record<string, string> = {
    'application/vnd.ekstep.h5p-archive': 'h5p',
    'application/vnd.ekstep.html-archive': 'html',
  };

  /**
   * Move extracted H5P/HTML content into the directory structure expected by
   * the genie-canvas htmlrenderer plugin.
   *
   * The renderer constructs the iframe URL as:
   *   {host}/assets/public/content/{type}/{id}-{suffix}/index.html
   *
   * where {type} is "h5p" or "html", {suffix} is "latest" for Live content.
   * After this method the content directory looks like:
   *   content/{id}/assets/public/content/h5p/{id}-latest/index.html
   *                                                      /content/...
   *                                                      /js/...
   */
  private async restructureForRenderer(
    item: ManifestItem,
    destUri: string
  ): Promise<void> {
    const folder = ImportService.RENDERER_S3_FOLDERS[item.mimeType || ''];
    if (!folder) return; // Not H5P or HTML — nothing to do

    const suffix = item.status === 'Live' ? 'latest' : 'snapshot';
    const subDir = `assets/public/content/${folder}/${item.identifier}-${suffix}`;
    const targetUri = `${destUri}/${subDir}`;

    try {
      // Create the nested target directory
      await Filesystem.mkdir({ path: targetUri, recursive: true }).catch(() => { });

      // Read all entries currently at the content root
      const { files } = await Filesystem.readdir({ path: destUri });

      for (const entry of files) {
        // Skip the "assets" directory we just created
        if (entry.name === 'assets') continue;

        await Filesystem.rename({
          from: `${destUri}/${entry.name}`,
          to: `${targetUri}/${entry.name}`,
        }).catch((err) => {
          console.warn(`[ImportService] restructure: could not move ${entry.name}:`, err);
        });
      }

      console.debug('[ImportService] Restructured for renderer:', subDir);
    } catch (err) {
      console.warn('[ImportService] restructureForRenderer failed:', err);
    }
  }
}

export const importService = new ImportService(databaseService, contentDbService);