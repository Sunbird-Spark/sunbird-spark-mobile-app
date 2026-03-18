import React from 'react';
import { useHistory } from 'react-router-dom';
import { IonCard } from '@ionic/react';

export interface Category {
    name: string;
    gradient: string;
}

interface CategoriesGridProps {
    categories: Category[];
    title?: string;
}

export const CategoriesGrid: React.FC<CategoriesGridProps> = ({ categories, title }) => {
    const history = useHistory();

    if (categories.length === 0) return null;

    return (
        <section className="categories-section">
            <div className="categories-header">
                <h2 className="categories-title">{title || 'Browse Through Categories'}</h2>
                <button
                    className="categories-arrow"
                    onClick={() => history.push('/explore')}
                    aria-label="Browse all categories"
                >
                    <svg width="13" height="9" viewBox="0 0 13 9" fill="var(--ion-color-primary)" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.5 0L7.09 1.41L9.67 4H0V6H9.67L7.09 8.59L8.5 10L13 5L8.5 0Z" transform="translate(0, -0.5)" />
                    </svg>
                </button>
            </div>
            <div className="categories-scroll">
                {categories.map((cat) => (
                    <IonCard
                        key={cat.name}
                        className="category-tile"
                        onClick={() => history.push('/explore')}
                        style={{ '--background': cat.gradient, margin: 0 } as React.CSSProperties}
                    >
                        <div className="category-tile-overlay-gradient">
                            <span className="category-tile-name">{cat.name}</span>
                        </div>
                    </IonCard>
                ))}
                <div
                    className="category-browse-all"
                    onClick={() => history.push('/explore')}
                    role="button"
                    tabIndex={0}
                >
                    <div className="category-browse-all-circle">
                        <svg width="23" height="14" viewBox="0 0 23 14" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.5 0L14.09 1.41L18.67 6H0V8H18.67L14.09 12.59L15.5 14L23 7L15.5 0Z" />
                        </svg>
                    </div>
                    <span className="category-browse-all-text">Browse All</span>
                </div>
            </div>
        </section>
    );
};

export default CategoriesGrid;
