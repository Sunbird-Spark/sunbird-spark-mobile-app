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