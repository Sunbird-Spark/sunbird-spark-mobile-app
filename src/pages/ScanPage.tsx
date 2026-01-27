import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { MobileLayout } from '../components/layout/MobileLayout';

const ScanPage: React.FC = () => {
  return (
    <IonPage>
      <MobileLayout>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Scan</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen>
          <div className="ion-padding">
            <h1>Scan Page</h1>
            <p>QR Code scanner will go here.</p>
          </div>
        </IonContent>
      </MobileLayout>
    </IonPage>
  );
};

export default ScanPage;
