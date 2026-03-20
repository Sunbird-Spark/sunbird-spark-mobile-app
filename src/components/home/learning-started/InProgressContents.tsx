import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import type { TrackableCollection } from '../../../types/collectionTypes';

interface InProgressContentsProps {
  courses: TrackableCollection[];
}

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
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => (
  <div style={{ position: 'relative', width: '151px', flexShrink: 0 }}>
    <div style={{
      width: '100%',
      height: '6px',
      backgroundColor: 'rgb(244, 244, 244)',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${progress}%`,
        height: '100%',
        backgroundColor: 'var(--ion-color-primary)',
        borderRadius: '10px',
      }} />
    </div>
  </div>
);

export const InProgressContents: React.FC<InProgressContentsProps> = ({ courses }) => {
  const { t } = useTranslation();
  const history = useHistory();

  const inProgressCourses = courses.filter(c => (c.completionPercentage ?? 0) < 100);
  const completedCourses = courses.filter(c => (c.completionPercentage ?? 0) >= 100);

  // Show in-progress courses if available, otherwise show completed courses
  const displayCourses = inProgressCourses.length > 0 ? inProgressCourses : completedCourses;
  const sectionTitle = inProgressCourses.length > 0 ? t('inProgressCourses') : t('completedCourses');

  if (displayCourses.length === 0) return null;

  return (
    <section style={{ padding: '0 16px 16px' }}>
      <h2 style={{
        fontFamily: 'var(--ion-font-family)',
        fontSize: '18px',
        fontWeight: 500,
        color: 'var(--ion-color-dark, var(--color-222222, #222222))',
        margin: '0 0 12px 0',
      }}>
        {sectionTitle}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {displayCourses.map((course) => {
          const collectionId = course.collectionId || course.courseId;
          const badge = (course as any).content?.primaryCategory || t('course');
          const title = course.courseName || (course as any).content?.name || 'Untitled Course';
          const thumbnail = (course as any).content?.posterImage
            || (course as any).content?.appIcon
            || '';
          const progress = course.completionPercentage ?? 0;

          return (
            <div
              key={collectionId || course.batchId}
              onClick={() => collectionId && history.push(`/collection/${collectionId}`)}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '2px 2px 20px 0px #00000017',
                padding: '14px',
                display: 'flex',
                flexDirection: 'row',
                gap: '12px',
                alignItems: 'flex-start',
                cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <ContentBadge label={badge} />
                <p style={{
                  fontFamily: 'var(--ion-font-family)',
                  fontSize: '16px',
                  fontWeight: 500,
                  color: 'var(--ion-color-dark, var(--color-222222, #222222))',
                  margin: 0,
                  lineHeight: 1.3,
                }}>
                  {title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ProgressBar progress={progress} />
                  <span style={{
                    fontFamily: 'var(--ion-font-family)',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: 'var(--ion-color-dark, var(--color-222222, #222222))',
                    flexShrink: 0,
                  }}>
                    {progress}%
                  </span>
                </div>
              </div>

              <div style={{
                width: '70px',
                height: '70px',
                flexShrink: 0,
                borderRadius: '10px',
                overflow: 'hidden',
              }}>
                {thumbnail && (
                  <img
                    src={thumbnail}
                    alt={title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
