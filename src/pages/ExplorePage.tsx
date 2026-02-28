import React from 'react';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonToolbar,
    IonModal,
    IonFooter,
} from '@ionic/react';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import './ExplorePage.css';

// ── Icons ──
const FilterIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2H16V0H2V2ZM2 3.58997V2H0V3.58997H2ZM6.41003 8L2 3.58997L0.589966 5L5 9.41003L6.41003 8ZM5 9.41003V16.3101H7V9.41003H5ZM5 16.3101C5 17.3301 5.99997 18.05 6.96997 17.73L6.33997 15.83C6.66997 15.72 7 15.9701 7 16.3101H5ZM6.96997 17.73L11.97 16.0601L11.34 14.17L6.33997 15.83L6.96997 17.73ZM11.97 16.0601C12.59 15.8601 13 15.29 13 14.64H11C11 14.42 11.14 14.23 11.34 14.17L11.97 16.0601ZM13 14.64V9.41003H11V14.64H13ZM16 3.58997L11.59 8L13 9.41003L17.41 5L16 3.58997ZM16 2V3.58997H18V2H16ZM17.41 5C17.79 4.62 18 4.11997 18 3.58997H16L17.41 5ZM13 9.41003L11.59 8C11.21 8.38 11 8.88003 11 9.41003H13ZM5 9.41003H7C7 8.88003 6.79003 8.38 6.41003 8L5 9.41003ZM0 3.58997C0 4.11997 0.209966 4.62 0.589966 5L2 3.58997H0ZM16 2H18C18 0.9 17.1 0 16 0V2ZM2 0C0.9 0 0 0.9 0 2H2V0Z" fill="#A85236" />
    </svg>
);

const SearchIcon = () => (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="#a85236" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.5 12H12.71L12.43 11.73C13.41 10.59 14 9.11 14 7.5C14 3.91 11.09 1 7.5 1C3.91 1 1 3.91 1 7.5C1 11.09 3.91 14 7.5 14C9.11 14 10.59 13.41 11.73 12.43L12 12.71V13.5L17 18.49L18.49 17L13.5 12ZM7.5 12C5.01 12 3 9.99 3 7.5C3 5.01 5.01 3 7.5 3C9.99 3 12 5.01 12 7.5C12 9.99 9.99 12 7.5 12Z" />
    </svg>
);

// ── Mock Data ──
const mockExploreItems = [
    {
        id: '1',
        type: 'Course',
        title: 'The AI Engineer Course 2026: Complete AI...',
        rating: 4.5,
        lessons: 25,
        thumbnail: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600',
        layout: 'standard', // image top, text bottom
    },
    {
        id: '2',
        type: 'Textbook',
        title: 'Data Engineering Foundation',
        rating: 4.5,
        lessons: 25,
        thumbnail: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=600',
        layout: 'standard',
    },
    {
        id: '3',
        type: 'Course',
        title: 'The AI Engineer Course 2026: Complete AI...',
        rating: 4.5,
        lessons: 25,
        thumbnail: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600',
        layout: 'standard',
    },
    {
        id: '4',
        type: 'Video',
        title: 'Elm Partners with Sunbird to Build a Graduate Development Program',
        linkText: 'Watch the Video →',
        background: 'linear-gradient(180deg, rgba(26,163,184,0.7) 0%, rgba(6,103,122,0.9) 100%)',
        backgroundImage: 'url(https://images.pexels.com/photos/8386433/pexels-photo-8386433.jpeg?auto=compress&cs=tinysrgb&w=600)',
        layout: 'overlay', // text over image background
    },
    {
        id: '5',
        type: 'Epub',
        title: 'Bitcoin Engineering Foundations',
        linkText: 'View the Epub →',
        background: 'linear-gradient(180deg, rgba(227,76,0,0.7) 0%, rgba(158,53,0,0.9) 100%)',
        backgroundImage: 'url(https://images.pexels.com/photos/844124/pexels-photo-844124.jpeg?auto=compress&cs=tinysrgb&w=600)',
        layout: 'overlay',
    },
    {
        id: '6',
        type: 'Textbook',
        title: 'Data Engineering Foundation',
        rating: 4.5,
        lessons: 25,
        thumbnail: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=600',
        layout: 'standard',
    },
    {
        id: '7',
        type: 'Course',
        title: 'The AI Engineer Course 2026: Complete AI...',
        rating: 4.5,
        lessons: 25,
        thumbnail: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600',
        layout: 'standard',
    },
    {
        id: '8',
        type: 'Textbook',
        title: 'Data Engineering Foundation',
        rating: 4.5,
        lessons: 25,
        thumbnail: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=600',
        layout: 'standard',
    },
    {
        id: '9',
        type: 'PDF',
        title: 'Data Engineering Foundations',
        linkText: 'View the PDF →',
        background: 'linear-gradient(180deg, rgba(124,77,255,0.7) 0%, rgba(62,27,155,0.9) 100%)',
        backgroundImage: 'url(https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600)', // Added image behind PDF
        layout: 'overlay',
    },
    {
        id: '10',
        type: 'Course',
        title: 'The AI Engineer Course 2026: Complete AI...',
        rating: 4.5,
        lessons: 25,
        thumbnail: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600',
        layout: 'standard',
    },
    {
        id: '11',
        type: 'Video',
        title: 'Elm Partners with Sunbird to Build a Graduate Development Program',
        linkText: 'Watch the Video →',
        background: 'linear-gradient(180deg, rgba(26,163,184,0.7) 0%, rgba(6,103,122,0.9) 100%)',
        backgroundImage: 'url(https://images.pexels.com/photos/8386433/pexels-photo-8386433.jpeg?auto=compress&cs=tinysrgb&w=600)',
        layout: 'overlay',
    },
    {
        id: '12',
        type: 'Textbook',
        title: 'Data Engineering Foundation',
        rating: 4.5,
        lessons: 25,
        thumbnail: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=600',
        layout: 'standard',
    },
    {
        id: '13',
        type: 'Epub',
        title: 'Bitcoin Engineering Foundations',
        linkText: 'View the Epub →',
        background: 'linear-gradient(180deg, rgba(227,76,0,0.7) 0%, rgba(158,53,0,0.9) 100%)',
        backgroundImage: 'url(https://images.pexels.com/photos/844124/pexels-photo-844124.jpeg?auto=compress&cs=tinysrgb&w=600)',
        layout: 'overlay',
    },
];

