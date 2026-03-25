import React from 'react';
import { useLocation } from 'react-router-dom';
import { IonIcon, useIonRouter } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { homeOutline, home } from 'ionicons/icons';

// Custom SVG icons matching sunbird-portal design — use currentColor so the
// parent button's `color` style drives active/inactive tinting automatically.

const ExploreIcon: React.FC<{ isActive: boolean }> = ({ isActive }) =>
  isActive ? (
    <svg width="20" height="20" viewBox="0 0 15 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11.1424 6.85705C13.0359 6.85705 14.5709 5.32205 14.5709 3.42852C14.5709 1.535 13.0359 0 11.1424 0C9.24887 0 7.71387 1.535 7.71387 3.42852C7.71387 5.32205 9.24887 6.85705 11.1424 6.85705Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.42844 3.42911C9.42844 2.48626 10.1956 1.71484 11.1427 1.71484C12.0898 1.71484 12.857 2.48626 12.857 3.42911H9.42844ZM5.99992 3.42911C5.99992 2.82911 6.10278 2.25484 6.2922 1.71484H0.857131C0.383738 1.71484 0 2.10055 0 2.57197C0 3.0434 0.383738 3.42911 0.857131 3.42911H5.99992ZM6.68819 6.0005C7.0859 6.6862 7.63875 7.27762 8.29874 7.71476H0.857131C0.383738 7.71476 0 7.32905 0 6.85763C0 6.38621 0.383738 6.0005 0.857131 6.0005H6.68819ZM0.857131 10.2862C0.383738 10.2862 0 10.6719 0 11.1433C0 11.6147 0.383738 12.0004 0.857131 12.0004H12.857C13.3301 12.0004 13.7141 11.6147 13.7141 11.1433C13.7141 10.6719 13.3301 10.2862 12.857 10.2862H0.857131Z"
        fill="currentColor"
      />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 15 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11.1424" cy="3.42852" r="2.92853" stroke="currentColor" strokeWidth="1.2" />
      <path d="M0.857 2.57H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M0.857 6.86H8.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M0.857 11.14H12.857" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );

const MyLearningIcon: React.FC<{ isActive: boolean }> = ({ isActive }) =>
  isActive ? (
    <svg width="20" height="20" viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2.41667 11.5833H5.75C7.13333 11.5833 8.25 12.7025 8.25 14.0833V5.75C8.25 3.39333 8.25 2.21416 7.51666 1.4825C6.78333 0.749998 5.60833 0.75 3.25 0.75H2.41667C1.63333 0.75 1.2417 0.749999 0.991699 0.994166C0.750033 1.23833 0.75 1.63083 0.75 2.41667V9.91667C0.75 10.7025 0.750033 11.095 0.991699 11.3392C1.2417 11.5833 1.63333 11.5833 2.41667 11.5833Z"
        fill="currentColor"
      />
      <path
        d="M14.0833 11.5833H10.75C9.36667 11.5833 8.25 12.7025 8.25 14.0833V5.75C8.25 3.39333 8.25 2.21416 8.98334 1.4825C9.71667 0.749998 10.8917 0.75 13.25 0.75H14.0833C14.8667 0.75 15.2583 0.749999 15.5083 0.994166C15.75 1.23833 15.75 1.63083 15.75 2.41667V9.91667C15.75 10.7025 15.75 11.095 15.5083 11.3392C15.2583 11.5833 14.8667 11.5833 14.0833 11.5833Z"
        fill="currentColor"
      />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2.41667 11.5833H5.75C7.13333 11.5833 8.25 12.7025 8.25 14.0833V5.75C8.25 3.39333 8.25 2.21416 7.51666 1.4825C6.78333 0.749998 5.60833 0.75 3.25 0.75H2.41667C1.63333 0.75 1.2417 0.749999 0.991699 0.994166C0.750033 1.23833 0.75 1.63083 0.75 2.41667V9.91667C0.75 10.7025 0.750033 11.095 0.991699 11.3392C1.2417 11.5833 1.63333 11.5833 2.41667 11.5833Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M14.0833 11.5833H10.75C9.36667 11.5833 8.25 12.7025 8.25 14.0833V5.75C8.25 3.39333 8.25 2.21416 8.98334 1.4825C9.71667 0.749998 10.8917 0.75 13.25 0.75H14.0833C14.8667 0.75 15.2583 0.749999 15.5083 0.994166C15.75 1.23833 15.75 1.63083 15.75 2.41667V9.91667C15.75 10.7025 15.75 11.095 15.5083 11.3392C15.2583 11.5833 14.8667 11.5833 14.0833 11.5833Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );

