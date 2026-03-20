import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import type { TrackableCollection, HierarchyContentNode } from '../../../types/collectionTypes';
import { useCollection } from '../../../hooks/useCollection';

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

function getFirstLeafContentId(node: HierarchyContentNode | undefined): string | undefined {
  if (!node) return undefined;
  const COLLECTION_MIME = 'application/vnd.ekstep.content-collection';
  if (node.mimeType && node.mimeType !== COLLECTION_MIME) return node.identifier;
  for (const child of node.children ?? []) {
    const id = getFirstLeafContentId(child);
    if (id) return id;
  }
  return undefined;
}

export const ContinueLearningCard: React.FC<ContinueLearningCardProps> = ({ courses }) => {
  const { t } = useTranslation();
  const history = useHistory();

  const lastAccessedCourse = courses
    .filter(c => (c.completionPercentage ?? 0) < 100)
    .sort((a, b) => new Date(b.enrolledDate ?? 0).getTime() - new Date(a.enrolledDate ?? 0).getTime())[0];

  const collectionId = lastAccessedCourse?.collectionId || lastAccessedCourse?.courseId;
  const { data: collectionData } = useCollection(collectionId);

  if (!lastAccessedCourse) return null;

  const contentId = lastAccessedCourse.contentId
    ?? getFirstLeafContentId(collectionData?.children?.[0]);

  const thumbnail = (lastAccessedCourse as any).content?.posterImage
    || (lastAccessedCourse as any).content?.appIcon
    || '';

  const title = lastAccessedCourse.courseName
    || (lastAccessedCourse as any).content?.name
    || 'Untitled Course';

  const progress = lastAccessedCourse.completionPercentage ?? 0;

  const handleContinue = () => {
    if (collectionId && lastAccessedCourse.batchId) {
      const path = contentId
        ? `/collection/${collectionId}`
        : `/collection/${collectionId}`;
      history.push(path);
    }
  };

  return (
    <section style={{ padding: '0 16px 16px' }}>
      <h2 style={{
        fontFamily: 'var(--ion-font-family)',
        fontSize: '18px',
        fontWeight: 500,
        color: 'var(--ion-color-dark, var(--color-222222, #222222))',
        margin: '0 0 12px 0',
      }}>
        {t('continueFromWhereLeft')}
      </h2>

      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '2px 2px 20px 0px #00000017',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        minHeight: '200px',
      }}>
        <div style={{
          width: '104px',
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: '15px',
          margin: '15px 0 15px 15px',
        }}>
          <img
            src={thumbnail}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '15px' }}
          />
        </div>

        <div style={{
          flex: 1,
          padding: '16px 16px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <p style={{
            fontFamily: 'var(--ion-font-family)',
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--ion-color-dark, var(--color-222222, #222222))',
            margin: '0 0 12px 0',
            lineHeight: 1.4,
          }}>
            {title}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <CircularProgress progress={progress} size={26} strokeWidth={3} />
            <p style={{
              fontFamily: 'var(--ion-font-family)',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--ion-color-dark, var(--color-222222, #222222))',
              margin: 0,
            }}>
              {t('completedPercent', { percent: progress })}
            </p>
          </div>

          <button
            onClick={handleContinue}
            style={{
              backgroundColor: 'var(--ion-color-primary)',
              borderRadius: '10px',
              border: 'none',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <span style={{
              fontFamily: 'var(--ion-font-family)',
              fontSize: '16px',
              fontWeight: 500,
              color: 'var(--ion-color-light)',
            }}>
              {t('continueLearning')}
            </span>
            <ArrowIcon />
          </button>
        </div>
      </div>
    </section>
  );
};
