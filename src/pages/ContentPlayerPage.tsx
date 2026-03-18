import { useState, useCallback, useEffect } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonImg,
  IonPage,
  IonToolbar,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { downloadOutline, refreshOutline, shareSocialOutline } from 'ionicons/icons';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ContentPlayer } from '../components/players/ContentPlayer';
import { useContentRead } from '../hooks/useContent';
import { usePlayerContext } from '../hooks/usePlayerContext';
import { useQumlContent } from '../hooks/useQumlContent';
import PageLoader from '../components/common/PageLoader';
import './ContentPlayerPage.css';

const QUML_MIME_TYPES = [
  'application/vnd.sunbird.questionset',
  'application/vnd.sunbird.question',
];

const MOCK_RELATED_VIDEOS = [
  { id: '1', title: 'The AI Engineer Course 2026: Complete AI...', rating: 4.5, views: '3k Views', thumbnail: 'https://images.pexels.com/photos/3153198/pexels-photo-3153198.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: '2', title: 'Data Engineering Foundations', rating: 4.5, views: '9k Views', thumbnail: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: '3', title: 'The AI Engineer Course 2026: Complete AI...', rating: 4.5, views: '3k Views', thumbnail: 'https://images.pexels.com/photos/3153198/pexels-photo-3153198.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: '4', title: 'Data Engineering Foundations', rating: 4.5, views: '9k Views', thumbnail: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: '5', title: 'The AI Engineer Course 2026: Complete AI...', rating: 4.5, views: '3k Views', thumbnail: 'https://images.pexels.com/photos/3153198/pexels-photo-3153198.jpeg?auto=compress&cs=tinysrgb&w=400' },
];

const MOCK_RELATED_CONTENT = [
  { id: '1', title: 'The AI Engineer Course 2026: Complete AI Engine...', badge: 'Course', rating: 4.5, lessons: '25 Lessons', thumbnail: 'https://images.pexels.com/photos/9026290/pexels-photo-9026290.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: '2', title: 'Data Engineering Foundation', badge: 'Textbook', rating: 4.5, lessons: '25 Lessons', thumbnail: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: '3', title: 'Machine Learning Basics', badge: 'Course', rating: 4.3, lessons: '18 Lessons', thumbnail: 'https://images.pexels.com/photos/3913025/pexels-photo-3913025.jpeg?auto=compress&cs=tinysrgb&w=400' },
];

const ContentPlayerPage: React.FC = () => {
  const { contentId } = useParams<{ contentId: string }>();
  const history = useHistory();
  const [isPlaying, setIsPlaying] = useState(false);

  const { data, isLoading, error, refetch } = useContentRead(contentId);
  const contentData = data?.data?.content;
  const isQumlContent = QUML_MIME_TYPES.includes(contentData?.mimeType);

  const {
    data: qumlData,
    isLoading: isQumlLoading,
    error: qumlError,
    refetch: refetchQuml,
  } = useQumlContent(contentId, { enabled: isQumlContent });

  const { context: playerContext } = usePlayerContext();

  const playerMetadata = isQumlContent ? qumlData : contentData;
  const playerIsLoading = isLoading || (isQumlContent && isQumlLoading);
  const playerError = error || (isQumlContent ? qumlError : null);
  const mimeType = playerMetadata?.mimeType;

  const handleRetry = useCallback(() => {
    refetch();
    if (isQumlContent) {
      refetchQuml();
    }
  }, [refetch, refetchQuml, isQumlContent]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
  }, []);

  const handleClosePlayer = useCallback(() => {
    setIsPlaying(false);
    ScreenOrientation.unlock().catch(() => {});
  }, []);

  // Unlock orientation on unmount
  useEffect(() => {
    return () => {
      ScreenOrientation.unlock().catch(() => {});
    };
  }, []);

  const handlePlayerEvent = (event: any) => {
    console.log('[ContentPlayerPage] Player event:', event);
  };

  const handleTelemetryEvent = (event: any) => {
    console.log('[ContentPlayerPage] Telemetry event:', event);
  };

  // ── Fullscreen player mode (landscape, no header) ──
  if (isPlaying && playerMetadata && mimeType) {
    return (
      <IonPage className="cp-fullscreen">
        <IonContent scrollY={false}>
          <button
            className="cp-close-btn"
            onClick={handleClosePlayer}
            aria-label="Close player"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 1L1 13M1 1L13 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="cp-player-fullscreen-container">
            <ContentPlayer
              mimeType={mimeType}
              metadata={playerMetadata}
              channel={playerContext.channel}
              pdata={playerContext.pdata}
              did={playerContext.did}
              sid={playerContext.sid}
              uid={playerContext.uid}
              contextRollup={{ l1: playerContext.channel }}
              onPlayerEvent={handlePlayerEvent}
              onTelemetryEvent={handleTelemetryEvent}
            />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // ── Detail view (portrait, with header) ──
  return (
    <IonPage className="cp-page">
      <IonHeader className="ion-no-border">
        <IonToolbar className="cp-toolbar">
          <IonButtons slot="start">
            <button className="cp-action-btn" onClick={() => history.goBack()}>
              <svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2L2 10L10 18" stroke="var(--ion-color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </IonButtons>
          <IonButtons slot="end" className="cp-header-actions">
            <button className="cp-action-btn">
              <IonIcon icon={downloadOutline} color="primary" />
            </button>
            <button className="cp-action-btn">
              <IonIcon icon={shareSocialOutline} color="primary" />
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {playerIsLoading ? (
          <PageLoader message="Loading content..." />
        ) : playerError || !playerMetadata || !mimeType ? (
          <PageLoader 
            error={playerError ? `Failed to load content: ${playerError.message}` : 'No content data available.'} 
            onRetry={handleRetry}
          />
        ) : (
          <div className="cp-container">
            {/* Hero Section */}
            <div className="cp-hero">
              <div className="cp-meta">
                <h1>{playerMetadata.name}</h1>
                <div className="cp-meta-stats">
                  <span className="cp-rating">4.5 <span className="cp-star">★</span></span>
                  <span className="cp-dot">•</span>
                  <span>25 Lessons</span>
                </div>
              </div>

              {/* Thumbnail with play button */}
              <button
                type="button"
                className="cp-player-area"
                onClick={handlePlay}
                aria-label={`Play ${playerMetadata.name}`}
              >
                <IonImg
                  src={playerMetadata.appIcon || playerMetadata.posterImage || 'https://images.pexels.com/photos/3913025/pexels-photo-3913025.jpeg?auto=compress&cs=tinysrgb&w=800'}
                  alt={playerMetadata.name}
                  className="cp-thumbnail"
                />
                <div className="cp-play-button">
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 7L0.75 13.4952L0.75 0.504809L12 7Z" fill="var(--ion-color-primary)" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Related Videos */}
            <div className="cp-related-videos">
              <h2>Related Videos</h2>
              <div className="cp-rv-list">
                {MOCK_RELATED_VIDEOS.map((video) => (
                  <div key={video.id} className="cp-rv-card">
                    <div className="cp-rv-thumb">
                      <IonImg src={video.thumbnail} alt={video.title} className="cp-rv-img" />
                      <div className="cp-rv-play">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 4L0.5 8.33013L0.5 -0.330127L8 4Z" fill="var(--ion-color-primary)" />
                        </svg>
                      </div>
                    </div>
                    <div className="cp-rv-info">
                      <h3>{video.title}</h3>
                      <div className="cp-meta-stats">
                        <span className="cp-rating">{video.rating} <span className="cp-star">★</span></span>
                        <span className="cp-dot">•</span>
                        <span>{video.views}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Content */}
            <div className="cp-related-content">
              <div className="cp-section-header">
                <h2>Related Content</h2>
                <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.2687 3L6.31135 0.449666V5.55033L11.2687 3ZM0.90625 3.5H6.80709V2.5H0.90625V3.5Z" fill="var(--ion-color-primary)" />
                </svg>
              </div>
              <div className="cp-horizontal-scroll">
                {MOCK_RELATED_CONTENT.map((item) => (
                  <div key={item.id} className="cp-content-card">
                    <IonImg src={item.thumbnail} alt={item.title} className="cp-card-img" />
                    <div className={`cp-card-badge ${item.badge === 'Textbook' ? 'cp-badge-textbook' : ''}`}>
                      {item.badge}
                    </div>
                    <h3>{item.title}</h3>
                    <div className="cp-meta-stats">
                      <span className="cp-rating">{item.rating} <span className="cp-star">★</span></span>
                      <span className="cp-dot">•</span>
                      <span>{item.lessons}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ContentPlayerPage;
