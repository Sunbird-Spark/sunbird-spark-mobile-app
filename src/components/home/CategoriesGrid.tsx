import React from 'react';
import { useHistory } from 'react-router-dom';
import { IonCard } from '@ionic/react';

interface Category {
    name: string;
    gradient: string;
}

const categories: Category[] = [
    {
        name: 'UI/UX Design',
        gradient: 'linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-primary-tint) 100%)',
    },
    {
        name: 'IT Development',
        gradient: 'linear-gradient(135deg, var(--color-4a90e2, #4A90E2) 0%, var(--color-50e3c2, #50E3C2) 100%)',
    },
    {
        name: 'Digital Marketing',
        gradient: 'linear-gradient(135deg, var(--color-f5a623, #F5A623) 0%, var(--color-f8e71c, #F8E71C) 100%)',
    },
    {
        name: 'Entrepreneurship',
        gradient: 'linear-gradient(135deg, var(--color-bd10e0, #BD10E0) 0%, var(--color-9013fe, #9013FE) 100%)',
    },
];

export const CategoriesGrid: React.FC = () => {
    const history = useHistory();

    return (
        <section className="categories-section">
            <div className="categories-header">
                <h2 className="categories-title">Browse Through Categories</h2>
                <button
                    className="categories-arrow"
                    onClick={() => history.push('/courses')}
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
                        onClick={() => history.push('/courses')}
                        style={{ background: cat.gradient }}
                    >
                        <div className="category-tile-overlay-gradient">
                            <span className="category-tile-name">{cat.name}</span>
                        </div>
                    </IonCard>
                ))}
                <div
                    className="category-browse-all"
                    onClick={() => history.push('/courses')}
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
