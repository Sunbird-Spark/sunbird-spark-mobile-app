import React from 'react';
import { IonImg } from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const imageUrl = item.posterImage || item.appIcon || item.thumbnail || getPlaceholderImage(item.identifier);
    const creator = item.creator ?? item.createdBy ?? t('unknown');
    const lessons = item.leafNodesCount ?? 0;
    const badge = item.primaryCategory || t('collectionLabel');

    const handleNavigate = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        history.push({
            pathname: `/collection/${item.identifier}`,
            state: { parentRoute: location.state?.parentRoute || (['/explore', '/home', '/my-learning'].includes(location.pathname) ? location.pathname : undefined) }
        });
    };

    return (
        <div
            role="button"
            tabIndex={0}
            className="collection-card"
            onClick={handleNavigate}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavigate(e); }}
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
                <h3 className="collection-card-title">{item.name || t('untitled')}</h3>
                <div className="collection-card-stats">
                    <UserIcon />
                    <span>{creator}</span>
                    <span>•</span>
                    <span>{lessons} {t('lessons')}</span>
                </div>
            </div>
        </div>
    );
};

export default CollectionCard;
