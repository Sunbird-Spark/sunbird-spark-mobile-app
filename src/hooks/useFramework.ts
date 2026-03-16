import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { FrameworkService } from '../services/FrameworkService';
import { ApiResponse } from '../lib/http-client';
import { AppInitializer } from '../AppInitializer';

const frameworkService = new FrameworkService();

export const useFramework = (id: string): UseQueryResult<ApiResponse<any>, Error> => {
  return useQuery({
    queryKey: ['framework', id],
    queryFn: () => frameworkService.read(id),
    enabled: !!id && AppInitializer.isInitialized(),
  });
};