import React from 'react';
import { IonCard } from '@ionic/react';

interface ResourceItem {
    id: string;
    title: string;
    gradient: string;
    tag: string;
    actionLabel: string;
}

const resources: ResourceItem[] = [
    {
        id: 'r1',
        title: 'Elm Partners with Sunbird to Build a Graduate Development Program',
        gradient: 'linear-gradient(135deg, #1A2980 0%, #26D0CE 100%)',
        tag: 'Video',
        actionLabel: 'View The Video',
    },
    {
        id: 'r2',
        title: 'Bitcoin Engineering Foundations',
        gradient: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)',
        tag: 'Epub',
        actionLabel: 'View the Epub',
    },
    {
        id: 'r3',
        title: 'Data Engineering Foundations',
        gradient: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)',
        tag: 'Video',
        actionLabel: 'View The PDF',
    },
];

const ArrowIcon = () => (
    <svg width="14" height="9" viewBox="0 0 14 9" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 0L7.59 1.41L10.17 4H0V6H10.17L7.59 8.59L9 10L14 5L9 0Z" transform="translate(0, -0.5)" />
    </svg>
);

export const ResourceCenter: React.FC = () => {
    return (
        <section className="resource-center-section">
            {/* Header with lines */}
            <div className="resource-center-label-row">
                <span className="resource-center-line" />
                <span className="resource-center-label">Resource Center</span>
                <span className="resource-center-line" />
            </div>

            <h2 className="resource-center-heading">
                Stay ahead. What's next starts here.
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
