import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { FormService } from '../services/FormService';
import { ApiResponse } from '../lib/http-client';
import { FormReadResponse, UseFormReadOptions } from '../types/formTypes';
import { AppInitializer } from '../AppInitializer';

const formService = new FormService();

export const useFormRead = (
  options: UseFormReadOptions
): UseQueryResult<ApiResponse<FormReadResponse>, Error> => {
  const { request } = options;
  return useQuery({
    queryKey: ['form-read', request.type, request.subType, request.action, request.component,
      request.framework,
      request.rootOrgId],
    queryFn: () => formService.formRead(request),
    enabled: AppInitializer.isInitialized(),
    staleTime: 60 * 60 * 1000, // 1 hour — form schemas are static config
  });
};
