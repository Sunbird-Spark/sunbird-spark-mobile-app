import React from 'react';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonBadge,
  useIonRouter,
} from '@ionic/react';
import { notificationsOutline } from 'ionicons/icons';
import { LanguageSelector } from '../common/LanguageSelector';
import { useNotificationRead, useNotificationGrouping } from '../../hooks/useNotifications';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  transparent?: boolean;
  showNotifications?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  transparent = false,
  showNotifications = true,
}) => {
  const router = useIonRouter();
  const { notifications } = useNotificationRead();
  const { unreadCount } = useNotificationGrouping(notifications);

  return (
    <IonHeader className={transparent ? 'profile-header ion-no-border' : ''}>
      <IonToolbar className={transparent ? 'profile-toolbar' : ''}>
        {showBack && (
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
        )}
        <IonTitle className={transparent ? 'profile-page-title' : ''}>{title}</IonTitle>
        <IonButtons slot="end">
          {showNotifications && (
            <button
              className="app-header__notification-btn"
              onClick={() => router.push('/notifications')}
              aria-label="Notifications"
            >
              <IonIcon icon={notificationsOutline} className="app-header__notification-icon" />
              {unreadCount > 0 && (
                <IonBadge className="app-header__notification-badge" color="danger">
                  {unreadCount}
                </IonBadge>
              )}
            </button>
          )}
          <LanguageSelector />
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};
