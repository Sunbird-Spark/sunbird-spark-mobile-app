import React from 'react';
import { useLocation } from 'react-router-dom';
import { useIonRouter } from '@ionic/react';
import type { RelatedContentItem } from '../../types/contentTypes';
import CollectionCard from '../content/CollectionCard';
import ResourceCard from '../content/ResourceCard';
import { RightArrowIcon } from '../icons/CollectionIcons';

interface RelatedContentProps {
  items: RelatedContentItem[];
  t: (key: string) => string;
}

const RelatedContent: React.FC<RelatedContentProps> = ({ items, t }) => {
  const router = useIonRouter();
  const location = useLocation<{ parentRoute?: string }>();

  if (items.length === 0) return null;

  const navigateTo = (path: string) => {
    router.push(path, 'forward', 'push');
  };

  return (
    <div className="cp-related-section">
      <div className="cp-related-header">
        <h2 className="cp-related-title">
          {t('collection.relatedContent')}
        </h2>
      </div>
      <div className="cp-related-scroll">
        {items.map((item) =>
          item.cardType === 'collection' ? (
            <div
              key={item.identifier}
              role="button"
              tabIndex={0}
              className="cp-related-card-wrapper"
              onClick={() => navigateTo(`/collection/${item.identifier}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigateTo(`/collection/${item.identifier}`); if (e.key === ' ') { e.preventDefault(); navigateTo(`/collection/${item.identifier}`); } }}
            >
              <CollectionCard item={item} />
            </div>
          ) : (
            <div
              key={item.identifier}
              role="button"
              tabIndex={0}
              className="cp-related-card-wrapper"
              onClick={() => navigateTo(`/content/${item.identifier}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigateTo(`/content/${item.identifier}`); if (e.key === ' ') { e.preventDefault(); navigateTo(`/content/${item.identifier}`); } }}
            >
              <ResourceCard item={item} />
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default RelatedContent;
