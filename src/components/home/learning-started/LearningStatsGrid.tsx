import React from 'react';
import { useTranslation } from 'react-i18next';
import './LearningStatsGrid.css';

interface LearningStatsGridProps {
  totalCourses: number;
  coursesInProgress: number;
  coursesCompleted: number;
  certificationsEarned: number;
}

const ListIcon = ({ color }: { color: string }) => (
  <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="14" height="18" rx="2" stroke={color} strokeWidth="2" fill="none" />
    <line x1="3" y1="5" x2="11" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="3" y1="9" x2="9" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="3" y1="13" x2="11" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const InProgressIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="9" r="8" stroke={color} strokeWidth="2" fill="none" />
    <path d="M9 5V9L12 11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = ({ color }: { color: string }) => (
  <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="14" height="16" rx="2" stroke={color} strokeWidth="2" fill="none" />
    <path d="M3 8L6 11L11 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CertificateIcon = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M14.5 0H2.5C1.4 0 0.5 0.9 0.5 2V12C0.5 13.1 1.4 14 2.5 14H8.5V17L10.5 16L12.5 17V14H14.5C15.6 14 16.5 13.1 16.5 12V2C16.5 0.9 15.6 0 14.5 0ZM14.5 12H2.5V2H14.5V12Z" />
    <rect x="4.5" y="5" width="8" height="1.5" rx="0.75" fill={color} />
    <rect x="4.5" y="8" width="5" height="1.5" rx="0.75" fill={color} />
  </svg>
);

const pad = (n: number): string => String(n).padStart(2, '0');

export const LearningStatsGrid: React.FC<LearningStatsGridProps> = ({
  totalCourses,
  coursesInProgress,
  coursesCompleted,
  certificationsEarned,
}) => {
  const { t } = useTranslation();

  const stats = [
    {
      value: pad(totalCourses),
      labelKey: 'totalCourses',
      tileBg: 'var(--ion-color-secondary)',
      iconBg: 'rgb(61, 143, 167)',
      icon: <ListIcon color="var(--ion-color-light)" />,
    },
    {
      value: pad(coursesInProgress),
      labelKey: 'coursesInProgress',
      tileBg: 'var(--ion-color-primary-tint)',
      iconBg: 'rgb(176, 102, 36)',
      icon: <InProgressIcon color="var(--ion-color-light)" />,
    },
    {
      value: pad(coursesCompleted),
      labelKey: 'coursesCompleted',
      tileBg: 'rgb(102, 166, 130)',
      iconBg: 'rgb(49, 134, 86)',
      icon: <CheckIcon color="var(--ion-color-light)" />,
    },
    {
      value: pad(certificationsEarned),
      labelKey: 'certificationsEarned',
      tileBg: 'var(--ion-color-medium)',
      iconBg: 'rgb(116, 76, 101)',
      icon: <CertificateIcon color="var(--ion-color-light)" />,
    },
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <div
          key={stat.labelKey}
          className="stats-grid__tile"
          style={{ backgroundColor: stat.tileBg }}
        >
          <div className="stats-grid__top-row">
            <p className="stats-grid__value">{stat.value}</p>
            <div className="stats-grid__icon" style={{ backgroundColor: stat.iconBg }}>
              {stat.icon}
            </div>
          </div>
          <p className="stats-grid__label">{t(stat.labelKey)}</p>
        </div>
      ))}
    </div>
  );
};
