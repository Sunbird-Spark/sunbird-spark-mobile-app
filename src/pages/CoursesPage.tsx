import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { MobileLayout } from '../components/layout/MobileLayout';

const CoursesPage: React.FC = () => {
  return (
    <IonPage>
      <MobileLayout>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Courses</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen>
          <div className="ion-padding">
            <h1>Courses Page</h1>
            <p>This is the courses page content.</p>
          </div>
        </IonContent>
      </MobileLayout>
    </IonPage>
  );
};

export default CoursesPage;
