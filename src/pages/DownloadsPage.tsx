import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { MobileLayout } from '../components/layout/MobileLayout';

const DownloadsPage: React.FC = () => {
  return (
    <IonPage>
      <MobileLayout>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Downloads</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen>
          <div className="ion-padding">
            <h1>Downloads Page</h1>
            <p>Downloaded content will appear here.</p>
          </div>
        </IonContent>
      </MobileLayout>
    </IonPage>
  );
};

export default DownloadsPage;
