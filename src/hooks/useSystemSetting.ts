import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { SystemSettingService } from '../services/SystemSettingService';
import { ApiResponse } from '../lib/http-client';
import { AppInitializer } from '../AppInitializer';

const systemSettingService = new SystemSettingService();

export const useSystemSetting = (id: string): UseQueryResult<ApiResponse<any>, Error> => {
  return useQuery({
    queryKey: ['system-setting', id],
    queryFn: () => systemSettingService.read(id),
    enabled: !!id && AppInitializer.isInitialized(),
    staleTime: Infinity,
    gcTime: 3600000,
  });
};