const ExplorePage: React.FC = () => {
    const [showFilter, setShowFilter] = React.useState(false);
    const [filterTab, setFilterTab] = React.useState('Collections');

    // We'll split the items into left and right columns for a masonry-like look
    const leftCol = mockExploreItems.filter((_, i) => i % 2 === 0);
    const rightCol = mockExploreItems.filter((_, i) => i % 2 !== 0);

    const renderCard = (item: any) => {
        if (item.layout === 'overlay') {
            return (
                <div key={item.id} className="explore-card overlay-card" style={{
                    background: `${item.background}, ${item.backgroundImage}`,
                    backgroundSize: 'cover',
                    backgroundBlendMode: 'overlay',
                    backgroundPosition: 'center'
                }}>
                    <div className="card-badge bg-white-badge">
                        {item.type}
                    </div>
                    <div className="overlay-content">
                        <h3 className="overlay-title">{item.title}</h3>
                        <span className="overlay-link">{item.linkText}</span>
                    </div>
                </div>
            );
        }

        return (
            <div key={item.id} className="explore-card standard-card">
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
                <IonToolbar style={{ '--background': '#ffffff', '--padding-top': 'env(safe-area-inset-top)', padding: '16px 16px', boxShadow: '0 14px 14px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h1 style={{ fontFamily: "'Rubik', sans-serif", fontSize: '18px', fontWeight: 600, color: '#222222', margin: 0 }}>
                            Start Exploring
                        </h1>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
                                <SearchIcon />
                            </button>
                            <button
                                onClick={() => setShowFilter(true)}
                                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}
                            >
                                <FilterIcon />
                            </button>
                        </div>
                    </div>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen style={{ '--background': 'rgb(244, 244, 244)' }}>
                <div className="masonry-grid">
                    <div className="masonry-col">
                        {leftCol.map(renderCard)}
                    </div>
                    <div className="masonry-col">
                        {rightCol.map(renderCard)}
                    </div>
                </div>

                {/* Bottom spacing for nav */}
                <div style={{ height: '100px' }} />
            </IonContent>

            <BottomNavigation />

            {/* ── Filter Bottom Sheet Modal ── */}
            <IonModal
                isOpen={showFilter}
                onDidDismiss={() => setShowFilter(false)}
                breakpoints={[0, 0.75, 1]}
                initialBreakpoint={0.75}
                className="filter-modal"
            >
                <div className="filter-sheet-container">
                    {/* Header */}
                    <div className="filter-sheet-header">
                        <h2>Filters</h2>
                        <button onClick={() => setShowFilter(false)} className="close-btn">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L13 13M13 1L1 13" stroke="#A85236" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="filter-sheet-body">
                        {/* Sidebar */}
                        <div className="filter-sidebar">
                            {['Collections', 'Content Type', 'Categories', 'Sort By'].map((tab) => (
                                <button
                                    key={tab}
                                    className={`filter-tab ${filterTab === tab ? 'active' : ''}`}
                                    onClick={() => setFilterTab(tab)}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Options Pane */}
                        <div className="filter-options">
                            {filterTab === 'Collections' && (
                                <div className="checkbox-list">
                                    {['Courses', 'Resources', 'Textbooks', 'Skills'].map((option) => (
                                        <label key={option} className="checkbox-item">
                                            <input type="checkbox" className="custom-checkbox" />
                                            <span>{option}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {filterTab !== 'Collections' && (
                                <div className="checkbox-list">
                                    <p style={{ color: '#757575', fontSize: '14px', margin: '4px 0' }}>Options for {filterTab}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="filter-sheet-footer">
                        <button className="clear-filters-btn" onClick={() => setShowFilter(false)}>
                            Clear Filters
                        </button>
                        <button className="apply-filters-btn" onClick={() => setShowFilter(false)}>
                            Apply
                        </button>
                    </div>
                </div>
            </IonModal>

        </IonPage>
    );
};

export default ExplorePage;
