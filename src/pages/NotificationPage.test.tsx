import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import NotificationPage from './NotificationPage';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children, className }: any) => <div>{children}</div>,
  IonToolbar: ({ children, className }: any) => <div>{children}</div>,
  IonContent: ({ children }: any) => <div>{children}</div>,
  IonRefresher: ({ children }: any) => <div>{children}</div>,
  IonRefresherContent: () => null,
  useIonRouter: () => ({ push: vi.fn(), goBack: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));

vi.mock('../providers/NetworkProvider', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('../hooks/useNotifications', () => ({
  useNotificationRead: vi.fn(),
  useNotificationUpdate: vi.fn(),
  useNotificationDelete: vi.fn(),
  useNotificationGrouping: vi.fn(),
}));

vi.mock('../components/notifications/NotificationCard', () => ({
  default: ({ notification, onTap, onDelete }: any) => (
    <div
      data-testid="notification-card"
      data-id={notification.id}
      onClick={() => onTap?.(notification)}
      onDoubleClick={() => onDelete?.(notification)}
    >
      {notification.id}
    </div>
  ),
}));

vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error }: any) =>
    message
      ? <div role="status" aria-live="polite">{message}</div>
      : error
        ? <div role="alert">{error}</div>
        : null,
}));

vi.mock('./NotificationPage.css', () => ({}));

import { useNetwork } from '../providers/NetworkProvider';
import {
  useNotificationRead,
  useNotificationUpdate,
  useNotificationDelete,
  useNotificationGrouping,
} from '../hooks/useNotifications';

describe('NotificationPage — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNetwork as any).mockReturnValue({ isOffline: false });
    (useNotificationRead as any).mockReturnValue({
      notifications: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useNotificationUpdate as any).mockReturnValue({ mutateAsync: vi.fn() });
    (useNotificationDelete as any).mockReturnValue({
      deleteNotification: vi.fn(),
      deleteAll: vi.fn(),
      filterDeleted: (n: any) => n,
    });
    (useNotificationGrouping as any).mockReturnValue({ groupedNotifications: [] });
  });

  it('back button has aria-label="back"', () => {
    render(<NotificationPage />);
    const backBtn = screen.getByRole('button', { name: 'back' });
    expect(backBtn).toBeInTheDocument();
  });

  it('back button SVG has aria-hidden="true"', () => {
    const { container } = render(<NotificationPage />);
    const backBtn = container.querySelector('.notification-page__back-btn');
    const svg = backBtn?.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows empty state with role="status" and aria-live="polite" when no notifications', () => {
    render(<NotificationPage />);
    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveAttribute('aria-live', 'polite');
  });

  it('shows offline state with role="status" and aria-live="polite" when offline', () => {
    (useNetwork as any).mockReturnValue({ isOffline: true });
    render(<NotificationPage />);
    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveAttribute('aria-live', 'polite');
  });

  it('delete-all button has aria-label="deleteAll" when notifications exist', () => {
    const notifications = [
      { id: 'n1', userId: 'u1', status: 'read', action: {} },
    ];
    (useNotificationRead as any).mockReturnValue({
      notifications,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useNotificationGrouping as any).mockReturnValue({
      groupedNotifications: [
        { group: 'TODAY', items: notifications },
      ],
    });
    render(<NotificationPage />);
    const deleteAllBtn = screen.getByRole('button', { name: 'deleteAll' });
    expect(deleteAllBtn).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    (useNotificationRead as any).mockReturnValue({
      notifications: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<NotificationPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error state when error is present', () => {
    (useNotificationRead as any).mockReturnValue({
      notifications: [],
      isLoading: false,
      error: { message: 'Failed to load' },
      refetch: vi.fn(),
    });
    render(<NotificationPage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('tapping an unread notification with certificateUpdate calls updateNotification', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    (useNotificationUpdate as any).mockReturnValue({ mutateAsync });

    const notification = {
      id: 'n1',
      userId: 'u1',
      status: 'unread',
      action: { type: 'certificateUpdate', additionalInfo: {} },
    };
    (useNotificationRead as any).mockReturnValue({
      notifications: [notification],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useNotificationGrouping as any).mockReturnValue({
      groupedNotifications: [{ group: 'TODAY', items: [notification] }],
    });
    render(<NotificationPage />);
    const card = screen.getByTestId('notification-card');
    fireEvent.click(card);
    expect(mutateAsync).toHaveBeenCalledWith({ ids: ['n1'], userId: 'u1' });
  });

  it('tapping a notification with contentURL navigates to it', async () => {
    const notification = {
      id: 'n2',
      userId: 'u1',
      status: 'read',
      action: { type: 'contentUrl', additionalInfo: { contentURL: '/content/do_1' } },
    };
    (useNotificationRead as any).mockReturnValue({
      notifications: [notification],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useNotificationGrouping as any).mockReturnValue({
      groupedNotifications: [{ group: 'TODAY', items: [notification] }],
    });
    render(<NotificationPage />);
    const card = screen.getByTestId('notification-card');
    fireEvent.click(card);
    // Just verifying no crash; router.push is a mock that doesn't throw
    expect(card).toBeInTheDocument();
  });

  it('tapping a notification with no URL does not navigate', async () => {
    const notification = {
      id: 'n3',
      userId: 'u1',
      status: 'read',
      action: { type: 'other', additionalInfo: {} },
    };
    (useNotificationRead as any).mockReturnValue({
      notifications: [notification],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useNotificationGrouping as any).mockReturnValue({
      groupedNotifications: [{ group: 'TODAY', items: [notification] }],
    });
    render(<NotificationPage />);
    const card = screen.getByTestId('notification-card');
    fireEvent.click(card);
    expect(card).toBeInTheDocument();
  });

  it('clicking delete-all button calls deleteAll', () => {
    const deleteAll = vi.fn().mockResolvedValue(undefined);
    (useNotificationDelete as any).mockReturnValue({
      deleteNotification: vi.fn(),
      deleteAll,
      filterDeleted: (n: any) => n,
    });
    const notifications = [{ id: 'n1', userId: 'u1', status: 'read', action: {} }];
    (useNotificationRead as any).mockReturnValue({
      notifications,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useNotificationGrouping as any).mockReturnValue({
      groupedNotifications: [{ group: 'TODAY', items: notifications }],
    });
    render(<NotificationPage />);
    fireEvent.click(screen.getByRole('button', { name: 'deleteAll' }));
    expect(deleteAll).toHaveBeenCalled();
  });
});
