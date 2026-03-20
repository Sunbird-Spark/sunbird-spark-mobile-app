import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { certificateService } from '../services/CertificateService';
import type { ApiResponse } from '../lib/http-client';
import type { CertificateSearchResponse } from '../services/CertificateService';
import { AppInitializer } from '../AppInitializer';

export const useUserCertificates = (
  userId: string | null
): UseQueryResult<ApiResponse<CertificateSearchResponse>, Error> => {
  return useQuery({
    queryKey: ['userCertificates', userId],
    queryFn: () => certificateService.searchCertificates(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};
