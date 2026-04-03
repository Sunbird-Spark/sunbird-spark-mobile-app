import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';
import useImpression from '../hooks/useImpression';

const CoursesPage: React.FC = () => {
  useImpression({ pageid: 'CoursesPage', env: 'courses' });
  const { t } = useTranslation();
  return (
    <IonPage>
      <AppHeader title={t('courses')} />
      <IonContent fullscreen>
        <main id="main-content">
          <div className="ion-padding">
            <h1>Courses Page</h1>
            <p>This is the courses page content.</p>
          </div>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default CoursesPage;
