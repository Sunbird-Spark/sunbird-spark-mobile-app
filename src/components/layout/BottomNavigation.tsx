import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import {
  home,
  bookOutline,
  qrCodeOutline,
  downloadOutline,
  personOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
}

const navItems: NavItem[] = [
  { path: '/', icon: home, labelKey: 'home' },
  { path: '/courses', icon: bookOutline, labelKey: 'courses' },
  { path: '/scan', icon: qrCodeOutline, labelKey: 'scan' },
  { path: '/downloads', icon: downloadOutline, labelKey: 'downloads' },
  { path: '/profile', icon: personOutline, labelKey: 'profile' },
];

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const history = useHistory();
  const { t } = useTranslation();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 0',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path));

        return (
          <button
            key={item.path}
            onClick={() => history.push(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 12px',
              minWidth: '60px',
              color: isActive ? '#FF6B35' : '#888888',
              transition: 'color 0.2s ease',
            }}
          >
            <IonIcon
              icon={item.icon}
              style={{
                fontSize: '24px',
                marginBottom: '4px',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: '500',
                textTransform: 'capitalize',
              }}
            >
              {t(item.labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

