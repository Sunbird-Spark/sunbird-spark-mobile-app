import React, { useCallback } from 'react';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonToolbar,
    IonButtons,
    IonIcon, IonImg
} from '@ionic/react';
import { useParams } from 'react-router';
import { useHistory } from 'react-router-dom';
import { shareSocialOutline, downloadOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppBackIcon } from '../components/common/AppBackIcon';
import { telemetryService } from '../services/TelemetryService';
import './VideoContentPage.css';
import useImpression from '../hooks/useImpression';

const VideoContentPage: React.FC = () => {
    useImpression({ pageid: 'VideoContentPage', env: 'contentplayer' });
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const { t } = useTranslation();

    const handleShare = useCallback(() => {
        void telemetryService.share({
            edata: { dir: 'Out', type: 'Link', items: [{ id: id || '', type: 'Content', ver: '1' }] },
        });
    }, [id]);

    return (
        <IonPage className="video-content-page">
            <IonHeader className="ion-no-border" style={{ boxShadow: 'none' }}>
                <IonToolbar style={{ '--background': 'transparent', '--min-height': '60px' }}>
                    <IonButtons slot="start">
                        <button className="action-btn" onClick={() => history.goBack()} style={{ padding: '8px' }} aria-label={t('back')}>
                            <AppBackIcon />
                        </button>
                    </IonButtons>
                    <IonButtons slot="end" className="header-actions">
                        <button className="action-btn" aria-label={t('download.download')}>
                            <IonIcon icon={downloadOutline} color="primary" />
                        </button>
                        <button className="action-btn" onClick={handleShare} aria-label={t('share')}>
                            <IonIcon icon={shareSocialOutline} color="primary" />
                        </button>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen>
                <main id="main-content">
                <div className="video-container">
                    <div className="video-hero">
                        <div className="video-meta">
                            <h1>The AI Engineer Course 2026: Complete AI Engineer Bootcamp</h1>
                            <div className="meta-stats">
                                <span className="rating">4.5 <span className="star">★</span></span>
                                <span className="dot">•</span>
                                <span className="lessons">25 Lessons</span>
                            </div>
                        </div>

                        <div className="video-player-placeholder">
                            <IonImg src="https://images.pexels.com/photos/3913025/pexels-photo-3913025.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Video Thumbnail" className="video-thumbnail" />
                            <div className="play-button">
                                <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 7L0.75 13.4952L0.75 0.504809L12 7Z" fill="var(--ion-color-primary)" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="section related-videos-section">
                        <h2>Related Videos</h2>
                        <div className="related-videos-list">
                            {[1, 2, 3, 4, 5].map((item, index) => (
                                <div key={item} className="related-video-card">
                                    <div className="rv-thumbnail-wrapper">
                                        <IonImg src={index % 2 === 0 ? "https://images.pexels.com/photos/3153198/pexels-photo-3153198.jpeg?auto=compress&cs=tinysrgb&w=400" : "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=400"}
                                            alt="Thumbnail"
                                            className="rv-thumbnail"
                                        />
                                        <div className="rv-play-btn">
                                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8 4L0.5 8.33013L0.5 -0.330127L8 4Z" fill="var(--ion-color-primary)" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="rv-info">
                                        <h3>{index % 2 === 0 ? "The AI Engineer Course 2026: Complete AI..." : "Data Engineering Foundations"}</h3>
                                        <div className="meta-stats">
                                            <span className="rating">4.5 <span className="star">★</span></span>
                                            <span className="dot">•</span>
                                            <span className="views">{index % 2 === 0 ? "3k Views" : "9k Views"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="section related-content-section">
                        <div className="section-header-link">
                            <h2>Related Content</h2>
                            <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.2687 3L6.31135 0.449666V5.55033L11.2687 3ZM0.90625 3.5H6.80709V2.5H0.90625V3.5Z" fill="var(--ion-color-primary)" />
                            </svg>
                        </div>
                        <div className="horizontal-scroll-container">
                            <div className="content-card standard-card">
                                <IonImg src="https://images.pexels.com/photos/9026290/pexels-photo-9026290.jpeg?auto=compress&cs=tinysrgb&w=400" alt="Course" className="card-img" />
                                <div className="card-badge">Course</div>
                                <h3>The AI Engineer Course 2026: Complete AI Engineer...</h3>
                                <div className="meta-stats">
                                    <span className="rating">4.5 <span className="star">★</span></span>
                                    <span className="dot">•</span>
                                    <span className="views">25 Lessons</span>
                                </div>
                            </div>
                            <div className="content-card standard-card">
                                <IonImg src="https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=400" alt="Textbook" className="card-img" />
                                <div className="card-badge textbook-badge">Textbook</div>
                                <h3>Data Engineering Foundation</h3>
                                <div className="meta-stats">
                                    <span className="rating">4.5 <span className="star">★</span></span>
                                    <span className="dot">•</span>
                                    <span className="views">25 Lessons</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </main>
            </IonContent>
        </IonPage>
    );
};

export default VideoContentPage;