const ProfileIcon: React.FC<{ isActive: boolean }> = ({ isActive }) =>
  isActive ? (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 8.00012C0 4.23012 -2.98023e-06 2.34017 1.172 1.17017C2.343 0.000166059 4.229 0.00012207 8 0.00012207H12C15.771 0.00012207 17.657 0.000166059 18.828 1.17017C20 2.34017 20 4.23012 20 8.00012V12.0001C20 15.7701 20 17.6601 18.828 18.8301C17.657 20.0001 15.771 20.0001 12 20.0001H8C4.229 20.0001 2.343 20.0001 1.172 18.8301C-2.98023e-06 17.6601 0 15.7701 0 12.0001V8.00012ZM5.73901 14.4501C6.96101 13.5101 8.459 13.0001 10 13.0001C11.541 13.0001 13.039 13.5101 14.261 14.4501C15.484 15.3801 16.363 16.7001 16.761 18.1901C16.904 18.7201 16.588 19.2702 16.054 19.4102C15.521 19.5602 14.973 19.2401 14.83 18.7101C14.545 17.6401 13.917 16.7002 13.044 16.0302C12.171 15.3602 11.101 15.0001 10 15.0001C8.899 15.0001 7.82899 15.3602 6.95599 16.0302C6.08299 16.7002 5.45498 17.6401 5.16998 18.7101C5.02698 19.2401 4.47898 19.5602 3.94598 19.4102C3.41198 19.2702 3.09601 18.7201 3.23901 18.1901C3.63701 16.7001 4.51601 15.3801 5.73901 14.4501ZM8 7.00012C8 5.90012 8.895 5.00012 10 5.00012C11.105 5.00012 12 5.90012 12 7.00012C12 8.10012 11.105 9.00012 10 9.00012C8.895 9.00012 8 8.10012 8 7.00012ZM10 3.00012C7.791 3.00012 6 4.79012 6 7.00012C6 9.21012 7.791 11.0001 10 11.0001C12.209 11.0001 14 9.21012 14 7.00012C14 4.79012 12.209 3.00012 10 3.00012Z"
        fill="currentColor"
      />
      <path
        d="M16.0005 0.5H4.00049C2.06749 0.5 0.500488 2.067 0.500488 4V16C0.500488 17.933 2.06749 19.5 4.00049 19.5H16.0005C17.9335 19.5 19.5005 17.933 19.5005 16V4C19.5005 2.067 17.9335 0.5 16.0005 0.5Z"
        stroke="currentColor"
      />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15.8751 18.8545C15.5255 17.7607 14.7547 16.7999 13.6845 16.115C12.6132 15.4301 11.3006 15.0621 9.95027 15.0621C8.59992 15.0621 7.28737 15.4301 6.21608 16.115C5.14581 16.7999 4.37505 17.7607 4.02545 18.8545"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9.95043 10.9712C11.6441 10.9712 13.0171 9.59822 13.0171 7.90454C13.0171 6.21087 11.6441 4.83788 9.95043 4.83788C8.25675 4.83788 6.88376 6.21087 6.88376 7.90454C6.88376 9.59822 8.25675 10.9712 9.95043 10.9712Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16.0833 0.75H3.81667C2.12299 0.75 0.75 2.12299 0.75 3.81667V16.0833C0.75 17.777 2.12299 19.15 3.81667 19.15H16.0833C17.777 19.15 19.15 17.777 19.15 16.0833V3.81667C19.15 2.12299 17.777 0.75 16.0833 0.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );

const HelpSupportIcon: React.FC<{ isActive: boolean }> = ({ isActive }) =>
  isActive ? (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14.75 7.75C14.75 4.45038 14.75 2.80012 13.7262 1.7755C12.7025 0.749997 11.0487 0.75 7.75 0.75C4.45125 0.75 2.79754 0.749997 1.77379 1.7755C0.750038 2.80012 0.75 4.45038 0.75 7.75V13C0.75 13.8251 0.750034 14.2373 1.00378 14.4936C1.26628 14.75 1.6775 14.75 2.5 14.75H7.75C11.0487 14.75 12.7025 14.75 13.7262 13.7245C14.75 12.6999 14.75 11.0496 14.75 7.75Z"
        fill="currentColor"
      />
      <path
        d="M5.125 6H10.375"
        stroke="var(--ion-background-color, #fff)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.125 9.5H7.75"
        stroke="var(--ion-background-color, #fff)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14.75 7.75C14.75 4.45038 14.75 2.80012 13.7262 1.7755C12.7025 0.749997 11.0487 0.75 7.75 0.75C4.45125 0.75 2.79754 0.749997 1.77379 1.7755C0.750038 2.80012 0.75 4.45038 0.75 7.75V13C0.75 13.8251 0.750034 14.2373 1.00378 14.4936C1.26628 14.75 1.6775 14.75 2.5 14.75H7.75C11.0487 14.75 12.7025 14.75 13.7262 13.7245C14.75 12.6999 14.75 11.0496 14.75 7.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.125 6H10.375"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.125 9.5H7.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

// Order matters: more specific prefixes must come before shorter ones.
// Mirrors the PATH_TO_NAV pattern from sunbird-portal/frontend/src/components/layout/PageLayout.tsx
const PATH_TO_NAV: { prefix: string; navId: string }[] = [
  { prefix: '/profile/my-learning', navId: 'myLearning' },
  { prefix: '/profile', navId: 'profile' },
  { prefix: '/home', navId: 'home' },
  { prefix: '/explore', navId: 'explore' },
  { prefix: '/support', navId: 'helpAndSupport' },
];

function getActiveNavId(pathname: string): string {
  for (const { prefix, navId } of PATH_TO_NAV) {
    if (pathname.startsWith(prefix)) return navId;
  }
  return 'home';
}

interface NavItem {
  id: string;
  path: string;
  labelKey: string;
  renderIcon: (isActive: boolean) => React.ReactNode;
}

// Only Home switches between outline and filled (matching portal: FiHome → GoHomeFill).
// All other icons stay the same shape; only color changes via currentColor.
const navItems: NavItem[] = [
  {
    id: 'home',
    path: '/home',
    labelKey: 'home',
    renderIcon: (isActive) => (
      <IonIcon icon={isActive ? home : homeOutline} style={{ fontSize: '24px' }} />
    ),
  },
  {
    id: 'myLearning',
    path: '/profile/my-learning',
    labelKey: 'myLearning',
    renderIcon: (isActive) => <MyLearningIcon isActive={isActive} />,
  },
  {
    id: 'explore',
    path: '/explore',
    labelKey: 'explore',
    renderIcon: (isActive) => <ExploreIcon isActive={isActive} />,
  },
  {
    id: 'helpAndSupport',
    path: '/support',
    labelKey: 'navSupport',
    renderIcon: (isActive) => <HelpSupportIcon isActive={isActive} />,
  },
  {
    id: 'profile',
    path: '/profile',
    labelKey: 'profile',
    renderIcon: (isActive) => <ProfileIcon isActive={isActive} />,
  },
];

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const router = useIonRouter();
  const { t } = useTranslation();

  const activeNavId = getActiveNavId(location.pathname);

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
        paddingBottom: 'max(8px, var(--safe-area-bottom))',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
      }}
    >
      {navItems.map((item) => {
        const isActive = activeNavId === item.id;

        return (
          <button
            key={item.id}
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
              color: isActive
                ? 'var(--ion-color-primary)'
                : 'var(--ion-color-primary-tint)',
              transition: 'color 0.2s ease',
            }}
          >
            <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.renderIcon(isActive)}
            </div>
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
