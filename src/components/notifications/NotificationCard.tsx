import React from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/hi';
import 'dayjs/locale/ar';
import 'dayjs/locale/fr';
import 'dayjs/locale/pt';
import type { NotificationFeed } from '../../types/notificationTypes';
import { useNotificationMessage } from '../../hooks/useNotifications';

const TrashIcon: React.FC = () => (
  <svg width="18" height="19" viewBox="0 0 18 19" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M2.5 4.75H15.5M7.25 1.5H10.75M7.75 13.25V8.25M10.25 13.25V8.25M11.25 17.5H6.75C5.64543 17.5 4.75 16.6046 4.75 15.5L4.43815 5.62066C4.42115 5.08146 4.85318 4.63577 5.39264 4.63577H12.6074C13.1468 4.63577 13.5789 5.08146 13.5618 5.62066L13.25 15.5C13.25 16.6046 12.3546 17.5 11.25 17.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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
        <TrashIcon />
      </button>
    </div>
  );
};

export default NotificationCard;
