import { Directory, Filesystem } from '@capacitor/filesystem';
import { getClient, ApiResponse } from '../lib/http-client';

export interface CertificateSearchResponse {
  [key: string]: unknown;
}

interface CertificateRcSearchResult {
  id?: string;
  osid?: string;
  [key: string]: unknown;
}

interface CertificateRcSearchResponse {
  result?: CertificateRcSearchResult[];
}

export class CertificateService {
  /** Original method — search by recipient userId */
  async searchCertificates(userId: string): Promise<ApiResponse<CertificateSearchResponse>> {
    return getClient().post<CertificateSearchResponse>('/rc/certificate/v1/search', {
      filters: {
        recipient: {
          id: { eq: userId },
        },
      },
    });
  }

  /** Search certificate by courseId + batchId (portal flow Step 2) */
  async searchCertificate(courseId: string, batchId: string): Promise<string | null> {
    try {
      const response = await getClient().post<CertificateRcSearchResponse>(
        '/rc/certificate/v1/search',
        { filters: { courseId, batchId } }
      );
      const results = response.data?.result;
      if (results && results.length > 0) {
        return results[0].id ?? results[0].osid ?? null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Download certificate SVG and save to device Documents folder (portal flow Step 3-4) */
  async downloadAndSave(certificateId: string): Promise<string> {
    const response = await getClient().get<string>(`/rc/certificate/v1/download/${certificateId}`);
    const svgContent = response.data as unknown as string;
    const fileName = `certificate_${certificateId}.svg`;
    await Filesystem.writeFile({
      path: fileName,
      data: svgContent,
      directory: Directory.Documents,
      encoding: 'utf8',
    });
    return fileName;
  }
}

export const certificateService = new CertificateService();
