import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { FormService } from '../services/FormService';
import { ApiResponse } from '../lib/http-client';
import { AppInitializer } from '../AppInitializer';

const formService = new FormService();

const HELP_FAQ_PAYLOAD = {
  request: {
    type: 'dynamicform',
    subType: 'support_v2',
    action: 'get',
    component: 'app',
    rootOrgId: '*',
  },
};

export const useFormRead = (): UseQueryResult<ApiResponse<any>, Error> => {
  return useQuery({
    queryKey: ['form-read', 'help-faq'],
    queryFn: () => formService.read(HELP_FAQ_PAYLOAD),
    enabled: AppInitializer.isInitialized(),
  });
};
