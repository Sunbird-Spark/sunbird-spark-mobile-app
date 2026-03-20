import React from 'react';
import { useTranslation } from 'react-i18next';

const BookIcon = () => (
    <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 2C9 2 7.5 0.5 4.5 0.5C1.5 0.5 0 2 0 2V14C0 14 1.5 13 4.5 13C7.5 13 9 14 9 14V2Z" stroke="var(--ion-color-primary-tint)" strokeWidth="1" fill="none" />
        <path d="M9 2C9 2 10.5 0.5 13.5 0.5C16.5 0.5 18 2 18 2V14C18 14 16.5 13 13.5 13C10.5 13 9 14 9 14V2Z" stroke="var(--ion-color-primary-tint)" strokeWidth="1" fill="none" />
    </svg>
);

const LearnersIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="6" cy="4" r="3" stroke="var(--ion-color-primary-tint)" strokeWidth="1" fill="none" />
        <path d="M0.5 14C0.5 11 3 9 6 9C9 9 11.5 11 11.5 14" stroke="var(--ion-color-primary-tint)" strokeWidth="1" fill="none" />
        <circle cx="12" cy="5" r="2" stroke="var(--ion-color-primary-tint)" strokeWidth="1" fill="none" />
        <path d="M12 9C14 9 15.5 10.5 15.5 13" stroke="var(--ion-color-primary-tint)" strokeWidth="1" fill="none" />
    </svg>
);

const CertificateIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 1H14V10H2V1Z" stroke="var(--ion-color-primary-tint)" strokeWidth="1" fill="none" />
        <circle cx="8" cy="5.5" r="2" stroke="var(--ion-color-primary-tint)" strokeWidth="1" fill="none" />
        <path d="M6 10V15L8 13.5L10 15V10" stroke="var(--ion-color-primary-tint)" strokeWidth="1" fill="none" />
    </svg>
);

export const StatsBar: React.FC = () => {
    const { t } = useTranslation();

    const stats = [
        { value: '500+', labelKey: 'courses', icon: <BookIcon /> },
        { value: '50K+', labelKey: 'activeLearners', icon: <LearnersIcon /> },
        { value: '200+', labelKey: 'certifications', icon: <CertificateIcon /> },
    ];

    return (
        <div className="stats-bar">
            {stats.map((stat, index) => (
                <React.Fragment key={stat.labelKey}>
                    <div className="stats-item">
                        <div className="stats-icon">{stat.icon}</div>
                        <div className="stats-value">{stat.value}</div>
                        <div className="stats-label">{t(stat.labelKey)}</div>
                    </div>
                    {index < stats.length - 1 && <div className="stats-divider" />}
                </React.Fragment>
            ))}
        </div>
    );
};

export default StatsBar;
