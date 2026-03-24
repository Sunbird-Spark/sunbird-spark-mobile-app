export interface NotificationCreatedBy {
  name: string;
  id: string;
  type: string;
}

export interface NotificationAdditionalInfo {
  contentURL?: string;
  deepLink?: string;
}

export interface NotificationTemplate {
  ver: string;
  data: string; // JSON string: '{"title": "...", "description": "..."}'
  type: string;
}

export interface NotificationAction {
  createdBy: NotificationCreatedBy;
  additionalInfo: NotificationAdditionalInfo;
  type: string;
  category: string;
  template: NotificationTemplate;
}

export interface NotificationFeed {
  id: string;
  userId: string;
  category: string;
  priority: number;
  status: 'read' | 'unread';
  createdOn: string;
  updatedOn: string | null;
  expireOn: string | null;
  updatedBy: string | null;
  createdBy: string;
  version: string | null;
  action: NotificationAction;
}

export interface NotificationFeedResponse {
  feeds: NotificationFeed[];
}

export interface NotificationUpdateRequest {
  request: {
    ids: string[];
    userId: string;
  };
}

export interface NotificationDeleteRequest {
  request: {
    ids: string[];
    userId: string;
    category: string;
  };
}

export type NotificationDateGroup = 'Today' | 'Yesterday' | 'Older';

export interface GroupedNotification {
  group: NotificationDateGroup;
  items: NotificationFeed[];
}
