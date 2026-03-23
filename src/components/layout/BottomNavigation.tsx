import React from 'react';
import { useLocation } from 'react-router-dom';
import { IonIcon, useIonRouter } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import {
  searchOutline,
  bookOutline,
  homeOutline,
  home,
  helpCircleOutline,
  personOutline,
} from 'ionicons/icons';

interface NavItem {
  path: string;
  icon: string;
  activeIcon?: string;
  labelKey: string;
}

const navItems: NavItem[] = [
  { path: '/explore', icon: searchOutline, labelKey: 'explore' },
  { path: '/profile/my-learning', icon: bookOutline, labelKey: 'myLearning' },
  { path: '/', icon: homeOutline, activeIcon: home, labelKey: 'home' },
  { path: '/support', icon: helpCircleOutline, labelKey: 'helpAndSupport' },
  { path: '/profile', icon: personOutline, labelKey: 'profile' },
];

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const router = useIonRouter();
  const { t } = useTranslation();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'var(--ion-color-light)',
        borderTop: '1px solid var(--ion-color-step-100, var(--color-e0e0e0, #e0e0e0))',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 0',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
      }}
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path));

        const iconToUse = isActive && item.activeIcon ? item.activeIcon : item.icon;

        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path, 'root', 'replace')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              minWidth: '60px',
              color: isActive ? 'var(--ion-color-primary)' : 'var(--ion-color-medium, var(--color-757575, #757575))',
              transition: 'color 0.2s ease',
            }}
          >
            <IonIcon
              icon={iconToUse}
              style={{
                fontSize: '24px',
                marginBottom: '4px',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: isActive ? '500' : '400',
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
