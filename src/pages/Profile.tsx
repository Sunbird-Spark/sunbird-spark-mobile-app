import {
  IonAvatar,
  IonButton,
  IonButtons,
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
import LanguageSwitcher from '../components/LanguageSwitcher';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('profileTitle')}</IonTitle>
          <IonButtons slot="end">
            <LanguageSwitcher />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{t('profile')}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <div className="ion-padding">
          <IonCard>
            <IonCardContent className="ion-text-center">
              <IonAvatar style={{ width: '100px', height: '100px', margin: '0 auto' }}>
                <img alt="Profile" src="https://ionicframework.com/docs/img/demos/avatar.svg" />
              </IonAvatar>
              <h2>{t('teacherName')}</h2>
              <p>teacher@gmail.com</p>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{t('accountSettings')}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel>
                    <h3>{t('role')}</h3>
                    <p>{t('primaryTeacher')}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>{t('school')}</h3>
                    <p>{t('demoSchool')}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>{t('memberSince')}</h3>
                    <p>{t('january2025')}</p>
                  </IonLabel>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>

          <IonButton expand="block" color="danger">
            {t('logout')}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Profile;
