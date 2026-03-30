import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { AppInitializer } from '../AppInitializer';
import { contentDbService } from '../services/db/ContentDbService';
import { databaseService } from '../services/db/DatabaseService';
import { networkService } from '../services/network/networkService';
import type {
  CollectionData,
  CourseHierarchyResponse,
  HierarchyContentNode,
} from '../types/collectionTypes';

const TAG = '[useCollection]';

function mapToCollectionData(
  content: HierarchyContentNode & { trackable?: { enabled?: string }; userConsent?: string }
): CollectionData {
  const children = content.children ?? [];
  return {
    id: content.identifier,
    title: content.name ?? 'Untitled',
    description: content.description,
    image: content.posterImage,
    lessons: content.leafNodesCount ?? 0,
    units: children.length,
    audience: Array.isArray(content.audience) ? content.audience : [],
    primaryCategory: content.primaryCategory,
    trackable: content.trackable,
    userConsent: content.userConsent,
    children,
    createdBy: content.createdBy,
    channel: content.channel,
    hierarchyRoot: content,
  };
}

/**
 * Persist the hierarchy JSON into the content DB so it can be read offline.
 * Stored in the `server_data` column of the collection root entry.
 */
async function cacheHierarchyLocally(
  collectionId: string,
  content: HierarchyContentNode & { trackable?: { enabled?: string }; userConsent?: string },
): Promise<void> {
  try {
    await databaseService.initialize();
    const existing = await contentDbService.getByIdentifier(collectionId);
    const hierarchyJson = JSON.stringify(content);

    if (existing) {
      // Update server_data with latest hierarchy
      await contentDbService.update(collectionId, { server_data: hierarchyJson });
    } else {
      // Create a minimal entry to hold the hierarchy for offline use
      await contentDbService.upsert({
        identifier: collectionId,
        server_data: hierarchyJson,
        local_data: '',
        mime_type: 'application/vnd.ekstep.content-collection',
        path: null,
        visibility: 'Default',
        server_last_updated_on: new Date().toISOString(),
        local_last_updated_on: new Date().toISOString(),
        ref_count: 1,
        content_state: 0, // SEEN_BUT_NOT_AVAILABLE — no artifacts, just cached hierarchy
        content_type: content.contentType || 'Course',
        audience: Array.isArray(content.audience) ? content.audience.join(',') : 'Learner',
        size_on_device: 0,
        pragma: '',
        manifest_version: '',
        dialcodes: '',
        child_nodes: '',
        primary_category: content.primaryCategory || '',
      });
    }
    console.debug(TAG, 'Cached hierarchy locally for', collectionId);
  } catch (err) {
    console.warn(TAG, 'Failed to cache hierarchy locally:', err);
  }
}

/**
 * Read the cached hierarchy from ContentDb for offline fallback.
 * Returns null if no cached hierarchy exists.
 */
async function readCachedHierarchy(collectionId: string): Promise<CollectionData | null> {
  try {
    await databaseService.initialize();
    const entry = await contentDbService.getByIdentifier(collectionId);
    if (!entry?.server_data) return null;

    const content = JSON.parse(entry.server_data);
    if (!content?.identifier) return null;

    console.debug(TAG, 'Using cached hierarchy for', collectionId);
    return mapToCollectionData(content);
  } catch (err) {
    console.warn(TAG, 'Failed to read cached hierarchy:', err);
    return null;
  }
}

export const useCollection = (
  collectionId: string | undefined
): UseQueryResult<CollectionData | null, Error> => {
  return useQuery({
    queryKey: ['collection-hierarchy', collectionId],
    queryFn: async (): Promise<CollectionData | null> => {
      if (!collectionId) return null;

      try {
        // ── Online: fetch from API only when fully initialised ──
        // AppInitializer.isInitialized() is checked here (not in `enabled`) so the
        // query can always start and reach the offline-cache path even before the
        // app finishes its async boot sequence.
        if (AppInitializer.isInitialized() && networkService.isConnected()) {
          try {
            const { getClient } = await import('../lib/http-client');
            const response = await getClient().get<CourseHierarchyResponse>(
              `/course/v1/hierarchy/${collectionId}`
            );
            const content = response?.data?.content;
            if (content) {
              // Cache hierarchy locally for offline fallback (fire-and-forget)
              cacheHierarchyLocally(collectionId, content);
              return mapToCollectionData(content);
            }
          } catch (err) {
            console.warn(TAG, 'API fetch failed, trying offline cache:', err);
            // Fall through to offline fallback
          }
        }

        // ── Offline / pre-init fallback: read cached hierarchy from ContentDb ──
        // readCachedHierarchy calls databaseService.initialize() internally so it
        // works even when AppInitializer hasn't finished yet.
        return readCachedHierarchy(collectionId);
      } catch (err) {
        // Safety net — queryFn must never throw so isError is never shown for a
        // collection that is simply offline-cached.
        console.warn(TAG, 'Unexpected error loading collection, retrying from cache:', err);
        return readCachedHierarchy(collectionId);
      }
    },
    // Always enabled when a collectionId is present — the online/offline logic is
    // handled inside the queryFn itself so there is no startup race with
    // AppInitializer.isInitialized() being non-reactive.
    enabled: !!collectionId,
    // Retries are handled internally (cache fallback); external retries would just
    // repeat the same failure and delay showing the page.
    retry: false,
    // CRITICAL: default networkMode 'online' pauses queries when navigator.onLine
    // is false — the queryFn is never called and the page shows "not found" offline.
    // 'offlineFirst' runs the queryFn once regardless of network state, which lets
    // our internal fallback read the cached hierarchy from SQLite as intended.
    networkMode: 'offlineFirst',
  });
};
