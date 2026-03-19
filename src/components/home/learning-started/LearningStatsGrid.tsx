import React from 'react';
import { useTranslation } from 'react-i18next';

interface StatTile {
  value: string;
  label: string;
  labelKey: string;
  tileBg: string;
  iconBg: string;
  icon: React.ReactNode;
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

const statConfigs = [
  {
    value: '30',
    labelKey: 'totalContents',
    tileBg: 'var(--ion-color-secondary)',
    iconBg: 'rgb(61, 143, 167)',
    icon: <ListIcon color="var(--ion-color-light)" />,
  },
  {
    value: '05',
    labelKey: 'contentsInProgress',
    tileBg: 'var(--ion-color-primary-tint)',
    iconBg: 'rgb(176, 102, 36)',
    icon: <InProgressIcon color="var(--ion-color-light)" />,
  },
  {
    value: '13',
    labelKey: 'contentsCompleted',
    tileBg: 'rgb(102, 166, 130)',
    iconBg: 'rgb(49, 134, 86)',
    icon: <CheckIcon color="var(--ion-color-light)" />,
  },
  {
    value: '06',
    labelKey: 'certificationsEarned',
    tileBg: 'var(--ion-color-medium)',
    iconBg: 'rgb(116, 76, 101)',
    icon: <CertificateIcon color="var(--ion-color-light)" />,
  },
];

export const LearningStatsGrid: React.FC = () => {
  const { t } = useTranslation();
  const stats: StatTile[] = statConfigs.map(s => ({ ...s, label: t(s.labelKey) }));

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      padding: '12px 16px',
    }}>
      {stats.map((stat) => (
        <div
          key={stat.labelKey}
          style={{
            backgroundColor: stat.tileBg,
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '105px',
          }}
        >
          {/* Top row: value + icon */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}>
            {/* Value */}
            <p style={{
              fontFamily: 'var(--ion-font-family)',
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--ion-color-light)',
              margin: 0,
              lineHeight: 1,
            }}>
              {stat.value}
            </p>

            {/* Icon container — top-right */}
            <div style={{
              backgroundColor: stat.iconBg,
              borderRadius: '8px',
              width: '33px',
              height: '33px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {stat.icon}
            </div>
          </div>

          {/* Label */}
          <p style={{
            fontFamily: 'var(--ion-font-family)',
            fontSize: '14px',
            fontWeight: 400,
            color: 'var(--ion-color-light)',
            margin: 0,
            lineHeight: 1.2,
          }}>
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
};
