import React from 'react';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import { chevronBackOutline } from 'ionicons/icons';
import { LanguageSelector } from '../common/LanguageSelector';
import Notification from '../common/Notification';
import { QRScanButton } from '../common/QRScanButton';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  transparent?: boolean;
  showNotifications?: boolean;
  showScan?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  transparent = false,
  showNotifications = false,
  showScan = true,
}) => {
  return (
    <IonHeader className={transparent ? 'profile-header ion-no-border' : ''}>
      <IonToolbar className={transparent ? 'profile-toolbar' : ''} color={transparent ? undefined : 'light'}>
        {showBack && (
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" icon={chevronBackOutline} text="" color="primary" />
          </IonButtons>
        )}
        <IonTitle className={transparent ? 'profile-page-title' : ''}>{title}</IonTitle>
        <IonButtons slot="end" style={{ gap: '16px' }}>
          {showNotifications && <Notification />}
          {showScan && <QRScanButton />}
          <LanguageSelector />
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};
