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
  showNotifications = false,
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
          <LanguageSelector />
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};
