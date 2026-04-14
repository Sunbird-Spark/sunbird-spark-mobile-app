import React from 'react';
import { IonHeader, IonIcon, useIonRouter } from '@ionic/react';
import { chevronBackOutline } from 'ionicons/icons';
import { LanguageSelector } from '../common/LanguageSelector';
import Notification from '../common/Notification';
import { QRScanButton } from '../common/QRScanButton';
import { useTranslation } from 'react-i18next';
import './AppHeader.css';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  showNotifications?: boolean;
  showScan?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  showNotifications = false,
  showScan = true,
}) => {
  const router = useIonRouter();
  const { t } = useTranslation();

  return (
    <IonHeader className="ion-no-border" role="banner">
      <a href="#main-content" className="skip-link">{t('skipToMainContent')}</a>
      <div className="page-header">
        <div className="page-header__start">
          {showBack && (
            <button className="page-header__back-btn" onClick={() => router.goBack()} aria-label={t('back')}>
              <IonIcon icon={chevronBackOutline} />
            </button>
          )}
          <span className="page-header__title">{title}</span>
        </div>
        <div className="page-header__actions">
          {showNotifications && <Notification />}
          {showScan && <QRScanButton />}
          <LanguageSelector />
        </div>
      </div>
    </IonHeader>
  );
};
