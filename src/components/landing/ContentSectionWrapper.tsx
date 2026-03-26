import React from 'react';
import { useIonRouter } from '@ionic/react';
import { IonSpinner } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { FaArrowRightLong } from 'react-icons/fa6';
import { useContentSearch } from '../../hooks/useContentSearch';
import type { ContentSearchItem } from '../../types/contentTypes';
import CollectionCard from '../content/CollectionCard';
import ResourceCard from '../content/ResourceCard';

const COLLECTION_MIME_TYPE = 'application/vnd.ekstep.content-collection';

interface ContentSectionWrapperProps {
  section: any;
}

export const ContentSectionWrapper: React.FC<ContentSectionWrapperProps> = ({ section }) => {
  const router = useIonRouter();
  const { t } = useTranslation();
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
        <h2 className="content-carousel-title">
          {title}
          <button
            className="content-carousel-arrow-inline"
            onClick={() => router.push('/explore', 'forward', 'push')}
            aria-label={t('viewAll')}
          >
            <FaArrowRightLong />
          </button>
        </h2>
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
