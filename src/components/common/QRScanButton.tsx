import React from 'react';
import { IonAlert } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useDIALScanner } from '../../hooks/useDIALScanner';

const QRIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Top-left corner */}
    <path
      d="M1 1H7V7H1V1Z"
      stroke="var(--ion-color-primary)"
      strokeWidth="1.5"
      fill="none"
    />
    <rect x="3" y="3" width="2" height="2" fill="var(--ion-color-primary)" />

    {/* Top-right corner */}
    <path
      d="M13 1H19V7H13V1Z"
      stroke="var(--ion-color-primary)"
      strokeWidth="1.5"
      fill="none"
    />
    <rect x="15" y="3" width="2" height="2" fill="var(--ion-color-primary)" />

    {/* Bottom-left corner */}
    <path
      d="M1 13H7V19H1V13Z"
      stroke="var(--ion-color-primary)"
      strokeWidth="1.5"
      fill="none"
    />
    <rect x="3" y="15" width="2" height="2" fill="var(--ion-color-primary)" />

    {/* Bottom-right dots */}
    <rect x="13" y="13" width="2" height="2" fill="var(--ion-color-primary)" />
    <rect x="17" y="13" width="2" height="2" fill="var(--ion-color-primary)" />
    <rect x="13" y="17" width="2" height="2" fill="var(--ion-color-primary)" />
    <rect x="17" y="17" width="2" height="2" fill="var(--ion-color-primary)" />
  </svg>
);

export const QRScanButton: React.FC = () => {
  const { t } = useTranslation();
  const { alertType, startScan, dismissAlert } = useDIALScanner();

  return (
    <>
      <button
        onClick={startScan}
        aria-label={t('scanQRCode')}
        style={{
          background: 'none',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <QRIcon />
      </button>

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
    </>
  );
};
