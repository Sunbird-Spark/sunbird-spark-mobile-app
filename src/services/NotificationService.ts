import { getClient } from '../lib/http-client';
import type { ApiResponse } from '../lib/http-client';
import type {
  NotificationFeedResponse,
  NotificationUpdateRequest,
  NotificationDeleteRequest,
  NotificationDateGroup,
} from '../types/notificationTypes';

class NotificationService {
  async notificationsRead(userId: string): Promise<ApiResponse<NotificationFeedResponse>> {
    return getClient().get<NotificationFeedResponse>(
      `/notification/v1/feed/read/${userId}`,
    );
  }

  async notificationsUpdate(ids: string[], userId: string): Promise<ApiResponse<unknown>> {
    const body: NotificationUpdateRequest = {
      request: { ids, userId },
    };
    return getClient().patch<unknown>('/notification/v1/feed/update', body);
  }

  async notificationsDelete(ids: string[], userId: string, category: string): Promise<ApiResponse<unknown>> {
    const body: NotificationDeleteRequest = {
      request: { ids, userId, category },
    };
    return getClient().post<unknown>('/notification/v1/feed/delete', body);
  }
}

export const notificationService = new NotificationService();

/**
 * Determine date group for a notification based on its createdOn timestamp.
 */
export function getDateGroup(createdOn: string): NotificationDateGroup {
  const now = new Date();
  const created = new Date(createdOn);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  if (created >= todayStart) return 'Today';
  if (created >= yesterdayStart) return 'Yesterday';
  return 'Older';
}

/**
 * Extract display message from the notification template data JSON string.
 * Priority: description > title > raw string.
 */
export function parseTemplateMessage(templateData: string): string {
  if (!templateData) return '';
  try {
    const parsed = JSON.parse(templateData);
    return parsed.description || parsed.title || templateData;
  } catch {
    return templateData;
  }
}
