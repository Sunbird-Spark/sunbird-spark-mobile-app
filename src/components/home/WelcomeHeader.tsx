import React from 'react';
import { IonButton, IonIcon, IonToolbar, IonAvatar } from '@ionic/react';
import { notifications } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { currentUser } from '../../data/mockData';
import sunbirdLogo from '../../assets/sunbird-logo-new.png';

export const WelcomeHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <IonToolbar
      style={{
        '--background': 'linear-gradient(135deg, hsl(15 51% 44%) 0%, hsl(15 51% 54%) 100%)',
        '--color': 'white',
        padding: '24px 16px',
        paddingTop: 'calc(var(--safe-area-top) + 24px)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* User Info Section */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* User Avatar */}
          <IonAvatar style={{
            width: '48px',
            height: '48px',
            border: '2px solid rgba(255, 255, 255, 0.3)'
          }}>
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              style={{ objectFit: 'cover' }}
            />
          </IonAvatar>

          {/* User Text */}
          <div>
            <p style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)',
              margin: '0 0 4px 0'
            }}>
              {t('welcomeBack')}
            </p>
            <h1 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              margin: 0,
              color: 'white'
            }}>
              {currentUser.name}
            </h1>
          </div>
        </div>

        {/* Notification Button */}
        <IonButton
          fill="clear"
          style={{
            '--color': 'white',
            '--background': 'rgba(255, 255, 255, 0.1)',
            '--background-hover': 'rgba(255, 255, 255, 0.2)',
            '--border-radius': '50%',
            width: '40px',
            height: '40px'
          }}
        >
          <IonIcon
            icon={notifications}
            style={{ fontSize: '24px' }}
          />
        </IonButton>
      </div>
    </IonToolbar>
  );
};
