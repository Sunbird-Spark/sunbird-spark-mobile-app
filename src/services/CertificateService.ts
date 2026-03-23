import { getClient, ApiResponse } from '../lib/http-client';
import { convertSvgAndSave, CertificateFormat } from '../utils/svg-converter';

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
  /** Search certificates by recipient userId (used as fallback when enrollment data has no cert ID) */
  async searchCertificates(userId: string): Promise<ApiResponse<CertificateSearchResponse>> {
    return getClient().post<CertificateSearchResponse>('/rc/certificate/v1/search', {
      filters: {
        recipient: {
          id: { eq: userId },
        },
      },
    });
  }

  /** Search certificate by courseId + batchId */
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

  /**
   * Download the certificate SVG from the RC service.
   * Sends Accept: image/svg+xml and optional template header (required by RC service).
   */
  async downloadCertificateSvg(
    certificateId: string,
    templateUrl?: string
  ): Promise<ApiResponse<string>> {
    const headers: Record<string, string> = {
      Accept: 'image/svg+xml',
    };
    if (templateUrl) {
      headers['template'] = templateUrl;
    }
    return getClient().get<string>(`/rc/certificate/v1/download/${certificateId}`, headers);
  }

  /**
   * Full pipeline: download SVG from API → convert to PNG or PDF → save to device Documents.
   * Returns the saved file name.
   */
  async downloadAndSave(
    certificateId: string,
    courseName: string = 'certificate',
    format: CertificateFormat = 'pdf',
    templateUrl?: string
  ): Promise<string> {
    const response = await this.downloadCertificateSvg(certificateId, templateUrl);
    const svgContent = response.data as unknown as string;

    if (!svgContent || typeof svgContent !== 'string' || svgContent.trim().length === 0) {
      throw new Error('No certificate SVG received from server.');
    }

    const safeName = courseName.replace(/[^a-z0-9_-]/gi, '_').substring(0, 80) || 'certificate';
    return convertSvgAndSave(svgContent, safeName, format);
  }
}

export const certificateService = new CertificateService();
