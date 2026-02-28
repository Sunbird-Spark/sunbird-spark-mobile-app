import React, { useRef } from 'react';
import { IonPopover } from '@ionic/react';

export const languages = [
    { code: 'en', name: 'English', dir: 'ltr' },
    { code: 'fr', name: 'French', dir: 'ltr' },
    { code: 'pt', name: 'Portuguese', dir: 'ltr' },
    { code: 'ar', name: 'Arabic', dir: 'rtl' },
];

export const LanguageSelector: React.FC = () => {
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
