import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { MobileLayout } from '../components/layout/MobileLayout';

const ProfilePage: React.FC = () => {
  return (
    <IonPage>
      <MobileLayout>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Profile</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen>
          <div className="ion-padding">
            <h1>Profile Page</h1>
            <p>User profile information will go here.</p>
          </div>
        </IonContent>
      </MobileLayout>
    </IonPage>
  );
};

export default ProfilePage;
