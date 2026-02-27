import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
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
  label: string;
}

const navItems: NavItem[] = [
  { path: '/explore', icon: searchOutline, label: 'Explore' },
  { path: '/profile/my-learning', icon: bookOutline, label: 'My learning' },
  { path: '/', icon: homeOutline, activeIcon: home, label: 'Home' },
  { path: '/support', icon: helpCircleOutline, label: 'Support' },
  { path: '/profile', icon: personOutline, label: 'Profile' },
];

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const history = useHistory();

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
            onClick={() => history.push(item.path)}
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
              color: isActive ? '#a85236' : '#757575',
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
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

