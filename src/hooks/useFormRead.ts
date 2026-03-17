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
    queryKey: ['form-read', request],
    queryFn: () => formService.formRead(request),
    enabled: AppInitializer.isInitialized(),
  });
};
