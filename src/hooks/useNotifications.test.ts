import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockGet, mockPatch, mockPost, authState } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPatch: vi.fn(),
  mockPost: vi.fn(),
  authState: { userId: 'user-1' as string | null },
}));

vi.mock('../lib/http-client', () => ({
  getClient: () => ({ get: mockGet, patch: mockPatch, post: mockPost }),
}));

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => authState }));

import {
  useNotificationRead,
  useNotificationUpdate,
  useNotificationDelete,
  useNotificationGrouping,
  useNotificationMessage,
} from './useNotifications';
import type { NotificationFeed } from '../types/notificationTypes';

let queryClient: QueryClient;
let invalidateSpy: ReturnType<typeof vi.spyOn>;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

const apiOk = (data: unknown) => ({ data, status: 200, headers: {} });

const feed = (over: Partial<NotificationFeed> = {}): NotificationFeed =>
  ({
    id: 'n1',
    userId: 'user-1',
    category: 'course',
    priority: 1,
    status: 'unread',
    createdOn: new Date().toISOString(),
    updatedOn: null,
    expireOn: null,
    updatedBy: null,
    createdBy: 'system',
    version: null,
    action: {
      createdBy: { name: 'System', id: 'sys', type: 'System' },
      additionalInfo: {},
      type: 'course-update',
      category: 'course',
      template: { ver: '1', data: '{"title":"Hi","description":"Course updated"}', type: 'JSON' },
    },
    ...over,
  }) as NotificationFeed;

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.userId = 'user-1';
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, retryDelay: 0 },
        mutations: { retry: false },
      },
    });
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  });

  describe('useNotificationRead', () => {
    it('fetches and returns the feed list for the logged-in user', async () => {
      const items = [feed(), feed({ id: 'n2' })];
      mockGet.mockResolvedValue(apiOk({ feeds: items }));

      const { result } = renderHook(() => useNotificationRead(), { wrapper });

      await waitFor(() => expect(result.current.notifications).toHaveLength(2));
      expect(mockGet).toHaveBeenCalledWith('/notification/v1/feed/read/user-1');
      expect(result.current.notifications).toEqual(items);
      expect(result.current.isLoading).toBe(false);
    });

    it('returns an empty list when the response has no feeds', async () => {
      mockGet.mockResolvedValue(apiOk({}));

      const { result } = renderHook(() => useNotificationRead(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.notifications).toEqual([]);
    });

    it('does not fetch without a userId', () => {
      authState.userId = null;

      const { result } = renderHook(() => useNotificationRead(), { wrapper });

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.notifications).toEqual([]);
    });

    it('surfaces a fetch error', async () => {
      mockGet.mockRejectedValue(new Error('feed unavailable'));

      const { result } = renderHook(() => useNotificationRead(), { wrapper });

      await waitFor(() => expect(result.current.error).toBeTruthy());
      expect((result.current.error as Error).message).toBe('feed unavailable');
      expect(result.current.notifications).toEqual([]);
    });
  });

  describe('useNotificationUpdate', () => {
    it('marks notifications as read and invalidates the feed', async () => {
      mockPatch.mockResolvedValue(apiOk({ response: 'SUCCESS' }));

      const { result } = renderHook(() => useNotificationUpdate(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ ids: ['n1', 'n2'], userId: 'user-1' });
      });

      expect(mockPatch).toHaveBeenCalledWith('/notification/v1/feed/update', {
        request: { ids: ['n1', 'n2'], userId: 'user-1' },
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notificationFeed'] });
    });

    it('surfaces an update failure without invalidating', async () => {
      mockPatch.mockRejectedValue(new Error('patch failed'));

      const { result } = renderHook(() => useNotificationUpdate(), { wrapper });

      act(() => { result.current.mutate({ ids: ['n1'], userId: 'user-1' }); });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('patch failed');
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('useNotificationDelete', () => {
    it('optimistically hides a deleted notification and invalidates the feed', async () => {
      mockPost.mockResolvedValue(apiOk({ response: 'SUCCESS' }));
      const item = feed();

      const { result } = renderHook(() => useNotificationDelete(), { wrapper });

      await act(async () => { await result.current.deleteNotification(item); });

      expect(mockPost).toHaveBeenCalledWith('/notification/v1/feed/delete', {
        request: { ids: ['n1'], userId: 'user-1', category: 'course' },
      });
      expect(result.current.deletedIds.has('n1')).toBe(true);
      expect(result.current.filterDeleted([item])).toEqual([]);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notificationFeed'] });
    });

    it('rolls back the optimistic delete when the API fails', async () => {
      mockPost.mockRejectedValue(new Error('delete failed'));
      const item = feed();

      const { result } = renderHook(() => useNotificationDelete(), { wrapper });

      await act(async () => { await result.current.deleteNotification(item); });

      expect(result.current.deletedIds.has('n1')).toBe(false);
      expect(result.current.filterDeleted([item])).toEqual([item]);
    });

    it('deletes every notification in one go', async () => {
      mockPost.mockResolvedValue(apiOk({ response: 'SUCCESS' }));
      const items = [feed(), feed({ id: 'n2' })];

      const { result } = renderHook(() => useNotificationDelete(), { wrapper });

      await act(async () => { await result.current.deleteAll(items); });

      expect(mockPost).toHaveBeenCalledTimes(2);
      expect(result.current.deletedIds.size).toBe(2);
      expect(result.current.filterDeleted(items)).toEqual([]);
    });

    it('restores every notification when a bulk delete fails', async () => {
      mockPost.mockRejectedValue(new Error('bulk delete failed'));
      const items = [feed(), feed({ id: 'n2' })];

      const { result } = renderHook(() => useNotificationDelete(), { wrapper });

      await act(async () => { await result.current.deleteAll(items); });

      expect(result.current.deletedIds.size).toBe(0);
      expect(result.current.filterDeleted(items)).toEqual(items);
    });

    it('passes untouched notifications through filterDeleted', () => {
      const items = [feed(), feed({ id: 'n2' })];

      const { result } = renderHook(() => useNotificationDelete(), { wrapper });

      expect(result.current.filterDeleted(items)).toEqual(items);
    });
  });

  describe('useNotificationGrouping', () => {
    it('buckets notifications by date and drops empty groups', () => {
      const items = [
        feed({ id: 'today', createdOn: new Date().toISOString() }),
        feed({ id: 'old', createdOn: daysAgo(10) }),
      ];

      const { result } = renderHook(() => useNotificationGrouping(items));

      expect(result.current.groupedNotifications.map((g) => g.group)).toEqual([
        'Today',
        'Older',
      ]);
      expect(result.current.groupedNotifications[0].items.map((i) => i.id)).toEqual(['today']);
      expect(result.current.groupedNotifications[1].items.map((i) => i.id)).toEqual(['old']);
    });

    it('includes the Yesterday bucket when relevant', () => {
      const items = [feed({ id: 'y', createdOn: daysAgo(1) })];

      const { result } = renderHook(() => useNotificationGrouping(items));

      expect(result.current.groupedNotifications).toHaveLength(1);
      expect(result.current.groupedNotifications[0].group).toBe('Yesterday');
    });

    it('counts only unread notifications', () => {
      const items = [
        feed({ id: 'a', status: 'unread' }),
        feed({ id: 'b', status: 'read' }),
        feed({ id: 'c', status: 'unread' }),
      ];

      const { result } = renderHook(() => useNotificationGrouping(items));

      expect(result.current.unreadCount).toBe(2);
    });

    it('handles an empty notification list', () => {
      const { result } = renderHook(() => useNotificationGrouping([]));

      expect(result.current.groupedNotifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('useNotificationMessage', () => {
    it('prefers the template description', () => {
      const { result } = renderHook(() => useNotificationMessage());

      expect(result.current.getMessage(feed())).toBe('Course updated');
    });

    it('falls back to the title when there is no description', () => {
      const item = feed();
      item.action.template.data = '{"title":"Only title"}';

      const { result } = renderHook(() => useNotificationMessage());

      expect(result.current.getMessage(item)).toBe('Only title');
    });

    it('returns the raw string when the template is not JSON', () => {
      const item = feed();
      item.action.template.data = 'plain text message';

      const { result } = renderHook(() => useNotificationMessage());

      expect(result.current.getMessage(item)).toBe('plain text message');
    });

    it('returns an empty string when the template is missing', () => {
      const item = feed();
      item.action = undefined as unknown as NotificationFeed['action'];

      const { result } = renderHook(() => useNotificationMessage());

      expect(result.current.getMessage(item)).toBe('');
    });
  });
});
