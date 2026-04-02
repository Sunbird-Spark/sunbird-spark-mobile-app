import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Notification from './Notification';

vi.mock('@ionic/react', () => ({
  useIonRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/useNotifications', () => ({
  useNotificationRead: vi.fn(),
  useNotificationGrouping: vi.fn(),
}));

vi.mock('../../assets/notification-bell.svg', () => ({ default: 'bell.svg' }));
vi.mock('../../assets/notification-unread.svg', () => ({ default: 'bell-unread.svg' }));
vi.mock('./Notification.css', () => ({}));

import { useAuth } from '../../contexts/AuthContext';
import { useNotificationRead, useNotificationGrouping } from '../../hooks/useNotifications';

describe('Notification — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ isAuthenticated: true });
    (useNotificationRead as any).mockReturnValue({ notifications: [] });
    (useNotificationGrouping as any).mockReturnValue({ unreadCount: 0 });
  });

  it('renders null when not authenticated', () => {
    (useAuth as any).mockReturnValue({ isAuthenticated: false });
    const { container } = render(<Notification />);
    expect(container.firstChild).toBeNull();
  });

  it('has aria-label "Notifications" when there are no unread messages', () => {
    render(<Notification />);
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('has aria-label with unread count when there are unread messages', () => {
    (useNotificationGrouping as any).mockReturnValue({ unreadCount: 3 });
    render(<Notification />);
    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument();
  });

  it('updates aria-label when unread count changes', () => {
    (useNotificationGrouping as any).mockReturnValue({ unreadCount: 1 });
    render(<Notification />);
    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
  });

  it('bell icon has empty alt text (decorative)', () => {
    const { container } = render(<Notification />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
  });
});
