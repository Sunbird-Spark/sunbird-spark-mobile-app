import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './Home.css';

const Home: React.FC = () => {
  const { t } = useTranslation();
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('home.title')}</IonTitle>
          <IonButtons slot="end">
            <LanguageSwitcher />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{t('common.home')}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <div className="ion-padding">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{t('home.welcome')}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>{t('home.description')}</IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{t('home.quickActions')}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonButton expand="block" color="primary">
                {t('home.viewStudents')}
              </IonButton>
              <IonButton expand="block" color="secondary" className="ion-margin-top">
                {t('home.trackProgress')}
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
