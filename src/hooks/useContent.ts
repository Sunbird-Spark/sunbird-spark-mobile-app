import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ContentService } from '../services/ContentService';
import { ApiResponse } from '../lib/http-client';
import { AppInitializer } from '../AppInitializer';

const contentService = new ContentService();

export const useContent = (): UseQueryResult<ApiResponse<any>, Error> => {
  return useQuery({
    queryKey: ['content'],
    queryFn: () => contentService.getContent({
      request: {
        filters: {
          contentType: ['Course'],
          status: ['Live']
        },
        limit: 10
      }
    }),
    enabled: AppInitializer.isInitialized(),
  });
};

export const useContentRead = (
  contentId: string,
  options?: { enabled?: boolean; fields?: string[]; mode?: string }
): UseQueryResult<ApiResponse<any>, Error> => {
  const enabled = options?.enabled ?? true;
  const fields = options?.fields;
  const mode = options?.mode;
  return useQuery({
    queryKey: ['content-read', contentId, fields, mode],
    queryFn: () => contentService.contentRead(contentId, fields, mode),
    enabled: enabled && !!contentId && AppInitializer.isInitialized(),
    staleTime: 60 * 60 * 1000,
  });
};