import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { notificationService, getDateGroup, parseTemplateMessage } from '../services/NotificationService';
import type {
  NotificationFeed,
  NotificationDateGroup,
  GroupedNotification,
} from '../types/notificationTypes';

// ── Fetch notifications ──

export function useNotificationRead() {
  const { userId } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notificationFeed', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID not available');
      const response = await notificationService.notificationsRead(userId);
      return (response.data as any).feeds as NotificationFeed[] ?? [];
    },
    enabled: !!userId,
    retry: 1,
  });

  return {
    notifications: data ?? [],
    isLoading,
    error,
    refetch,
  };
}

// ── Mark as read ──

export function useNotificationUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, userId }: { ids: string[]; userId: string }) =>
      notificationService.notificationsUpdate(ids, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationFeed'] });
    },
  });
}

// ── Delete with optimistic UI ──

export function useNotificationDelete() {
  const queryClient = useQueryClient();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const { mutateAsync: deleteApi } = useMutation({
    mutationFn: ({ ids, userId, category }: { ids: string[]; userId: string; category: string }) =>
      notificationService.notificationsDelete(ids, userId, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationFeed'] });
    },
  });

  const deleteNotification = useCallback(async (notification: NotificationFeed) => {
    setDeletedIds(prev => new Set(prev).add(notification.id));
    try {
      await deleteApi({
        ids: [notification.id],
        userId: notification.userId,
        category: notification.action.category,
      });
    } catch {
      // Rollback: remove from deletedIds so item reappears
      setDeletedIds(prev => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  }, [deleteApi]);

  const deleteAll = useCallback(async (notifications: NotificationFeed[]) => {
    const ids = notifications.map(n => n.id);
    setDeletedIds(new Set(ids));
    try {
      await Promise.all(
        notifications.map(n =>
          deleteApi({
            ids: [n.id],
            userId: n.userId,
            category: n.action.category,
          }),
        ),
      );
    } catch {
      // Rollback: restore all items
      setDeletedIds(new Set());
    }
  }, [deleteApi]);

  const filterDeleted = useCallback(
    (notifications: NotificationFeed[]) =>
      notifications.filter(n => !deletedIds.has(n.id)),
    [deletedIds],
  );

  return { deleteNotification, deleteAll, filterDeleted, deletedIds };
}

// ── Group by date ──

const DATE_GROUPS: NotificationDateGroup[] = ['Today', 'Yesterday', 'Older'];

export function useNotificationGrouping(notifications: NotificationFeed[]) {
  const groupedNotifications: GroupedNotification[] = useMemo(
    () =>
      DATE_GROUPS
        .map(group => ({
          group,
          items: notifications.filter(n => getDateGroup(n.createdOn) === group),
        }))
        .filter(g => g.items.length > 0),
    [notifications],
  );

  const unreadCount = useMemo(
    () => notifications.filter(n => n.status === 'unread').length,
    [notifications],
  );

  return { groupedNotifications, unreadCount };
}

// ── Extract message ──

export function useNotificationMessage() {
  const getMessage = useCallback((feed: NotificationFeed): string => {
    return parseTemplateMessage(feed.action?.template?.data ?? '');
  }, []);

  return { getMessage };
}
