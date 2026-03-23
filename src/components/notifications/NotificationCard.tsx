import React from 'react';
import type { NotificationFeed } from '../../types/notificationTypes';
import { useNotificationMessage } from '../../hooks/useNotifications';

interface NotificationCardProps {
  notification: NotificationFeed;
  onDelete: (notification: NotificationFeed) => void;
  onTap: (notification: NotificationFeed) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  const day = DAYS[d.getDay()];
  const date = d.getDate().toString().padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const h = hours % 12 || 12;
  return `${day}, ${date} ${month}, ${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AB4A2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onDelete,
  onTap,
}) => {
  const { getMessage } = useNotificationMessage();
  const isUnread = notification.status === 'unread';
  const message = getMessage(notification);
  const timestamp = formatTimestamp(notification.createdOn);

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
        aria-label="Delete notification"
      >
        <TrashIcon />
      </button>
    </div>
  );
};

export default NotificationCard;
