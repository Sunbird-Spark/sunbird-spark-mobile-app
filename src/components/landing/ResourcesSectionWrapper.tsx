import React from 'react';
import { IonSpinner } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useContentSearch } from '../../hooks/useContentSearch';
import type { ContentSearchItem } from '../../types/contentTypes';
import ResourceCard from '../content/ResourceCard';

interface ResourcesSectionWrapperProps {
  section: any;
}

export const ResourcesSectionWrapper: React.FC<ResourcesSectionWrapperProps> = ({ section }) => {
  const { t } = useTranslation();
  const sectionRequest = section?.criteria?.request || {};
  const mergedFilters = {
    ...sectionRequest.filters,
    primaryCategory: ['Resource', 'Learning Resource'],
  };

  const { data, isLoading } = useContentSearch({
    request: {
      filters: mergedFilters,
      limit: sectionRequest.limit ?? 3,
      offset: sectionRequest.offset ?? 0,
      query: sectionRequest.query ?? '',
      sort_by: sectionRequest.sort_by ?? { lastUpdatedOn: 'desc' },
    },
  });

  const label = t('resourceCenter');
  const heading = section.subtitle || section.title || t('resourceCenterSubtitle');
  const content: ContentSearchItem[] = data?.data?.content || [];

  if (isLoading) {
    return (
      <section className="resource-center-section">
        <div className="resource-center-label-row">
          <span className="resource-center-line" />
          <span className="resource-center-label">{label}</span>
          <span className="resource-center-line" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <IonSpinner name="crescent" color="primary" />
        </div>
      </section>
    );
  }

  if (content.length === 0) return null;

  return (
    <section className="resource-center-section">
      <div className="resource-center-label-row">
        <span className="resource-center-line" />
        <span className="resource-center-label">{label}</span>
        <span className="resource-center-line" />
      </div>

      <h2 className="resource-center-heading">{heading}</h2>

      <div className="resource-center-scroll">
        {content.map((item) => (
          <div key={item.identifier} className="resource-card-carousel-wrapper">
            <ResourceCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
};
