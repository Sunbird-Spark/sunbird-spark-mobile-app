import React from 'react';
import type { CollectionData } from '../../types/collectionTypes';
import { CheckIcon, CalendarIcon, VideoIcon } from '../icons/CollectionIcons';

interface CollectionOverviewProps {
  collectionData: CollectionData;
  isCourse: boolean;
  t: (key: string) => string;
}

const CollectionOverview: React.FC<CollectionOverviewProps> = ({ collectionData, isCourse, t }) => {
  return (
    <div className="cp-overview-wrapper">
      {/* Title + Lessons */}
      <div className="cp-title-section">
        <h1 className="cp-title">{collectionData.title}</h1>
        {collectionData.description && (
          <p className="cp-description">{collectionData.description}</p>
        )}
      </div>

      {/* Course Overview */}
      <div className="cp-overview-section">
        <h2 className="cp-section-title">
          {isCourse ? t('collection.courseOverview') : t('collection.collectionOverview')}
        </h2>
        <div className="cp-overview-meta">
          <div className="cp-overview-meta-item">
            <CalendarIcon />
            <span>{collectionData.units} {t('collection.units')}</span>
          </div>
          <div className="cp-overview-meta-item">
            <VideoIcon />
            <span>{collectionData.lessons} {t('collection.lessons')}</span>
          </div>
        </div>
      </div>

      {/* Best Suited For */}
      {collectionData.audience.length > 0 && (
        <div className="cp-best-suited-section">
          <h2 className="cp-section-title">{t('collection.bestSuitedFor')}</h2>
          <ul className="cp-check-list">
            {collectionData.audience.map((role, index) => (
              <li key={index}>
                <CheckIcon />
                {role}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CollectionOverview;
