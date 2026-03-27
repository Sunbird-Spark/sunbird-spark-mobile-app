import React from 'react';
import sunbirdLogo from '../../assets/sunbird-logo-new.png';
import { LanguageSelector } from '../common/LanguageSelector';
import Notification from '../common/Notification';
import { QRScanButton } from '../common/QRScanButton';
import { useIonRouter } from '@ionic/react';
import { useTranslation } from 'react-i18next';

export const PublicWelcomeHeader: React.FC = () => {
  const router = useIonRouter();
  const { t } = useTranslation();

  return (
    <div className="page-header">
      <img
        src={sunbirdLogo}
        alt="Sunbird"
        style={{ height: '1.75rem', width: 'auto' }}
      />

      <div className="page-header__actions">
        <button
          onClick={() => router.push('/search', 'forward', 'push')}
          style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          aria-label={t('search')}
        >
          <svg width="19" height="19" viewBox="0 0 19 19" fill="var(--ion-color-primary)" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.5 12H12.71L12.43 11.73C13.41 10.59 14 9.11 14 7.5C14 3.91 11.09 1 7.5 1C3.91 1 1 3.91 1 7.5C1 11.09 3.91 14 7.5 14C9.11 14 10.59 13.41 11.73 12.43L12 12.71V13.5L17 18.49L18.49 17L13.5 12ZM7.5 12C5.01 12 3 9.99 3 7.5C3 5.01 5.01 3 7.5 3C9.99 3 12 5.01 12 7.5C12 9.99 9.99 12 7.5 12Z" />
          </svg>
        </button>

        <QRScanButton />

        <Notification />

        <LanguageSelector />
      </div>
    </div>
  );
};
