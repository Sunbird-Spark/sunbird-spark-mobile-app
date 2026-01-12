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
          <IonTitle>{t('profile.title')}</IonTitle>
          <IonButtons slot="end">
            <LanguageSwitcher />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{t('common.profile')}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <div className="ion-padding">
          <IonCard>
            <IonCardContent className="ion-text-center">
              <IonAvatar style={{ width: '100px', height: '100px', margin: '0 auto' }}>
                <img alt="Profile" src="https://ionicframework.com/docs/img/demos/avatar.svg" />
              </IonAvatar>
              <h2>{t('profile.teacherName')}</h2>
              <p>teacher@sahayak.com</p>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{t('profile.accountSettings')}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel>
                    <h3>{t('profile.role')}</h3>
                    <p>{t('profile.primaryTeacher')}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>{t('profile.school')}</h3>
                    <p>{t('profile.demoSchool')}</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonLabel>
                    <h3>{t('profile.memberSince')}</h3>
                    <p>{t('profile.january2025')}</p>
                  </IonLabel>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>

          <IonButton expand="block" color="danger">
            {t('profile.logout')}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Profile;
