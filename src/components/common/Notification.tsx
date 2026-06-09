import React from 'react';
import { useIonRouter } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationRead, useNotificationGrouping } from '../../hooks/useNotifications';
import './Notification.css';

const BellIcon: React.FC<{ unread: boolean }> = ({ unread }) => (
  <svg width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M8.5 1.5C5.46 1.5 3 3.96 3 7v3.27L1.5 12.5v1h14v-1L14 10.27V7c0-3.04-2.46-5.5-5.5-5.5zM8.5 17.5c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.5"
    />
    {unread && <circle cx="13.5" cy="3.5" r="2.5" fill="var(--ion-color-danger, #eb445a)" />}
  </svg>
);

const Notification: React.FC = () => {
  const router = useIonRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { notifications } = useNotificationRead();
  const { unreadCount } = useNotificationGrouping(notifications);

  if (!isAuthenticated) return null;

  return (
    <button
      className="app-header__notification-btn"
      onClick={() => router.push('/notifications')}
      aria-label={unreadCount > 0 ? t('notificationsUnread', { count: unreadCount }) : t('notifications')}
    >
      <BellIcon unread={unreadCount > 0} />
    </button>
  );
};

export default Notification;
