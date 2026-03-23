import { getClient, ApiResponse } from '../lib/http-client';
import { buildOfflineResponse } from '../lib/http-client/offlineResponse';
import type { ContentSearchRequest, ContentSearchResponse } from '../types/contentTypes';
import { contentDbService } from './db/ContentDbService';
import type { ContentEntry } from './download_manager/types';
import { networkService } from './network/networkService';

const DEFAULT_CONTENT_FIELDS = [
  'transcripts', 'ageGroup', 'appIcon', 'artifactUrl', 'attributions', 'audience',
  'author', 'badgeAssertions', 'body', 'channel', 'code', 'concepts', 'contentCredits',
  'contentType', 'contributors', 'copyright', 'copyrightYear', 'createdBy', 'createdOn',
  'creator', 'creators', 'description', 'displayScore', 'domain', 'editorState',
  'flagReasons', 'flaggedBy', 'flags', 'framework', 'identifier', 'itemSetPreviewUrl',
  'keywords', 'language', 'languageCode', 'lastUpdatedOn', 'license', 'mediaType',
  'mimeType', 'name', 'originData', 'osId', 'owner', 'pkgVersion', 'publisher',
  'questions', 'resourceType', 'scoreDisplayConfig', 'status', 'streamingUrl',
  'template', 'templateId', 'totalQuestions', 'totalScore', 'versionKey', 'visibility',
  'year', 'primaryCategory', 'additionalCategories', 'interceptionPoints', 'interceptionType',
];

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

  public async contentRead<T = any>(contentId: string, fields?: string[], mode?: string): Promise<ApiResponse<T>> {
    if (!networkService.isConnected()) {
      return this.readContentFromDb<T>(contentId);
    }

    try {
      const resolvedFields = fields ?? DEFAULT_CONTENT_FIELDS;
      const params = new URLSearchParams();
      if (resolvedFields.length) params.set('fields', resolvedFields.join(','));
      if (mode) params.set('mode', mode);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await getClient().get<T>(`/content/v1/read/${contentId}${queryString}`);

      try {
        const content = (response.data as any)?.content;
        if (content?.identifier) {
          const entry: ContentEntry = {
            identifier: content.identifier,
            server_data: JSON.stringify(content),
            // local_data mirrors server_data on fetch; locally-modified content
            // (e.g. downloaded state) should update only local_data, not server_data.
            local_data: JSON.stringify(content),
            mime_type: content.mimeType ?? '',
            path: null,
            visibility: (content.visibility as 'Default' | 'Parent') ?? 'Default',
            server_last_updated_on: content.lastUpdatedOn ?? null,
            local_last_updated_on: new Date().toISOString(),
            ref_count: 1, // tracks how many collections reference this content; incremented by the download manager on import
            content_state: 0,
            content_type: content.contentType ?? '',
            audience: Array.isArray(content.audience)
              ? content.audience.join(',')
              : (content.audience ?? 'Learner'),
            size_on_device: 0,
            pragma: '',
            manifest_version: content.pkgVersion != null ? String(content.pkgVersion) : '',
            dialcodes: Array.isArray(content.dialcodes) ? content.dialcodes.join(',') : '',
            child_nodes: Array.isArray(content.childNodes) ? content.childNodes.join(',') : '',
            primary_category: content.primaryCategory ?? '',
          };
          await contentDbService.upsert(entry);
        }
      } catch (err) {
        console.warn('[ContentService] Failed to cache content to SQLite:', err);
      }

      return response;
    } catch {
      return this.readContentFromDb<T>(contentId);
    }
  }

  private async readContentFromDb<T>(contentId: string): Promise<ApiResponse<T>> {
    const entry = await contentDbService.getByIdentifier(contentId);
    const content = entry?.server_data ? JSON.parse(entry.server_data) : null;
    return buildOfflineResponse<T>({ content } as T);
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