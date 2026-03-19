import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';
import { MobileLayout } from '../components/layout/MobileLayout';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  return (
    <IonPage>
      <MobileLayout>
        <AppHeader title={t('dashboard')} />
        <IonContent fullscreen>
          <IonHeader collapse="condense">
            <IonToolbar>
              <IonTitle size="large">{t('dashboard')}</IonTitle>
            </IonToolbar>
          </IonHeader>
          <div className="ion-padding">
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>{t('dashboardOverview')}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p>{t('dashboardDescription')}</p>
                <IonList>
                  <IonItem>
                    <IonLabel>
                      <h2>{t('totalStudents')}</h2>
                      <p>125 {t('studentsEnrolled')}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>{t('activeSessions')}</h2>
                      <p>12 {t('ongoingSessions')}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>{t('completionRate')}</h2>
                      <p>87% {t('averageCompletion')}</p>
                    </IonLabel>
                  </IonItem>
                </IonList>
              </IonCardContent>
            </IonCard>
          </div>
        </IonContent>
      </MobileLayout>
    </IonPage>
  );
};

export default Dashboard;
