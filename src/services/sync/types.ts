export enum NetworkQueueType {
  TELEMETRY        = 'telemetry',
  COURSE_PROGRESS  = 'course_progress',
  COURSE_ASSESMENT = 'course_assesment',  // intentional misspelling — matches backend
}

export enum QueueEntryStatus {
  PENDING     = 'PENDING',
  PROCESSING  = 'PROCESSING',
  FAILED      = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER',
}

export enum SyncType {
  TELEMETRY = 'telemetry',
  COURSE    = 'course',
  ALL       = 'all',
}

export enum AutoSyncMode {
  OFF       = 'off',
  OVER_WIFI = 'wifi',
  ALWAYS_ON = 'always-on',
}

export interface NetworkQueueEntry {
  _id?:          number;
  msg_id:        string;
  type:          NetworkQueueType;
  priority:      number;
  timestamp:     number;
  data:          string;
  item_count:    number;
  retry_count:   number;
  max_retries:   number;
  next_retry_at: number;
  last_error:    string | null;
  status:        QueueEntryStatus;
}

export interface ContentState {
  userId?:         string;
  contentId:       string;
  courseId:        string;
  batchId:         string;
  status?:         0 | 1 | 2;  // 0=not_started, 1=in_progress, 2=completed
  progress?:       number;     // 0-100
  result?:         string;
  grade?:          string;
  score?:          string;
  lastAccessTime?: number;
}

export interface UpdateContentStateRequest {
  userId:   string;
  contents: ContentState[];
}

export interface AssessmentSyncRequest {
  userId:      string;
  contents:    ContentState[];
  assessments: Array<{
    assessmentTs: number;
    userId:       string;
    contentId:    string;
    courseId:     string;
    batchId:      string;
    attemptId:    string;
    events:       any[];
  }>;
}

export interface SyncResult {
  telemetry: {
    syncedEventCount: number;
    syncedBatchCount: number;
  };
  courseProgress: {
    syncedCount: number;
  };
  courseAssessment: {
    syncedCount: number;
  };
  errors: Array<{
    msgId:   string;
    type:    NetworkQueueType;
    status:  number;
    message: string;
  }>;
}

export interface CourseContext {
  userId:  string;
  courseId: string;
  batchId:  string;
}
