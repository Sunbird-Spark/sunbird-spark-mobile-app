// ── Download States ──

export enum DownloadState {
  QUEUED = 'QUEUED',
  DOWNLOADING = 'DOWNLOADING',
  PAUSED = 'PAUSED',
  DOWNLOADED = 'DOWNLOADED',
  IMPORTING = 'IMPORTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  RETRY_WAIT = 'RETRY_WAIT',
}

export const VALID_TRANSITIONS: Record<DownloadState, DownloadState[]> = {
  [DownloadState.QUEUED]: [DownloadState.DOWNLOADING, DownloadState.CANCELLED],
  [DownloadState.DOWNLOADING]: [
    DownloadState.PAUSED,
    DownloadState.DOWNLOADED,
    DownloadState.FAILED,
    DownloadState.RETRY_WAIT,
    DownloadState.CANCELLED,
  ],
  [DownloadState.PAUSED]: [DownloadState.DOWNLOADING, DownloadState.CANCELLED, DownloadState.QUEUED],
  [DownloadState.DOWNLOADED]: [DownloadState.IMPORTING, DownloadState.CANCELLED],
  [DownloadState.IMPORTING]: [DownloadState.COMPLETED, DownloadState.FAILED, DownloadState.CANCELLED],
  [DownloadState.COMPLETED]: [],
  [DownloadState.FAILED]: [DownloadState.QUEUED],
  [DownloadState.CANCELLED]: [DownloadState.QUEUED],
  [DownloadState.RETRY_WAIT]: [DownloadState.QUEUED, DownloadState.CANCELLED],
};

// ── Download Queue ──

export interface DownloadRequest {
  identifier: string;
  parentIdentifier?: string;
  downloadUrl: string;
  filename: string;
  mimeType: string;
  priority?: number;
  contentMeta?: Record<string, unknown>;
}

export interface DownloadQueueEntry {
  identifier: string;
  parent_identifier: string | null;
  download_url: string;
  filename: string;
  mime_type: string;
  file_path: string | null;
  state: DownloadState;
  progress: number;
  bytes_downloaded: number;
  total_bytes: number;
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  content_meta: string | null;
  priority: number;
  cancelled_by_user: number;
  created_at: number;
  updated_at: number;
}

export interface DownloadProgress {
  identifier: string;
  parentIdentifier?: string;
  state: DownloadState;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
}

export interface AggregateProgress {
  parentIdentifier: string;
  completed: number;
  total: number;
  overallPercent: number;
}

// ── Content DB (import target) ──

export interface ContentEntry {
  identifier: string;
  server_data: string;
  local_data: string;
  mime_type: string;
  path: string | null;
  visibility: 'Default' | 'Parent';
  server_last_updated_on: string | null;
  local_last_updated_on: string;
  ref_count: number;
  content_state: number;
  content_type: string;
  audience: string;
  size_on_device: number;
  pragma: string;
  manifest_version: string;
  dialcodes: string;
  child_nodes: string;
  primary_category: string;
}

// ── Import ──

export interface ImportResult {
  status: 'SUCCESS' | 'ALREADY_EXIST' | 'CANCELLED' | 'FAILED';
  identifiers: string[];
  errors?: string[];
}

export type ImportPhase =
  | 'EXTRACTING'
  | 'VALIDATING'
  | 'IMPORTING_CONTENT'
  | 'CREATING_MANIFEST'
  | 'CLEANING_UP'
  | 'COMPLETED';

export interface ImportProgress {
  identifier: string;
  phase: ImportPhase;
  percent: number;
}

// ── Events ──

export type DownloadEventType =
  | 'progress'
  | 'state_change'
  | 'import_progress'
  | 'queue_changed'
  | 'error'
  | 'all_done';

export interface DownloadEvent {
  type: DownloadEventType;
  identifier?: string;
  data?:
  | DownloadProgress
  | ImportProgress
  | DownloadQueueEntry
  | { errorCode: string; message: string; retryCount: number; maxRetries: number };
}

export type DownloadListener = (event: DownloadEvent) => void;
