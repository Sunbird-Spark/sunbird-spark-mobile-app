import React, { useEffect } from 'react';
import { IonAlert, IonContent, IonPage, IonSpinner } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';
import { useQRScannerPreference } from '../hooks/useQRScannerPreference';
import { useDIALScanner } from '../hooks/useDIALScanner';
import useImpression from '../hooks/useImpression';
import './ScanPage.css';

const QRFrameIcon = () => (
  <svg width="80" height="80" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M1 1H7V7H1V1Z" stroke="var(--ion-color-primary)" strokeWidth="1.5" fill="none" />
    <rect x="3" y="3" width="2" height="2" fill="var(--ion-color-primary)" />
    <path d="M13 1H19V7H13V1Z" stroke="var(--ion-color-primary)" strokeWidth="1.5" fill="none" />
    <rect x="15" y="3" width="2" height="2" fill="var(--ion-color-primary)" />
    <path d="M1 13H7V19H1V13Z" stroke="var(--ion-color-primary)" strokeWidth="1.5" fill="none" />
    <rect x="3" y="15" width="2" height="2" fill="var(--ion-color-primary)" />
    <rect x="13" y="13" width="2" height="2" fill="var(--ion-color-primary)" />
    <rect x="17" y="13" width="2" height="2" fill="var(--ion-color-primary)" />
    <rect x="13" y="17" width="2" height="2" fill="var(--ion-color-primary)" />
    <rect x="17" y="17" width="2" height="2" fill="var(--ion-color-primary)" />
  </svg>
);

const ScanPage: React.FC = () => {
  useImpression({ pageid: 'ScanPage', env: 'explore' });
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('pageTitle.scan')}`;
  }, [t]);

  const { alertType, startScan, dismissAlert } = useDIALScanner();
  const { isEnabled, isLoading } = useQRScannerPreference();

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <IonPage>
        <AppHeader title={t('scan')} showScan={false} />
        <IonContent>
          <main id="main-content">
            <div className="scan-center">
              <IonSpinner name="crescent" />
            </div>
          </main>
        </IonContent>
      </IonPage>
    );
  }

  // ── Disabled ─────────────────────────────────────────────────────────────
  if (!isEnabled) {
    return (
      <IonPage>
        <AppHeader title={t('scan')} showScan={false} />
        <IonContent>
          <main id="main-content">
            <div className="scan-disabled">
              <p className="scan-disabled-text">
                {t('scanPage.scannerDisabled')}
              </p>
            </div>
          </main>
        </IonContent>
      </IonPage>
    );
  }

  // ── Enabled — tap-to-scan ────────────────────────────────────────────────
  return (
    <IonPage>
      <AppHeader title={t('scan')} showScan={false} />
      <IonContent>
        <main id="main-content">
          <div className="scan-enabled">
            <QRFrameIcon />
            <button
              type="button"
              className="scan-start-btn"
              onClick={startScan}
            >
              {t('scanPage.startScanning')}
            </button>
          </div>
        </main>

        <IonAlert
          isOpen={alertType === 'cameraDenied'}
          onDidDismiss={dismissAlert}
          header={t('cameraDeniedTitle')}
          message={t('cameraDeniedMessage')}
          buttons={[{ text: t('ok'), handler: dismissAlert }]}
        />

        <IonAlert
          isOpen={alertType === 'invalidQR'}
          onDidDismiss={dismissAlert}
          header={t('invalidQRTitle')}
          message={t('invalidQRMessage')}
          buttons={[
            { text: t('cancel'), role: 'cancel', handler: dismissAlert },
            {
              text: t('tryAgain'),
              handler: () => {
                dismissAlert();
                startScan();
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default ScanPage;
