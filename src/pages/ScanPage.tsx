import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';

const ScanPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <IonPage>
      <AppHeader title={t('scan')} />
      <IonContent fullscreen>
        <div className="ion-padding">
          <h1>Scan Page</h1>
          <p>QR Code scanner will go here.</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ScanPage;
