import React from 'react';
import { IonToolbar } from '@ionic/react';
import sunbirdLogo from '../../assets/sunbird-logo-new.png';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSelector } from '../common/LanguageSelector';
import { useHistory } from 'react-router-dom';

const DemoToggleIcon = ({ isActive }: { isActive: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" stroke={isActive ? '#a85236' : '#757575'} strokeWidth="2" />
    <path d="M4 20C4 16.686 7.582 14 12 14C16.418 14 20 16.686 20 20" stroke={isActive ? '#a85236' : '#757575'} strokeWidth="2" strokeLinecap="round" />
    {isActive && <circle cx="19" cy="6" r="3" fill="#a85236" />}
  </svg>
);

export const PublicWelcomeHeader: React.FC = () => {
  const { isAuthenticated, login, logout } = useAuth();
  const history = useHistory();

  return (
    <IonToolbar
      style={{
        '--background': '#ffffff',
        '--color': '#222222',
        '--border-width': '0',
        padding: '8px 16px',
        paddingTop: 'env(safe-area-inset-top, 8px)',
        boxShadow: '0 14px 14px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        {/* Sunbird Logo */}
        <img
          src={sunbirdLogo}
          alt="Sunbird"
          style={{
            height: '28px',
            width: 'auto',
          }}
        />

        {/* Right side icons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          {/* Search icon */}
          <button
            onClick={() => history.push('/search')}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Search"
          >
            <svg width="19" height="19" viewBox="0 0 19 19" fill="#a85236" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 12H12.71L12.43 11.73C13.41 10.59 14 9.11 14 7.5C14 3.91 11.09 1 7.5 1C3.91 1 1 3.91 1 7.5C1 11.09 3.91 14 7.5 14C9.11 14 10.59 13.41 11.73 12.43L12 12.71V13.5L17 18.49L18.49 17L13.5 12ZM7.5 12C5.01 12 3 9.99 3 7.5C3 5.01 5.01 3 7.5 3C9.99 3 12 5.01 12 7.5C12 9.99 9.99 12 7.5 12Z" />
            </svg>
          </button>

          {/* Notification bell */}
          <button
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
            }}
            aria-label="Notifications"
          >
            <svg width="16" height="16" viewBox="0 0 16 20" fill="none" stroke="#a85236" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 20C9.1 20 10 19.1 10 18H6C6 19.1 6.9 20 8 20ZM14 14V9C14 5.93 12.37 3.36 9.5 2.68V2C9.5 1.17 8.83 0.5 8 0.5C7.17 0.5 6.5 1.17 6.5 2V2.68C3.64 3.36 2 5.92 2 9V14L0 16V17H16V16L14 14Z" />
            </svg>
          </button>

          {/* Demo view toggle */}
          <button
            onClick={() => isAuthenticated ? logout() : login()}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label={isAuthenticated ? 'Switch to public view' : 'Switch to learning view'}
            title={isAuthenticated ? 'Switch to public view' : 'Switch to learning started view'}
          >
            <DemoToggleIcon isActive={isAuthenticated} />
          </button>

          {/* Language dropdown */}
          <LanguageSelector />
        </div>
      </div>
    </IonToolbar>
  );
};

