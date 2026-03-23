import React from 'react';
import { IonCard } from '@ionic/react';
import { useTranslation } from 'react-i18next';

export interface ResourceItem {
    id: string;
    title: string;
    gradient: string;
    tag: string;
    actionLabel: string;
}

interface ResourceCenterProps {
    resources: ResourceItem[];
    title?: string;
    subtitle?: string;
}

const ArrowIcon = () => (
    <svg width="14" height="9" viewBox="0 0 14 9" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 0L7.59 1.41L10.17 4H0V6H10.17L7.59 8.59L9 10L14 5L9 0Z" transform="translate(0, -0.5)" />
    </svg>
);

export const ResourceCenter: React.FC<ResourceCenterProps> = ({ resources, title, subtitle }) => {
    const { t } = useTranslation();
    if (resources.length === 0) return null;

    return (
        <section className="resource-center-section">
            {/* Header with lines */}
            <div className="resource-center-label-row">
                <span className="resource-center-line" />
                <span className="resource-center-label">{title || t('resourceCenter')}</span>
                <span className="resource-center-line" />
            </div>

            <h2 className="resource-center-heading">
                {subtitle || t('resourceCenterSubtitle')}
            </h2>

            {/* Cards carousel */}
            <div className="resource-center-scroll">
                {resources.map((resource) => (
                    <IonCard
                        key={resource.id}
                        className="resource-card"
                        style={{ background: resource.gradient }}
                    >
                        <div className="resource-card-tag-top-left">
                            <span className="resource-card-tag">{resource.tag}</span>
                        </div>
                        <div className="resource-card-overlay-gradient">
                            <h3 className="resource-card-title">{resource.title}</h3>
                            <div className="resource-card-action">
                                <span className="resource-card-action-label">{resource.actionLabel}</span>
                                <ArrowIcon />
                            </div>
                        </div>
                    </IonCard>
                ))}
            </div>
        </section>
    );
};

export default ResourceCenter;
