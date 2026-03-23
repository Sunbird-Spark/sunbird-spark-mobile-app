import React, { useEffect, useId, useRef } from 'react';
import { IonPopover } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_CONFIG } from '../../config/languages';

export const LanguageSelector: React.FC = () => {
    const popoverRef = useRef<HTMLIonPopoverElement>(null);
    const { i18n } = useTranslation();
    const uid = useId();
    const triggerId = `language-selector-trigger-${uid}`;

    const currentLang = LANGUAGE_CONFIG.find(l => l.code === i18n.language) ?? LANGUAGE_CONFIG[0];

    useEffect(() => {
        document.documentElement.dir = currentLang.dir;
    }, [currentLang.dir]);

    const handleLanguageChange = (lang: typeof LANGUAGE_CONFIG[0]) => {
        i18n.changeLanguage(lang.code);
        localStorage.setItem('appLanguage', lang.code);
        popoverRef.current?.dismiss();
    };

    return (
        <>
            <button
                id={triggerId}
                style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                }}
                aria-label="Select Language"
                data-testid="language-selector-button"
            >
                <svg width="1.1875rem" height="1.1875rem" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M4.75699 0H7.13548V2.375H11.8925V4.75H10.5463C10.1927 6.73308 9.25917 8.51576 7.92704 9.91695C8.87852 10.378 9.93898 10.65 11.0594 10.6839L12.2177 7.125H15.1349L19 19H16.499L15.726 16.625H11.6266L10.8536 19H8.35267L10.301 13.014C8.71289 12.8588 7.23258 12.3367 5.94622 11.5335C4.39422 12.5025 2.55991 13.0625 0.594623 13.0625H0V10.6875H0.594623C1.80302 10.6875 2.94666 10.4106 3.96539 9.91695C3.19171 9.10316 2.55247 8.16068 2.08322 7.125H4.7829C5.11403 7.64146 5.50507 8.11592 5.94622 8.53865C7.00161 7.52734 7.77017 6.21985 8.11788 4.75H0V2.375H4.75699V0ZM14.953 14.25L13.6763 10.3275L12.3997 14.25H14.953Z" fill="var(--ion-color-dark, var(--color-222222, #222222))" />
                </svg>
            </button>

            <IonPopover
                ref={popoverRef}
                trigger={triggerId}
                triggerAction="click"
                side="bottom"
                alignment="end"
                className="language-selector-popover"
            >
                <div style={{ padding: '0.5rem 0', background: 'var(--ion-color-light)' }}>
                    {LANGUAGE_CONFIG.map((lang) => {
                        const isActive = currentLang.code === lang.code;
                        return (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang)}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    background: 'transparent',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    color: isActive ? 'var(--ion-color-primary)' : 'var(--ion-color-dark, var(--color-222222, #222222))',
                                }}
                            >
                                {lang.label}
                            </button>
                        );
                    })}
                </div>
            </IonPopover>
        </>
    );
};
