import React from 'react';
import { IonImg } from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import type { ContentSearchItem } from '../../types/contentTypes';
import './ContentCards.css';

interface ResourceCardProps {
    item: ContentSearchItem;
}

const ArrowRightIcon = () => (
    <svg className="resource-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const getMimeTypeLabel = (mimeType?: string): string => {
    switch (mimeType) {
        case 'video/x-youtube':
        case 'video/webm':
        case 'video/mp4':
            return 'Video';
        case 'application/pdf':
            return 'PDF';
        case 'application/epub':
            return 'EPUB';
        case 'application/vnd.ekstep.html-archive':
            return 'HTML';
        case 'application/vnd.ekstep.ecml-archive':
            return 'ECML';
        case 'application/vnd.ekstep.h5p-archive':
            return 'H5P';
        default:
            return 'View';
    }
};

const ResourceCard: React.FC<ResourceCardProps> = ({ item }) => {
    const history = useHistory();
    const location = useLocation<{ parentRoute?: string }>();
    const imageUrl = item.posterImage || item.appIcon || item.thumbnail || '';
    const viewLabel = getMimeTypeLabel(item.mimeType);

    return (
        <div
            className="resource-card"
            onClick={(e) => {
                e.stopPropagation();
                history.push({
                    pathname: `/content/${item.identifier}`,
                    state: { parentRoute: location.state?.parentRoute || (['/explore', '/home', '/my-learning'].includes(location.pathname) ? location.pathname : undefined) }
                });
            }}
        >
            {/* Image with overlay — mirrors CollectionCard structure */}
            <div className="resource-card-image-inner">
                {imageUrl
                    ? <IonImg src={imageUrl} alt={item.name} className="resource-card-image" />
                    : <div className="resource-card-image-placeholder" />
                }
                <div className="resource-card-gradient" />
                <div className="resource-card-badge">{viewLabel}</div>
            </div>

            {/* Content section */}
            <div className="resource-card-content">
                <h3 className="resource-card-title">{item.name || 'Untitled'}</h3>
                <div className="resource-card-action">
                    {viewLabel} <ArrowRightIcon />
                </div>
            </div>
        </div>
    );
};

export default ResourceCard;
