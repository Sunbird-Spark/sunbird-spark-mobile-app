import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';

const DownloadsPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <IonPage>
      <AppHeader title={t('downloads')} />
      <IonContent fullscreen>
        <div className="ion-padding">
          <h1>Downloads Page</h1>
          <p>Downloaded content will appear here.</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DownloadsPage;
