import React from 'react';
import { useTranslation } from 'react-i18next';

// My Learning icon (non-filled book icon from bottom navigation)
const CoursesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M2.41667 11.5833H5.75C7.13333 11.5833 8.25 12.7025 8.25 14.0833V5.75C8.25 3.39333 8.25 2.21416 7.51666 1.4825C6.78333 0.749998 5.60833 0.75 3.25 0.75H2.41667C1.63333 0.75 1.2417 0.749999 0.991699 0.994166C0.750033 1.23833 0.75 1.63083 0.75 2.41667V9.91667C0.75 10.7025 0.750033 11.095 0.991699 11.3392C1.2417 11.5833 1.63333 11.5833 2.41667 11.5833Z"
            stroke="var(--ion-color-primary-tint)"
            strokeWidth="1.5"
        />
        <path
            d="M14.0833 11.5833H10.75C9.36667 11.5833 8.25 12.7025 8.25 14.0833V5.75C8.25 3.39333 8.25 2.21416 8.98334 1.4825C9.71667 0.749998 10.8917 0.75 13.25 0.75H14.0833C14.8667 0.75 15.2583 0.749999 15.5083 0.994166C15.75 1.23833 15.75 1.63083 15.75 2.41667V9.91667C15.75 10.7025 15.75 11.095 15.5083 11.3392C15.2583 11.5833 14.8667 11.5833 14.0833 11.5833Z"
            stroke="var(--ion-color-primary-tint)"
            strokeWidth="1.5"
        />
    </svg>
);

// Profile icon (non-filled from bottom navigation)
const LearnersIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M15.8751 18.8545C15.5255 17.7607 14.7547 16.7999 13.6845 16.115C12.6132 15.4301 11.3006 15.0621 9.95027 15.0621C8.59992 15.0621 7.28737 15.4301 6.21608 16.115C5.14581 16.7999 4.37505 17.7607 4.02545 18.8545"
            stroke="var(--ion-color-primary-tint)"
            strokeWidth="1.5"
        />
        <path
            d="M9.95043 10.9712C11.6441 10.9712 13.0171 9.59822 13.0171 7.90454C13.0171 6.21087 11.6441 4.83788 9.95043 4.83788C8.25675 4.83788 6.88376 6.21087 6.88376 7.90454C6.88376 9.59822 8.25675 10.9712 9.95043 10.9712Z"
            stroke="var(--ion-color-primary-tint)"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
        <path
            d="M16.0833 0.75H3.81667C2.12299 0.75 0.75 2.12299 0.75 3.81667V16.0833C0.75 17.777 2.12299 19.15 3.81667 19.15H16.0833C17.777 19.15 19.15 17.777 19.15 16.0833V3.81667C19.15 2.12299 17.777 0.75 16.0833 0.75Z"
            stroke="var(--ion-color-primary-tint)"
            strokeWidth="1.5"
        />
    </svg>
);

// Certificate icon (provided SVG)
const CertificateIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_1765_663)">
            <path d="M10.1333 15.4667H9.6C9.6 15.6687 9.71413 15.8533 9.89482 15.9437C10.0755 16.034 10.2917 16.0145 10.4533 15.8933L10.1333 15.4667ZM12.2667 13.8667L12.5867 13.44C12.397 13.2978 12.1363 13.2978 11.9467 13.44L12.2667 13.8667ZM14.4 15.4667L14.08 15.8933C14.2416 16.0145 14.4578 16.034 14.6385 15.9437C14.8192 15.8533 14.9333 15.6687 14.9333 15.4667H14.4ZM12.2667 11.7333C10.7939 11.7333 9.6 10.5394 9.6 9.06667H8.53333C8.53333 11.1285 10.2048 12.8 12.2667 12.8V11.7333ZM14.9333 9.06667C14.9333 10.5394 13.7394 11.7333 12.2667 11.7333V12.8C14.3285 12.8 16 11.1285 16 9.06667H14.9333ZM12.2667 6.4C13.7394 6.4 14.9333 7.59391 14.9333 9.06667H16C16 7.0048 14.3285 5.33333 12.2667 5.33333V6.4ZM12.2667 5.33333C10.2048 5.33333 8.53333 7.0048 8.53333 9.06667H9.6C9.6 7.59391 10.7939 6.4 12.2667 6.4V5.33333ZM9.6 11.2V15.4667H10.6667V11.2H9.6ZM10.4533 15.8933L12.5867 14.2933L11.9467 13.44L9.81333 15.04L10.4533 15.8933ZM11.9467 14.2933L14.08 15.8933L14.72 15.04L12.5867 13.44L11.9467 14.2933ZM14.9333 15.4667V11.2H13.8667V15.4667H14.9333ZM16 5.33333V1.6H14.9333V5.33333H16ZM14.4 0H1.6V1.06667H14.4V0ZM0 1.6V14.4H1.06667V1.6H0ZM1.6 16H8.53333V14.9333H1.6V16ZM0 14.4C0 15.2836 0.716345 16 1.6 16V14.9333C1.30545 14.9333 1.06667 14.6945 1.06667 14.4H0ZM1.6 0C0.716346 0 0 0.716345 0 1.6H1.06667C1.06667 1.30545 1.30545 1.06667 1.6 1.06667V0ZM16 1.6C16 0.716345 15.2836 0 14.4 0V1.06667C14.6945 1.06667 14.9333 1.30545 14.9333 1.6H16ZM3.2 5.33333H8.53333V4.26667H3.2V5.33333ZM3.2 8.53333H6.4V7.46667H3.2V8.53333Z" fill="var(--ion-color-primary-tint)"/>
        </g>
        <defs>
            <clipPath id="clip0_1765_663">
                <rect width="16" height="16" fill="white"/>
            </clipPath>
        </defs>
    </svg>
);

export const StatsBar: React.FC = () => {
    const { t } = useTranslation();

    const stats = [
        { value: '500+', labelKey: 'courses', icon: <CoursesIcon /> },
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
