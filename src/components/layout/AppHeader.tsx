import React from 'react';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
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
      <IonToolbar className={transparent ? 'profile-toolbar' : ''}>
        {showBack && (
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
        )}
        <IonTitle className={transparent ? 'profile-page-title' : ''}>{title}</IonTitle>
        <IonButtons slot="end">
          {showNotifications && <Notification />}
          {showScan && <QRScanButton />}
          <LanguageSelector />
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};
