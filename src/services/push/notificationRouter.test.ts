import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeNotification } from './notificationRouter';

describe('routeNotification', () => {
  let push: ReturnType<typeof vi.fn>;
  let openExternal: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    push = vi.fn();
    openExternal = vi.fn();
  });

  it('does nothing when data is null', () => {
    routeNotification(null as any, push);
    expect(push).not.toHaveBeenCalled();
  });

  it('navigates to /profile for certificateUpdate action type', () => {
    routeNotification({ actionType: 'certificateUpdate' }, push);
    expect(push).toHaveBeenCalledWith('/profile');
  });

  it('navigates to /content/:id for courseUpdate with identifier', () => {
    routeNotification({ actionType: 'courseUpdate', actionData: { identifier: 'do_123' } }, push);
    expect(push).toHaveBeenCalledWith('/content/do_123');
  });

  it('navigates to /content/:id for contentUpdate with identifier', () => {
    routeNotification({ actionType: 'contentUpdate', actionData: { identifier: 'do_456' } }, push);
    expect(push).toHaveBeenCalledWith('/content/do_456');
  });

  it('navigates to /content/:id for bookUpdate with identifier', () => {
    routeNotification({ actionType: 'bookUpdate', actionData: { identifier: 'do_789' } }, push);
    expect(push).toHaveBeenCalledWith('/content/do_789');
  });

  it('does not navigate for courseUpdate when identifier is missing', () => {
    routeNotification({ actionType: 'courseUpdate', actionData: {} }, push);
    expect(push).not.toHaveBeenCalled();
  });

  it('calls openExternal with deepLink for extURL action type', () => {
    routeNotification(
      { actionType: 'extURL', actionData: { deepLink: 'https://example.com' } },
      push,
      openExternal,
    );
    expect(openExternal).toHaveBeenCalledWith('https://example.com');
    expect(push).not.toHaveBeenCalled();
  });

  it('does not call openExternal for extURL when deepLink is missing', () => {
    routeNotification({ actionType: 'extURL', actionData: {} }, push, openExternal);
    expect(openExternal).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('navigates to contentURL for contentURL action type', () => {
    routeNotification({ actionType: 'contentURL', actionData: { contentURL: '/content/abc' } }, push);
    expect(push).toHaveBeenCalledWith('/content/abc');
  });

  it('does not navigate for contentURL when contentURL is missing', () => {
    routeNotification({ actionType: 'contentURL', actionData: {} }, push);
    expect(push).not.toHaveBeenCalled();
  });

  it('navigates to /explore for search action type', () => {
    routeNotification({ actionType: 'search' }, push);
    expect(push).toHaveBeenCalledWith('/explore');
  });

  it('falls back to /notifications for unknown action type', () => {
    routeNotification({ actionType: 'UNKNOWN_TYPE' }, push);
    expect(push).toHaveBeenCalledWith('/notifications');
  });

  it('falls back to /notifications when actionType is absent', () => {
    routeNotification({}, push);
    expect(push).toHaveBeenCalledWith('/notifications');
  });

  it('reads actionType from action.type when actionType field is absent', () => {
    routeNotification({ action: { type: 'certificateUpdate' } }, push);
    expect(push).toHaveBeenCalledWith('/profile');
  });

  it('reads additionalInfo from action.additionalInfo when actionData is absent', () => {
    routeNotification(
      { action: { type: 'courseUpdate', additionalInfo: { identifier: 'do_999' } } },
      push,
    );
    expect(push).toHaveBeenCalledWith('/content/do_999');
  });
});
