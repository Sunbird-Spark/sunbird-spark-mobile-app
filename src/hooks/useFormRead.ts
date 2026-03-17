import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { FormService } from '../services/FormService';
import { ApiResponse } from '../lib/http-client';
import { AppInitializer } from '../AppInitializer';
import { FormReadRequest } from '../services/types';

const formService = new FormService();

export const useFormRead = (payload: FormReadRequest): UseQueryResult<ApiResponse<any>, Error> => {
  return useQuery({
    queryKey: ['form-read', payload.request.type, payload.request.subType, payload.request.action],
    queryFn: () => formService.read(payload),
    enabled: AppInitializer.isInitialized(),
  });
};
