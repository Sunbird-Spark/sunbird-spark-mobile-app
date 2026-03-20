import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import type { TrackableCollection } from '../../../types/collectionTypes';
import './InProgressContents.css';

interface InProgressContentsProps {
  courses: TrackableCollection[];
}

export const InProgressContents: React.FC<InProgressContentsProps> = ({ courses }) => {
  const { t } = useTranslation();
  const history = useHistory();

  const inProgressCourses = courses.filter(c => (c.completionPercentage ?? 0) < 100);
  const completedCourses = courses.filter(c => (c.completionPercentage ?? 0) >= 100);

  const displayCourses = inProgressCourses.length > 0 ? inProgressCourses : completedCourses;
  const sectionTitle = inProgressCourses.length > 0 ? t('inProgressCourses') : t('completedCourses');

  if (displayCourses.length === 0) return null;

  return (
    <section className="in-progress">
      <h2 className="in-progress__heading">{sectionTitle}</h2>

      <div className="in-progress__list">
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
              className="in-progress__card"
              onClick={() => collectionId && history.push(`/collection/${collectionId}`)}
            >
              <div className="in-progress__card-content">
                <span className="in-progress__badge">{badge}</span>
                <p className="in-progress__title">{title}</p>
                <div className="in-progress__progress-row">
                  <div className="in-progress__progress-bar-track">
                    <div className="in-progress__progress-bar-bg">
                      <div
                        className="in-progress__progress-bar-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="in-progress__progress-text">{progress}%</span>
                </div>
              </div>

              <div className="in-progress__thumbnail-wrapper">
                {thumbnail && (
                  <img src={thumbnail} alt={title} className="in-progress__thumbnail" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
