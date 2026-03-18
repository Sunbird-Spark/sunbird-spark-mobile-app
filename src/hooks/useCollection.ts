import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { AppInitializer } from '../AppInitializer';
import type {
  CollectionData,
  CourseHierarchyResponse,
  HierarchyContentNode,
} from '../types/collectionTypes';

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
  };
}

export const useCollection = (
  collectionId: string | undefined
): UseQueryResult<CollectionData | null, Error> => {
  return useQuery({
    queryKey: ['collection-hierarchy', collectionId],
    queryFn: async (): Promise<CollectionData | null> => {
      if (!collectionId) return null;

      // Import getClient lazily so the hook can be constructed even when
      // the HTTP client hasn't been initialised yet (e.g. browser dev mode
      // where AppInitializer fails due to missing native crypto).
      const { getClient } = await import('../lib/http-client');
      const response = await getClient().get<CourseHierarchyResponse>(
        `/course/v1/hierarchy/${collectionId}`
      );
      const content = response?.data?.content;
      if (!content) return null;
      return mapToCollectionData(content);
    },
    enabled: AppInitializer.isInitialized(),
    retry: 1,
  });
};
