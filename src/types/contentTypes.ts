export interface ContentSearchRequest {
  filters?: Record<string, unknown>;
  facets?: string[];
  limit?: number;
  offset?: number;
  query?: string;
  sort_by?: Record<string, string>;
}

export interface ContentSearchItem {
  identifier: string;
  name?: string;
  description?: string;
  objectType?: string;
  status?: string;
  thumbnail?: string;
  posterImage?: string;
  createdOn?: string;
  lastUpdatedOn?: string;
  creator?: string;
  createdBy?: string;
  mimeType?: string;
  appIcon?: string;
  primaryCategory?: string;
  contentType?: string;
  framework?: string;
  leafNodesCount?: number;
}

export interface ContentSearchResponse {
  count?: number;
  content?: ContentSearchItem[];
  QuestionSet?: ContentSearchItem[];
}

export interface UseContentSearchOptions {
  request?: ContentSearchRequest;
  enabled?: boolean;
}
