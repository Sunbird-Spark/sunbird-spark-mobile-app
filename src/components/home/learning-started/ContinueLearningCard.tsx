import React from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useIonRouter } from '@ionic/react';
import type { TrackableCollection } from '../../../types/collectionTypes';
import { getPlaceholderImage } from '../../../utils/placeholderImages';
import './ContinueLearningCard.css';

interface ContinueLearningCardProps {
  courses: TrackableCollection[];
}

const ArrowIcon = () => (
  <svg width="14" height="9" viewBox="0 0 13 9" fill="var(--ion-color-light)" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.5 0L7.09 1.41L9.67 4H0V6H9.67L7.09 8.59L8.5 10L13 5L8.5 0Z" transform="translate(0, -0.5)" />
  </svg>
);

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 52,
  strokeWidth = 5,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(240, 206, 148)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--ion-color-primary)" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
};

export const ContinueLearningCard: React.FC<ContinueLearningCardProps> = ({ courses }) => {
  const { t } = useTranslation();
  const router = useIonRouter();

  const incompleteCourses = _.filter(courses, c => (c.completionPercentage ?? 0) < 100);
  const lastAccessedCourse = _.first(
    _.orderBy(incompleteCourses, c => new Date(c.enrolledDate ?? 0).getTime(), 'desc')
  );

  const collectionId = _.get(lastAccessedCourse, 'collectionId') || _.get(lastAccessedCourse, 'courseId');

  if (!lastAccessedCourse) return null;

  const thumbnail = _.get(lastAccessedCourse, 'content.posterImage')
    || _.get(lastAccessedCourse, 'content.appIcon', '');

  const title = lastAccessedCourse.courseName
    || _.get(lastAccessedCourse, 'content.name', 'Untitled Course');

  const progress = lastAccessedCourse.completionPercentage ?? 0;

  const handleContinue = () => {
    if (collectionId && lastAccessedCourse.batchId) {
      router.push(`/collection/${collectionId}`, 'forward', 'push');
    }
  };

  return (
    <section className="continue-learning">
      <h2 className="continue-learning__heading">{t('continueFromWhereLeft')}</h2>

      <div className="continue-learning__card">
        <div className="continue-learning__thumbnail-wrapper">
          <img
            src={thumbnail || getPlaceholderImage(collectionId || 'default')}
            alt={title}
            className="continue-learning__thumbnail"
          />
        </div>

        <div className="continue-learning__content">
          <p className="continue-learning__title">{title}</p>

          <div className="continue-learning__progress-row">
            <CircularProgress progress={progress} size={26} strokeWidth={3} />
            <p className="continue-learning__progress-text">
              {t('completedPercent', { percent: progress })}
            </p>
          </div>

          <button onClick={handleContinue} className="continue-learning__button">
            <span className="continue-learning__button-text">{t('continueLearning')}</span>
            <ArrowIcon />
          </button>
        </div>
      </div>
    </section>
  );
};
