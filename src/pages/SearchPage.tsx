import React from 'react';
import { IonPage, IonHeader, IonToolbar, IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import './SearchPage.css';

// ── Icons ──
const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.41 16.59L10.83 12L15.41 7.41L14 6L8 12L14 18L15.41 16.59Z" fill="#A85236" />
    </svg>
);

const SearchInputIcon = () => (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="#a85236" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.5 12H12.71L12.43 11.73C13.41 10.59 14 9.11 14 7.5C14 3.91 11.09 1 7.5 1C3.91 1 1 3.91 1 7.5C1 11.09 3.91 14 7.5 14C9.11 14 10.59 13.41 11.73 12.43L12 12.71V13.5L17 18.49L18.49 17L13.5 12ZM7.5 12C5.01 12 3 9.99 3 7.5C3 5.01 5.01 3 7.5 3C9.99 3 12 5.01 12 7.5C12 9.99 9.99 12 7.5 12Z" />
    </svg>
);

// ── Mock Data ──
const mockRecommendedItems = [
    {
        id: '1',
        type: 'Course',
        title: 'The AI Engineer Course 2026: Complete AI...',
        rating: 4.5,
        lessons: 25,
        thumbnail: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600',
    },
    {
        id: '2',
        type: 'Textbook',
        title: 'Data Engineering Foundation',
        rating: 4.5,
        lessons: 25,
        thumbnail: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=600',
    }
];

const SearchPage: React.FC = () => {
    const history = useHistory();

    const handleBackClick = () => {
        if (history.length > 1) {
            history.goBack();
        } else {
            history.push('/home'); // Fallback route
        }
    };

    const renderCard = (item: { id: string; type: string; title: string; rating: number; lessons: number; thumbnail: string }) => {
        // Reuse similar structure from ExplorePage.tsx for recommended cards
        return (
            <div
                key={item.id}
                className="search-explore-card standard-card"
                onClick={() => history.push(`/video/${item.id}`)}
            >
                <div className="card-image-wrap">
                    <img src={item.thumbnail} alt={item.title} className="card-image" />
                </div>
                <div className="card-content">
                    <div className="card-badge bg-yellow-badge">
                        {item.type}
                    </div>
                    <h3 className="card-title">{item.title}</h3>
                    <div className="card-meta">
                        <span className="rating">{item.rating} <span className="star">★</span></span>
                        <span className="dot">•</span>
                        <span className="lessons">{item.lessons} Lessons</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar style={{ '--background': '#ffffff', '--padding-top': 'env(safe-area-inset-top)', padding: '16px 16px', boxShadow: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={handleBackClick}
                            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            aria-label="Go Back"
                        >
                            <BackIcon />
                        </button>
                        <h1 style={{ fontFamily: "'Rubik', sans-serif", fontSize: '18px', fontWeight: 600, color: '#222222', margin: 0 }}>
                            Search for Content
                        </h1>
                    </div>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen style={{ '--background': '#ffffff' }}>
                <div className="search-container">
                    {/* Search Input Bar */}
                    <div className="search-input-wrapper">
                        <div className="search-input-box">
                            {/* We could use an input field here, but based on the design screenshot, 
                                it looks like an active text input area with a cursor line. */}
                            <input
                                type="text"
                                className="search-text-input"
                                autoFocus
                                placeholder=""
                            />
                        </div>
                    </div>

                    {/* Recommended Section */}
                    <div className="recommended-section">
                        <h2 className="recommended-title">Recommended</h2>
                        <div className="recommended-grid">
                            <div className="masonry-col">
                                {renderCard(mockRecommendedItems[0])}
                            </div>
                            <div className="masonry-col">
                                {renderCard(mockRecommendedItems[1])}
                            </div>
                        </div>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default SearchPage;
