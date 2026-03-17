import { getClient, ApiResponse } from '../lib/http-client';
import type { ContentSearchRequest, ContentSearchResponse } from '../types/contentTypes';

export class ContentService {
  public async getContent<T = any>(payload: any): Promise<ApiResponse<T>> {
    try {
      const response = await getClient().post<T>('/content/v1/search', payload, {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      });
      return response;
    } catch (error) {
      console.error('ContentService API Error:', error);
      throw error;
    }
  }

  public async contentSearch(
    request: ContentSearchRequest = {}
  ): Promise<ApiResponse<ContentSearchResponse>> {
    return getClient().post<ContentSearchResponse>('/composite/v1/search', {
      request: {
        filters: request.filters ?? {},
        facets: request.facets,
        limit: request.limit ?? 9,
        offset: request.offset ?? 0,
        query: request.query ?? '',
        sort_by: request.sort_by ?? { lastUpdatedOn: 'desc' },
      },
    });
  }
}