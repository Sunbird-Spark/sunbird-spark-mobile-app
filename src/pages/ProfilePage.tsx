import React from 'react';
import {
  IonContent,
  IonPage,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import {
  timeOutline,
  ribbonOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { AppHeader } from '../components/layout/AppHeader';
import Avatar from 'react-avatar';

const ProfilePage: React.FC = () => {
  const { logout } = useAuth();
  const { t } = useTranslation();

  return (
    <IonPage>
      <AppHeader title={t('profile')} transparent />

      <IonContent fullscreen className="profile-content">
        {/* Profile Info Card */}
        <div className="profile-info-card">
          <div className="profile-avatar-wrapper">
            <Avatar name="Prachi desai" round={true} size="133" color="var(--ion-color-primary-tint)" className="profile-avatar" />
          </div>

          <h2 className="profile-name">Prachi desai</h2>
          <p className="profile-email">{t('sunbirdId')} : prachi@gmail.com</p>

          <div className="profile-roles">
            <span className="profile-role">Learner</span>
            <span className="profile-role-dot"></span>
            <span className="profile-role">Creator</span>
            <span className="profile-role-dot"></span>
            <span className="profile-role">Reviewer</span>
          </div>
        </div>

        {/* Stats Grid */}
        <IonGrid className="profile-stats-grid">
          <IonRow>
            <IonCol size="6">
              <div className="profile-stat-card profile-stat-time">
                <div className="profile-stat-icon-badge profile-stat-icon-time">
                  <IonIcon icon={timeOutline} />
                </div>
                <div className="profile-stat-value">30</div>
                <div className="profile-stat-label">{t('timeSpent')}</div>
              </div>
            </IonCol>
            <IonCol size="6">
              <div className="profile-stat-card profile-stat-badges">
                <div className="profile-stat-icon-badge profile-stat-icon-badges">
                  <svg className="profile-stat-svg-icon" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_2049_8759)">
                      <path d="M0.0601749 17.226L3.90055 10.1241C3.50877 9.23489 3.28958 8.25248 3.28958 7.21823C3.28958 3.23348 6.51964 0.00341797 10.5044 0.00341797C14.4898 0.00341797 17.7199 3.23414 17.7199 7.21823C17.7199 8.27742 17.4895 9.28214 17.0807 10.1871L20.9381 17.2228C21.0628 17.4492 21.0418 17.7281 20.8863 17.9341C20.7307 18.1402 20.4676 18.2367 20.2156 18.1776L16.9219 17.4223L15.7944 20.5624C15.7065 20.8065 15.4834 20.9759 15.2255 20.9949C15.209 20.9962 15.1926 20.9969 15.1769 20.9969C14.9367 20.9969 14.7136 20.8649 14.5987 20.651L11.2414 14.3969C10.9992 14.4219 10.7531 14.4344 10.5044 14.4344C10.2767 14.4344 10.0516 14.4225 9.82911 14.4015L6.39889 20.6569C6.28274 20.8689 6.06158 20.9982 5.82336 20.9982C5.8063 20.9982 5.78924 20.9975 5.77217 20.9962C5.51492 20.9752 5.29311 20.8065 5.20583 20.5637L4.07839 17.4236L0.784018 18.1789C0.531363 18.2399 0.27083 18.1415 0.114643 17.9368C-0.041544 17.732 -0.0625439 17.4544 0.0595188 17.2274L0.0601749 17.226ZM15.0568 18.7308L15.8824 16.4307C15.9952 16.1176 16.3227 15.9359 16.6469 16.0126L19.0829 16.5718L16.3063 11.5068C15.3921 12.7425 14.0928 13.6744 12.5854 14.1279L15.0568 18.7308ZM16.4015 7.21823C16.4015 3.96651 13.7555 1.32117 10.5044 1.32117C7.25333 1.32117 4.60799 3.96651 4.60799 7.21823C4.60799 10.4699 7.25333 13.1153 10.505 13.1153C13.7568 13.1153 16.4015 10.4693 16.4015 7.21823ZM4.35271 16.0126C4.67821 15.9359 5.00436 16.1176 5.11724 16.43L5.94871 18.7466L8.47461 14.1417C6.92783 13.6882 5.5963 12.732 4.67033 11.4609L1.90489 16.5737L4.35271 16.0126Z" fill="white" />
                      <circle cx="10.5" cy="7.38892" r="2.75" stroke="white" strokeWidth="1.5" />
                    </g>
                    <defs>
                      <clipPath id="clip0_2049_8759">
                        <rect width="21" height="21" fill="white" transform="matrix(-1 0 0 1 21 0)" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <div className="profile-stat-value">05</div>
                <div className="profile-stat-label">{t('badges')}</div>
              </div>
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol size="6">
              <div className="profile-stat-card profile-stat-contents">
                <div className="profile-stat-icon-badge profile-stat-icon-contents">
                  <svg className="profile-stat-svg-icon" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.4597 9.1336V13.6523C15.4597 15.3567 15.4598 16.208 14.9266 16.7376C14.4024 17.2672 13.5528 17.2672 11.8448 17.2672H3.25933C2.01218 17.2672 1 16.2559 1 15.0079M15.4597 9.1336V4.61493C15.4597 2.91049 15.4598 2.05917 14.9266 1.52959C14.4024 0.999999 13.5528 1 11.8448 1H4.61493C2.90688 1 2.05734 0.999999 1.53317 1.52959C0.999969 2.05917 1 2.91049 1 4.61493V15.0079M15.4597 9.1336C15.4597 10.838 15.4598 11.6894 14.9266 12.2189C14.4024 12.7485 13.5528 12.7485 11.8448 12.7485H3.25933C2.01218 12.7485 1 13.7598 1 15.0079" stroke="white" strokeWidth="2" />
                    <path d="M5.51855 7.32626L6.68441 8.49479C7.03686 8.84725 7.61518 8.84725 7.96764 8.49479L10.941 5.5188" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="profile-stat-value">13</div>
                <div className="profile-stat-label">{t('contentsViewed')}</div>
              </div>
            </IonCol>
            <IonCol size="6">
              <div className="profile-stat-card profile-stat-certs">
                <div className="profile-stat-icon-badge profile-stat-icon-certs">
                  <svg className="profile-stat-svg-icon" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_2049_8754)">
                      <path d="M10.7667 16.4333H10.2C10.2 16.648 10.3213 16.8442 10.5132 16.9402C10.7052 17.0362 10.935 17.0154 11.1067 16.8867L10.7667 16.4333ZM13.0333 14.7333L13.3733 14.28C13.1718 14.1289 12.8948 14.1289 12.6933 14.28L13.0333 14.7333ZM15.3 16.4333L14.96 16.8867C15.1317 17.0154 15.3614 17.0362 15.5534 16.9402C15.7454 16.8442 15.8667 16.648 15.8667 16.4333H15.3ZM13.0333 12.4667C11.4685 12.4667 10.2 11.1981 10.2 9.63333H9.06667C9.06667 11.8241 10.8426 13.6 13.0333 13.6V12.4667ZM15.8667 9.63333C15.8667 11.1981 14.5981 12.4667 13.0333 12.4667V13.6C15.2241 13.6 17 11.8241 17 9.63333H15.8667ZM13.0333 6.8C14.5981 6.8 15.8667 8.06853 15.8667 9.63333H17C17 7.4426 15.2241 5.66667 13.0333 5.66667V6.8ZM13.0333 5.66667C10.8426 5.66667 9.06667 7.4426 9.06667 9.63333H10.2C10.2 8.06853 11.4685 6.8 13.0333 6.8V5.66667ZM10.2 11.9V16.4333H11.3333V11.9H10.2ZM11.1067 16.8867L13.3733 15.1867L12.6933 14.28L10.4267 15.98L11.1067 16.8867ZM12.6933 15.1867L14.96 16.8867L15.64 15.98L13.3733 14.28L12.6933 15.1867ZM15.8667 16.4333V11.9H14.7333V16.4333H15.8667ZM17 5.66667V1.7H15.8667V5.66667H17ZM15.3 0H1.7V1.13333H15.3V0ZM0 1.7V15.3H1.13333V1.7H0ZM1.7 17H9.06667V15.8667H1.7V17ZM0 15.3C0 16.2389 0.761116 17 1.7 17V15.8667C1.38704 15.8667 1.13333 15.6129 1.13333 15.3H0ZM1.7 0C0.761117 0 0 0.761116 0 1.7H1.13333C1.13333 1.38704 1.38704 1.13333 1.7 1.13333V0ZM17 1.7C17 0.761116 16.2389 0 15.3 0V1.13333C15.6129 1.13333 15.8667 1.38704 15.8667 1.7H17ZM3.4 5.66667H9.06667V4.53333H3.4V5.66667ZM3.4 9.06667H6.8V7.93333H3.4V9.06667Z" fill="white" />
                    </g>
                    <defs>
                      <clipPath id="clip0_2049_8754">
                        <rect width="17" height="17" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <div className="profile-stat-value">06</div>
                <div className="profile-stat-label">{t('certificates')}</div>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>

        {/* Action Items */}
        <IonList className="profile-actions-list" lines="none">
          <IonItem className="profile-action-item" button detail={false} routerLink="/profile/personal-details">
            <IonLabel className="profile-action-label">Personal Information</IonLabel>
            <IonIcon icon={chevronForwardOutline} slot="end" className="profile-action-chevron" />
          </IonItem>

          <IonItem className="profile-action-item" button detail={false} routerLink="/profile/my-learning">
            <IonLabel className="profile-action-label">{t('myLearning')}</IonLabel>
            <IonIcon icon={chevronForwardOutline} slot="end" className="profile-action-chevron" />
          </IonItem>

          <IonItem className="profile-action-item" button detail={false} routerLink="/profile/downloaded-contents">
            <IonLabel className="profile-action-label">Downloaded Contents</IonLabel>
            <IonIcon icon={chevronForwardOutline} slot="end" className="profile-action-chevron" />
          </IonItem>

          <IonItem className="profile-action-item profile-action-logout" button detail={false} onClick={logout}>
            <svg slot="start" className="profile-logout-icon" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.937881 7.58364L0.366072 7.12605L0 7.58364L0.366072 8.04123L0.937881 7.58364ZM7.52718 8.31579C7.93132 8.31579 8.25932 7.98779 8.25932 7.58364C8.25932 7.1795 7.93132 6.8515 7.52718 6.8515V8.31579ZM3.29465 3.46533L0.366072 7.12605L1.50969 8.04123L4.43827 4.38051L3.29465 3.46533ZM0.366072 8.04123L3.29465 11.702L4.43827 10.7868L1.50969 7.12605L0.366072 8.04123ZM0.937881 8.31579H7.52718V6.8515H0.937881V8.31579Z" fill="var(--ion-color-primary-tint)" />
              <path d="M6.79541 4.75143V4.20746C6.79541 3.02212 6.79541 2.42982 7.14245 2.02055C7.48948 1.61055 8.07372 1.51316 9.24222 1.31841L10.4664 1.11415C12.8407 0.718792 14.0275 0.521123 14.8044 1.17859C15.5812 1.83679 15.5811 3.04043 15.5811 5.44772V9.71903C15.5811 12.1263 15.5812 13.33 14.8044 13.9882C14.0275 14.6456 12.8407 14.448 10.4664 14.0526L9.24222 13.8483C8.07372 13.6536 7.48948 13.5562 7.14245 13.1462C6.79541 12.7369 6.79541 12.1446 6.79541 10.9593V10.5603" stroke="var(--ion-color-primary-tint)" strokeWidth="1.5" />
            </svg>
            <IonLabel className="profile-action-label">{t('logout')}</IonLabel>
          </IonItem>
        </IonList>

        <div className="profile-bottom-spacer"></div>
      </IonContent>

      <BottomNavigation />
    </IonPage>
  );
};

export default ProfilePage;
