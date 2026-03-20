import React from 'react';
import { useTranslation } from 'react-i18next';
import { getInProgressCourses } from '../../../data/mockData';

interface ContentBadgeProps {
  label: string;
}

const ContentBadge: React.FC<ContentBadgeProps> = ({ label }) => (
  <span style={{
    display: 'inline-block',
    alignSelf: 'flex-start',
    backgroundColor: 'rgb(255, 241, 199)',
    border: '1px solid var(--ion-color-primary-tint)',
    borderRadius: '36px',
    padding: '4px 10px',
    fontFamily: 'var(--ion-font-family)',
    fontSize: '14px',
    fontWeight: 400,
    color: 'var(--ion-color-dark, var(--color-000000, #000000))',
    whiteSpace: 'nowrap',
  }}>
    {label}
  </span>
);

interface ProgressBarProps {
  progress: number; // 0–100
  totalWidth?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => (
  <div style={{ position: 'relative', width: '151px', flexShrink: 0 }}>
    {/* Track */}
    <div style={{
      width: '100%',
      height: '6px',
      backgroundColor: 'rgb(244, 244, 244)',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      {/* Fill */}
      <div style={{
        width: `${progress}%`,
        height: '100%',
        backgroundColor: 'var(--ion-color-primary)',
        borderRadius: '10px',
      }} />
    </div>
  </div>
);

export const InProgressContents: React.FC = () => {
  const { t } = useTranslation();
  const inProgressCourses = getInProgressCourses();

  // Extend the list for display – show each course twice to match the design's 4-item list
  const displayCourses = [...inProgressCourses, ...inProgressCourses].slice(0, 4);

  return (
    <section style={{ padding: '0 16px 16px' }}>
      <h2 style={{
        fontFamily: 'var(--ion-font-family)',
        fontSize: '18px',
        fontWeight: 500,
        color: 'var(--ion-color-dark, var(--color-222222, #222222))',
        margin: '0 0 12px 0',
      }}>
        {t('inProgressContents')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {displayCourses.map((course, idx) => {
          const isTextbook = idx % 2 === 1;
          const badgeLabel = isTextbook ? t('textbook') : t('course');

          return (
            <div
              key={`${course.id}-${idx}`}
              style={{
                backgroundColor: 'var(--ion-color-light)',
                borderRadius: '16px',
                boxShadow: '2px 2px 20px rgba(0, 0, 0, 0.09)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'row',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              {/* Left: text content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <ContentBadge label={badgeLabel} />

                <p style={{
                  fontFamily: 'var(--ion-font-family)',
                  fontSize: '16px',
                  fontWeight: 500,
                  color: 'var(--ion-color-dark, var(--color-222222, #222222))',
                  margin: 0,
                  lineHeight: 1.3,
                }}>
                  {course.title}
                </p>

                {/* Progress row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <ProgressBar progress={course.progress} />
                  <span style={{
                    fontFamily: 'var(--ion-font-family)',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: 'var(--ion-color-dark, var(--color-222222, #222222))',
                    flexShrink: 0,
                  }}>
                    {course.progress}%
                  </span>
                </div>
              </div>

              {/* Right: thumbnail */}
              <div style={{
                width: '70px',
                height: '70px',
                flexShrink: 0,
                borderRadius: '10px',
                overflow: 'hidden',
              }}>
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
