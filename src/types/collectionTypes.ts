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
  createdBy?: string;
  channel?: string;
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
}

/** Batch status constants. */
export const BATCH_STATUS = {
  Upcoming: 0,
  Ongoing: 1,
  Expired: 2,
} as const;

export interface BatchListItem {
  identifier: string;
  batchId: string;
  name?: string;
  startDate: string;
  endDate?: string;
  enrollmentEndDate?: string;
  status: number;
  enrollmentType?: string;
  createdBy?: string;
}
