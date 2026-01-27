import React from 'react';
import { IonButton, IonIcon, IonToolbar } from '@ionic/react';
import { logIn } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import sunbirdLogo from '../../assets/sunbird-logo-new.png';

export const PublicWelcomeHeader: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();

  return (
    <IonToolbar
      style={{
        '--background': 'linear-gradient(135deg, hsl(15 51% 44%) 0%, hsl(15 51% 54%) 100%)',
        '--color': 'white',
        padding: '16px',
        paddingTop: 'env(safe-area-inset-top, 16px)' // Handle safe area
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {/* Sunbird Logo Container */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '6px 12px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center'
        }}>
          <img
            src={sunbirdLogo}
            alt="Sunbird"
            style={{
              height: '24px',
              width: 'auto'
            }}
          />
        </div>

        {/* Center Text */}
        <p style={{
          fontSize: '0.875rem',
          color: 'rgba(255, 255, 255, 0.9)',
          flex: 1,
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          margin: 0
        }}>
          Explore courses and start learning
        </p>

        {/* Login Button */}
        <IonButton
          size="small"
          onClick={() => history.push('/login')}
          style={{
            '--background': '#CC8545',
            '--background-hover': 'rgba(204, 133, 69, 0.9)',
            '--color': 'white',
            height: '32px',
            fontSize: '0.75rem',
            flexShrink: 0,
            '--padding-start': '12px',
            '--padding-end': '12px'
          }}
        >
          <IonIcon
            icon={logIn}
            slot="start"
            style={{ fontSize: '14px' }}
          />
          {t('login')}
        </IonButton>
      </div>
    </IonToolbar>
  );
};
