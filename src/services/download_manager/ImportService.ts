import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Zip } from 'capa-zip';
import { DatabaseService, databaseService } from '../db/DatabaseService';
import { ContentDbService, contentDbService } from '../db/ContentDbService';
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
    onProgress?: ProgressCallback
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

        // Build content DB row + upsert
        const row = this.constructContentRow(
          item,
          destUri,
          String(manifest.ver),
          contentState,
          existing
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
    const isCollection = mimeType.includes('collection');
    const isQuestionSet = mimeType.includes('questionset');

    // Collections / question sets → metadata only
    if (isCollection || isQuestionSet) return 2;

    // No artifact URL or remote-only
    if (!artifactUrl || artifactUrl.startsWith('https:')) return 2;

    // Online-only content
    if (disposition === 'online') return 2;

    const itemSourcePath = `${tmpUri}/${artifactUrl}`;

    if (
      mimeType === 'application/epub' ||
      mimeType === 'application/epub+zip'
    ) {
      // EPUB → copy directly
      await this.copyAsset(itemSourcePath, destUri);
    } else if (disposition === 'inline' && encoding === 'identity') {
      // Uncompressed (PDF, MP4, WebM) → copy directly
      await this.copyAsset(itemSourcePath, destUri);
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

  // ══════════════════════════════════════════════════
  //  Manifest item → content DB row mapping
  // ══════════════════════════════════════════════════

  private constructContentRow(
    item: ManifestItem,
    destPath: string,
    manifestVersion: string,
    contentState: number,
    existing?: ContentEntry
  ): ContentEntry {
    const isCollection = item.mimeType?.includes('collection');
    const visibility = this.readVisibility(item);
    const refCount = existing ? existing.ref_count + 1 : 1;

    // content_state never downgrades (ARTIFACT_AVAILABLE → ONLY_SPINE)
    const resolvedState =
      existing && existing.content_state > contentState
        ? existing.content_state
        : contentState;

    return {
      identifier: item.identifier,
      server_data: '',
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

      // Skip same/newer version already imported
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
    // Check which manifest file to read to avoid noisy Capacitor console errors on missing files
    try {
      await Filesystem.stat({ path: `${tmpUri}/hierarchy.json` });
      // hierarchy.json exists!
      const r = await Filesystem.readFile({
        path: `${tmpUri}/hierarchy.json`,
        encoding: Encoding.UTF8,
      });
      return JSON.parse(r.data as string) as ManifestData;
    } catch {
      try {
        // Fallback to manifest.json
        const r = await Filesystem.readFile({
          path: `${tmpUri}/manifest.json`,
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
}

export const importService = new ImportService(databaseService, contentDbService);
