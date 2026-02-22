import React, { useRef } from 'react';
import { IonToolbar, IonPopover } from '@ionic/react';
import sunbirdLogo from '../../assets/sunbird-logo-new.png';

export const PublicWelcomeHeader: React.FC = () => {
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

          {/* Language dropdown */}
          <LanguageSelector />
        </div>
      </div>
    </IonToolbar>
  );
};

const languages = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'fr', name: 'French', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', dir: 'rtl' },
];

const LanguageSelector: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentLang, setCurrentLang] = React.useState(languages[0]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleLanguageChange = (lang: typeof languages[0]) => {
    setCurrentLang(lang);
    setIsOpen(false);

    // Change HTML direction
    document.documentElement.dir = lang.dir;
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => setIsOpen(true)}
        style={{
          background: 'none',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        aria-label="Select Language"
      >
        <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M4.75699 0H7.13548V2.375H11.8925V4.75H10.5463C10.1927 6.73308 9.25917 8.51576 7.92704 9.91695C8.87852 10.378 9.93898 10.65 11.0594 10.6839L12.2177 7.125H15.1349L19 19H16.499L15.726 16.625H11.6266L10.8536 19H8.35267L10.301 13.014C8.71289 12.8588 7.23258 12.3367 5.94622 11.5335C4.39422 12.5025 2.55991 13.0625 0.594623 13.0625H0V10.6875H0.594623C1.80302 10.6875 2.94666 10.4106 3.96539 9.91695C3.19171 9.10316 2.55247 8.16068 2.08322 7.125H4.7829C5.11403 7.64146 5.50507 8.11592 5.94622 8.53865C7.00161 7.52734 7.77017 6.21985 8.11788 4.75H0V2.375H4.75699V0ZM14.953 14.25L13.6763 10.3275L12.3997 14.25H14.953Z" fill="#222222" />
        </svg>
      </button>

      <IonPopover
        isOpen={isOpen}
        event={buttonRef.current as any}
        triggerAction="click"
        onDidDismiss={() => setIsOpen(false)}
        side="bottom"
        alignment="end"
        style={{
          '--width': 'max-content',
          '--min-width': 'auto',
          '--border-radius': '12px',
          '--box-shadow': '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ padding: '8px 0', background: '#ffffff' }}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang)}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                background: currentLang.code === lang.code ? '#fffef4' : 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: "'Rubik', sans-serif",
                fontSize: '14px',
                color: currentLang.code === lang.code ? '#a85236' : '#222222',
                fontWeight: currentLang.code === lang.code ? 600 : 400,
                transition: 'background 0.2s',
              }}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </IonPopover>
    </>
  );
};
