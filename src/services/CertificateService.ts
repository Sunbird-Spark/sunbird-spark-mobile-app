import { getClient, ApiResponse } from '../lib/http-client';

export interface CertificateSearchResponse {
  [key: string]: unknown;
}

export class CertificateService {
  async searchCertificates(userId: string): Promise<ApiResponse<CertificateSearchResponse>> {
    return getClient().post<CertificateSearchResponse>('/rc/certificate/v1/search', {
      filters: {
        recipient: {
          id: {
            eq: userId,
          },
        },
      },
    });
  }
}

export const certificateService = new CertificateService();
