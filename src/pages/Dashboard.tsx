import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonButtons,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('dashboard.title')}</IonTitle>
          <IonButtons slot="end">
            <LanguageSwitcher />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{t('common.dashboard')}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <div className="ion-padding">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{t('dashboard.welcome')}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>{t('dashboard.description')}</p>
              <IonList>
                <IonItem>
                  <IonLabel>
                    <h2>{t('dashboard.totalStudents')}</h2>
                    <p>125 {t('dashboard.studentsEnrolled')}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h2>{t('dashboard.activeSessions')}</h2>
                    <p>12 {t('dashboard.ongoingSessions')}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h2>{t('dashboard.completionRate')}</h2>
                    <p>87% {t('dashboard.averageCompletion')}</p>
                  </IonLabel>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
