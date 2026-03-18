import React from 'react';
import { useHistory } from 'react-router-dom';
import { IonSpinner } from '@ionic/react';
import { useContentSearch } from '../../hooks/useContentSearch';
import type { ContentSearchItem } from '../../types/contentTypes';
import CollectionCard from '../content/CollectionCard';
import ResourceCard from '../content/ResourceCard';

const COLLECTION_MIME_TYPE = 'application/vnd.ekstep.content-collection';

interface ContentSectionWrapperProps {
  section: any;
}

export const ContentSectionWrapper: React.FC<ContentSectionWrapperProps> = ({ section }) => {
  const history = useHistory();
  const sectionRequest = section?.criteria?.request || {};

  const { data, isLoading } = useContentSearch({
    request: {
      filters: sectionRequest.filters,
      limit: sectionRequest.limit ?? 3,
      offset: sectionRequest.offset ?? 0,
      query: sectionRequest.query ?? '',
      sort_by: sectionRequest.sort_by ?? { lastUpdatedOn: 'desc' },
    },
  });

  const title = section.title || section.name || '';
  const content: ContentSearchItem[] = data?.data?.content || [];

  if (isLoading) {
    return (
      <section className="content-carousel-section">
        <div className="content-carousel-header">
          <h2 className="content-carousel-title">{title}</h2>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <IonSpinner name="crescent" color="primary" />
        </div>
      </section>
    );
  }

  if (content.length === 0) return null;

  return (
    <section className="content-carousel-section">
      <div className="content-carousel-header">
        <h2 className="content-carousel-title">{title}</h2>
        <button
          className="content-carousel-arrow"
          onClick={() => history.push('/explore')}
          aria-label="View all"
        >
          <svg width="13" height="9" viewBox="0 0 13 9" fill="var(--ion-color-primary)" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.5 0L7.09 1.41L9.67 4H0V6H9.67L7.09 8.59L8.5 10L13 5L8.5 0Z" transform="translate(0, -0.5)" />
          </svg>
        </button>
      </div>
      <div className="content-carousel-scroll">
        {content.map((item) =>
          item.mimeType === COLLECTION_MIME_TYPE
            ? <CollectionCard key={item.identifier} item={item} />
            : <ResourceCard key={item.identifier} item={item} />
        )}
      </div>
    </section>
  );
};
