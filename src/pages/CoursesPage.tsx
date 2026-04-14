import React, { useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';
import useImpression from '../hooks/useImpression';

const CoursesPage: React.FC = () => {
  useImpression({ pageid: 'CoursesPage', env: 'courses' });
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('pageTitle.courses')}`;
  }, [t]);

  return (
    <IonPage>
      <AppHeader title={t('courses')} />
      <IonContent fullscreen>
        <main id="main-content">
          <div className="ion-padding">
            <h1>{t('coursesPage.title')}</h1>
            <p>{t('coursesPage.description')}</p>
          </div>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default CoursesPage;
