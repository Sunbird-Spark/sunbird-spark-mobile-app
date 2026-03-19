import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';

const CoursesPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <IonPage>
      <AppHeader title={t('courses')} />
      <IonContent fullscreen>
        <div className="ion-padding">
          <h1>Courses Page</h1>
          <p>This is the courses page content.</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CoursesPage;
