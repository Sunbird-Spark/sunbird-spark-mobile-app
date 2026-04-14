/** A node in the collection hierarchy tree (unit, sub-unit, or leaf content). */
export interface HierarchyContentNode {
  identifier: string;
  name?: string;
  description?: string;
  primaryCategory?: string;
  mimeType?: string;
  contentType?: string;
  posterImage?: string;
  children?: HierarchyContentNode[];
  leafNodesCount?: number;
  audience?: string[];
  maxAttempts?: number;
  duration?: number;
  createdBy?: string;
  channel?: string;
  /** Download URL for the content ECAR (leaf nodes only). */
  downloadUrl?: string;
  /** Content size in bytes (from API). */
  size?: number;
  /** Package version — used to build the ECAR filename. */
  pkgVersion?: number;
}

/** Root-level response from /course/v1/hierarchy/:id */
export interface CourseHierarchyResponse {
  content?: HierarchyContentNode & {
    /** Trackable configuration */
    trackable?: { enabled?: string };
    /** User consent flag */
    userConsent?: string;
  };
}

/** Flattened collection data after mapping from API response. */
export interface CollectionData {
  id: string;
  title: string;
  description?: string;
  image?: string;
  lessons: number;
  units: number;
  audience: string[];
  primaryCategory?: string;
  trackable?: { enabled?: string };
  userConsent?: string;
  children: HierarchyContentNode[];
  createdBy?: string;
  channel?: string;
  hierarchyRoot?: HierarchyContentNode;
}

/** Batch status constants. */
export const BATCH_STATUS = {
  Upcoming: 0,
  Ongoing: 1,
  Expired: 2,
} as const;

export interface BatchListItem {
  identifier: string;
  batchId?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  enrollmentEndDate?: string | null;
  status?: number;
  enrollmentType?: string;
  createdBy?: string;
  [key: string]: unknown;
}

/** Batch list API response shape. */
export interface BatchListResponse {
  response?: {
    content?: BatchListItem[];
    count?: number;
  };
}

/** Certificate template attached to a batch. */
export interface CertTemplate {
  identifier: string;
  previewUrl?: string;
  url?: string;
  name?: string;
  description?: string;
  criteria?: unknown;
  issuer?: unknown;
  signatoryList?: unknown[];
}

/** Single batch detail from /course/v1/batch/read. */
export interface BatchReadResponse {
  response?: {
    identifier?: string;
    name?: string;
    startDate?: string;
    endDate?: string;
    certTemplates?: Record<string, CertTemplate>;
    [key: string]: unknown;
  };
}

// ─── Content State ───────────────────────────────────────────────────────────

export interface ContentStateItem {
  contentId: string;
  status?: number;
  lastAccessTime?: string;
  score?: unknown[];
  [key: string]: unknown;
}

export interface ContentStateReadResponse {
  contentList?: ContentStateItem[];
}

export interface ContentStateReadRequest {
  userId: string;
  courseId: string;
  batchId: string;
  contentIds: string[];
  fields?: string[];
}

export interface ContentStateUpdateContent {
  contentId: string;
  status: number;
  lastAccessTime?: string;
}

export interface ContentStateUpdateRequest {
  userId: string;
  courseId: string;
  batchId: string;
  contents: ContentStateUpdateContent[];
  assessments?: ContentStateAssessmentItem[];
}

export interface ContentStateAssessmentItem {
  assessmentTs: number;
  batchId: string;
  courseId: string;
  userId: string;
  attemptId: string;
  contentId: string;
  events: unknown[];
}

// ─── Enrollment ──────────────────────────────────────────────────────────────

export interface TrackableCollection {
  courseId?: string;
  contentId?: string;
  collectionId?: string;
  courseName?: string;
  batchId: string;
  userId: string;
  completionPercentage?: number;
  progress?: number;
  leafNodesCount?: number;
  status?: number;
  enrolledDate?: string;
  completedOn?: string;
  batch?: {
    identifier: string;
    name?: string;
    startDate?: string;
    endDate?: string;
    createdBy?: string;
    status?: number;
  };
  issuedCertificates?: {
    identifier: string;
    lastIssuedOn?: string;
    name?: string;
    templateUrl?: string;
  }[];
  contentStatus?: Record<string, number>;
}

export interface CourseEnrollmentResponse {
  courses?: TrackableCollection[];
}

export interface TrackableCollection {
  courseId?: string;
  contentId?: string;
  collectionId?: string;
  courseName?: string;
  name?: string;
  appIcon?: string;
  posterImage?: string;
  batchId: string;
  userId: string;
  completionPercentage?: number;
  progress?: number;
  leafNodesCount?: number;
  status?: number;
  enrolledDate?: string;
  completedOn?: string;
  batch?: {
    identifier: string;
    name?: string;
    startDate?: string;
    endDate?: string;
    createdBy?: string;
    status?: number;
  };
  issuedCertificates?: {
    identifier: string;
    lastIssuedOn?: string;
    name?: string;
    templateUrl?: string;
  }[];
  contentStatus?: Record<string, number>;
}

export interface CourseEnrollmentResponse {
  courses?: TrackableCollection[];
}
