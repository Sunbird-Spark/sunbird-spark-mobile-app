import { getClient, ApiResponse } from '../../lib/http-client';

export interface Certificate {
  identifier: string;
  recipientId?: string;
  recipientName?: string;
  courseName?: string;
  issuedOn?: string;
  templateUrl?: string;
}

export interface CertificateSearchResponse {
  certificates?: Certificate[];
}

export class CertificateService {
  public search(
    recipientId: string,
    courseId?: string
  ): Promise<ApiResponse<CertificateSearchResponse>> {
    const filters: Record<string, string> = { recipientId };
    if (courseId) filters.courseId = courseId;
    return getClient().post<CertificateSearchResponse>('/rc/certificate/v1/search', { filters });
  }

  public download(certificateId: string): Promise<ApiResponse<string>> {
    return getClient().get<string>(`/rc/certificate/v1/download/${certificateId}`);
  }
}
