import React from 'react';
import { useIonRouter } from '@ionic/react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationRead, useNotificationGrouping } from '../../hooks/useNotifications';
import bellIcon from '../../assets/notification-bell.svg';
import bellUnreadIcon from '../../assets/notification-unread.svg';
import './Notification.css';

const Notification: React.FC = () => {
  const router = useIonRouter();
  const { isAuthenticated } = useAuth();
  const { notifications } = useNotificationRead();
  const { unreadCount } = useNotificationGrouping(notifications);

  if (!isAuthenticated) return null;

  return (
    <button
      className="app-header__notification-btn"
      onClick={() => router.push('/notifications')}
      aria-label="Notifications"
    >
      <img src={unreadCount > 0 ? bellUnreadIcon : bellIcon} alt="" width="17" height="19" />
    </button>
  );
};

export default Notification;
