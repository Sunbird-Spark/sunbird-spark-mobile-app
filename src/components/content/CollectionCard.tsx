import React from 'react';
import { IonImg } from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import type { ContentSearchItem } from '../../types/contentTypes';
import { getPlaceholderImage } from '../../utils/placeholderImages';
import './ContentCards.css';

interface CollectionCardProps {
    item: ContentSearchItem;
}

const UserIcon = () => (
    <svg className="collection-card-stats-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const CollectionCard: React.FC<CollectionCardProps> = ({ item }) => {
    const history = useHistory();
    const location = useLocation<{ parentRoute?: string }>();
    const imageUrl = item.posterImage || item.appIcon || item.thumbnail || getPlaceholderImage(item.identifier);
    const creator = item.creator ?? item.createdBy ?? 'Unknown';
    const lessons = item.leafNodesCount ?? 0;
    const badge = item.primaryCategory || 'Collection';

    return (
        <div
            className="collection-card"
            onClick={(e) => {
                e.stopPropagation();
                history.push({
                    pathname: `/collection/${item.identifier}`,
                    state: { parentRoute: location.state?.parentRoute || (['/explore', '/home', '/my-learning'].includes(location.pathname) ? location.pathname : undefined) }
                });
            }}
        >
            {/* Image */}
            <div className="collection-card-image-wrapper">
                <div className="collection-card-image-inner">
                    <IonImg src={imageUrl} alt={item.name} className="collection-card-image" />
                </div>
            </div>

            {/* Content */}
            <div className="collection-card-content">
                <div className="collection-card-badge">{badge}</div>
                <h3 className="collection-card-title">{item.name || 'Untitled'}</h3>
                <div className="collection-card-stats">
                    <UserIcon />
                    <span>{creator}</span>
                    <span>•</span>
                    <span>{lessons} Lessons</span>
                </div>
            </div>
        </div>
    );
};

export default CollectionCard;
