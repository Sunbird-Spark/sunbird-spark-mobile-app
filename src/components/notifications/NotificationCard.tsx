import React from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/hi';
import 'dayjs/locale/ar';
import 'dayjs/locale/fr';
import 'dayjs/locale/pt';
import type { NotificationFeed } from '../../types/notificationTypes';
import { useNotificationMessage } from '../../hooks/useNotifications';
import trashIcon from '../../assets/trash.svg';

interface NotificationCardProps {
  notification: NotificationFeed;
  onDelete: (notification: NotificationFeed) => void;
  onTap: (notification: NotificationFeed) => void;
}

function formatTimestamp(dateStr: string, locale: string): string {
  return dayjs(dateStr).locale(locale).format('ddd, DD MMMM, hh:mm a');
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onDelete,
  onTap,
}) => {
  const { getMessage } = useNotificationMessage();
  const { t, i18n } = useTranslation();
  const isUnread = notification.status === 'unread';
  const message = getMessage(notification);
  const timestamp = formatTimestamp(notification.createdOn, i18n.language);

  return (
    <div
      className={`notification-card ${isUnread ? 'notification-card--unread' : ''}`}
      onClick={() => onTap(notification)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap(notification);
        }
      }}
    >
      {isUnread && <div className="notification-card__dot" />}
      <div className="notification-card__content">
        <p className="notification-card__message">{message}</p>
        <span className="notification-card__time">{timestamp}</span>
      </div>
      <button
        className="notification-card__delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification);
        }}
        aria-label={t('deleteNotification')}
      >
        <img src={trashIcon} alt="" width="18" height="19" />
      </button>
    </div>
  );
};

export default NotificationCard;
