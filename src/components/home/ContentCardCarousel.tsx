import React from 'react';
import { useHistory } from 'react-router-dom';
import { IonCard } from '@ionic/react';
import { useTranslation } from 'react-i18next';

export interface ContentCardItem {
    id: string;
    title: string;
    thumbnail: string;
    tag: string;
    rating: number;
    lessons: number;
}

interface ContentCardCarouselProps {
    title: string;
    items: ContentCardItem[];
}

const StarIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="var(--ion-color-primary)" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 0.5L8.76 5.06L13.5 5.52L9.89 8.63L10.96 13.26L7 10.77L3.04 13.26L4.11 8.63L0.5 5.52L5.24 5.06L7 0.5Z" />
    </svg>
);

export const ContentCardCarousel: React.FC<ContentCardCarouselProps> = ({ title, items }) => {
    const history = useHistory();
    const { t } = useTranslation();

    return (
        <section className="content-carousel-section">
            <div className="content-carousel-header">
                <h2 className="content-carousel-title">{title}</h2>
                <button
                    className="content-carousel-arrow"
                    onClick={() => history.push('/courses')}
                    aria-label={t('viewAll')}
                >
                    <svg width="13" height="9" viewBox="0 0 13 9" fill="var(--ion-color-primary)" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.5 0L7.09 1.41L9.67 4H0V6H9.67L7.09 8.59L8.5 10L13 5L8.5 0Z" transform="translate(0, -0.5)" />
                    </svg>
                </button>
            </div>
            <div className="content-carousel-scroll">
                {items.map((item) => (
                    <IonCard
                        key={item.id}
                        className="content-card"
                        onClick={() => history.push(`/courses/${item.id}`)}
                        role="button"
                        tabIndex={0}
                        style={{ margin: 0 }}
                    >
                        <div className="content-card-image-wrapper">
                            <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="content-card-image"
                            />
                        </div>
                        <div className="content-card-tag-row">
                            <span className="content-card-tag">{item.tag}</span>
                        </div>
                        <h3 className="content-card-title">{item.title}</h3>
                        <div className="content-card-meta">
                            <StarIcon />
                            <span className="content-card-rating">{item.rating}</span>
                            <span className="content-card-dot">•</span>
                            <span className="content-card-lessons">{item.lessons} {t('lessons')}</span>
                        </div>
                    </IonCard>
                ))}
            </div>
        </section>
    );
};

export default ContentCardCarousel;
