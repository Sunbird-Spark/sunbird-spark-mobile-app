import React from 'react';
import { useIonRouter } from '@ionic/react';
import { useNotificationRead, useNotificationGrouping } from '../../hooks/useNotifications';
import bellIcon from '../../assets/notification-bell.svg';
import bellUnreadIcon from '../../assets/notification-unread.svg';
import './Notification.css';

const Notification: React.FC = () => {
  const router = useIonRouter();
  const { notifications } = useNotificationRead();
  const { unreadCount } = useNotificationGrouping(notifications);

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
