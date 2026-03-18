import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { RelatedContentItem } from '../../types/contentTypes';
import CollectionCard from '../content/CollectionCard';
import ResourceCard from '../content/ResourceCard';
import { RightArrowIcon } from '../icons/CollectionIcons';

interface RelatedContentProps {
  items: RelatedContentItem[];
  t: (key: string) => string;
}

const RelatedContent: React.FC<RelatedContentProps> = ({ items, t }) => {
  const history = useHistory();
  const location = useLocation<{ parentRoute?: string }>();

  if (items.length === 0) return null;

  const navigateTo = (path: string) => {
    history.push({
      pathname: path,
      state: { parentRoute: location.state?.parentRoute || (['/explore', '/home', '/my-learning'].includes(location.pathname) ? location.pathname : undefined) }
    });
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
              className="cp-related-card-wrapper"
              onClick={() => navigateTo(`/collection/${item.identifier}`)}
            >
              <CollectionCard item={item} />
            </div>
          ) : (
            <div
              key={item.identifier}
              className="cp-related-card-wrapper"
              onClick={() => navigateTo(`/content/${item.identifier}`)}
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
