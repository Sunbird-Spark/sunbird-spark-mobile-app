import React from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useIonRouter } from '@ionic/react';
import type { TrackableCollection } from '../../../types/collectionTypes';
import { getPlaceholderImage } from '../../../utils/placeholderImages';
import './InProgressContents.css';

interface InProgressContentsProps {
  courses: TrackableCollection[];
}

export const InProgressContents: React.FC<InProgressContentsProps> = ({ courses }) => {
  const { t } = useTranslation();
  const router = useIonRouter();

  const inProgressCourses = _.filter(courses, c => (c.completionPercentage ?? 0) < 100);
  const completedCourses = _.filter(courses, c => (c.completionPercentage ?? 0) >= 100);

  const displayCourses = _.isEmpty(inProgressCourses) ? completedCourses : inProgressCourses;
  const sectionTitle = _.isEmpty(inProgressCourses) ? t('completedCourses') : t('inProgressCourses');

  if (_.isEmpty(displayCourses)) return null;

  return (
    <section className="in-progress">
      <h2 className="in-progress__heading">{sectionTitle}</h2>

      <div className="in-progress__list">
        {displayCourses.map((course) => {
          const collectionId = course.collectionId || course.courseId;
          const badge = _.get(course, 'content.primaryCategory', t('course'));
          const title = course.courseName || _.get(course, 'content.name') || t('untitled');
          const thumbnail = _.get(course, 'content.posterImage')
            || _.get(course, 'content.appIcon', '');
          const progress = course.completionPercentage ?? 0;

          return (
            <div
              key={collectionId || course.batchId}
              role="button"
              tabIndex={0}
              className="in-progress__card"
              onClick={() => collectionId && router.push(`/collection/${collectionId}`, 'forward', 'push')}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && collectionId) router.push(`/collection/${collectionId}`, 'forward', 'push'); }}
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
                <img
                  src={thumbnail || getPlaceholderImage(collectionId || 'default')}
                  alt={title}
                  className="in-progress__thumbnail"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
