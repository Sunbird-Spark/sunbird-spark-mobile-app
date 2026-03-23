import { useState, useCallback, useEffect, useRef } from 'react';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonImg,
  IonPage,
  IonToolbar,
  IonToast,
  IonAlert,
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { useIonRouter } from '@ionic/react';
import { shareSocialOutline, cloudOfflineOutline, checkmarkCircle, alertCircleOutline, informationCircleOutline, trashOutline } from 'ionicons/icons';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { useTranslation } from 'react-i18next';
import { ContentPlayer } from '../components/players/ContentPlayer';
import { useContentRead } from '../hooks/useContent';
import { useQumlContent } from '../hooks/useQumlContent';
import { useDownloadState } from '../hooks/useDownloadState';
import { useIsContentLocal } from '../hooks/useIsContentLocal';
import { useNetwork } from '../providers/NetworkProvider';
import { DownloadProgressBadge } from '../components/common/DownloadProgressBadge';
import { startContentDownload } from '../services/content/contentDownloadHelper';
import { deleteDownloadedContent } from '../services/content/contentDeleteHelper';
import { downloadManager } from '../services/download_manager';
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
  const router = useIonRouter();
  const { t } = useTranslation();
  const { isOffline } = useNetwork();
  const [isPlaying, setIsPlaying] = useState(false);

  type ToastConfig = { message: string; color: 'success' | 'danger' | 'warning' | 'primary' | 'dark'; icon?: string };
  const [toastConfig, setToastConfig] = useState<ToastConfig | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const { data, isLoading, error, refetch } = useContentRead(contentId);
  const contentData = data?.data?.content;
  const isQumlContent = QUML_MIME_TYPES.includes(contentData?.mimeType);

  const {
    data: qumlData,
    isLoading: isQumlLoading,
    error: qumlError,
    refetch: refetchQuml,
  } = useQumlContent(contentId, { enabled: isQumlContent });

  const playerMetadata = isQumlContent ? qumlData : contentData;
  const playerIsLoading = isLoading || (isQumlContent && isQumlLoading);
  const playerError = error || (isQumlContent ? qumlError : null);
  const mimeType = playerMetadata?.mimeType;

  // Download state (with optimistic UI override for post-delete snapping)
  const rawDownloadState = useDownloadState(contentId);
  const rawIsLocal = useIsContentLocal(contentId);

  const [deletedLocal, setDeletedLocal] = useState(false);

  // Reset override if route changes
  useEffect(() => {
    setDeletedLocal(false);
  }, [contentId]);

  const isLocal = deletedLocal ? false : rawIsLocal;
  const downloadState = deletedLocal ? null : rawDownloadState;

  const handleRetry = useCallback(() => {
    refetch();
    if (isQumlContent) {
      refetchQuml();
    }
  }, [refetch, refetchQuml, isQumlContent]);

  useEffect(() => {
    if (!contentId) return;
    const unsub = downloadManager.subscribe(async (event) => {
      if (event.identifier === contentId && event.type === 'state_change') {
        const entry = await downloadManager.getEntry(contentId);
        if (entry?.state === 'COMPLETED') {
          setToastConfig({ message: t('download.downloadSuccess', 'Content downloaded successfully'), color: 'success', icon: checkmarkCircle });
        } else if (entry?.state === 'FAILED') {
          setToastConfig({ message: t('download.downloadFailed', 'Failed to download content.'), color: 'danger', icon: alertCircleOutline });
        }
      }
    });
    return unsub;
  }, [contentId, t]);

  const handleDownload = useCallback(async () => {
    setDeletedLocal(false);
    if (isOffline) {
      setToastConfig({ message: t('download.noInternet', 'No Internet connection'), color: 'dark' });
      return;
    }
    if (!contentData) return;
    try {
      const result = await startContentDownload(contentData, { priority: 10 });
      console.debug('[ContentPlayerPage] download result:', result, 'for', contentId);
      switch (result) {
        case 'started':
          setToastConfig({ message: t('download.started', 'Download started'), color: 'dark' });
          break;
        case 'already_downloaded':
          setToastConfig({ message: t('download.alreadyDownloaded', 'Already downloaded'), color: 'success', icon: checkmarkCircle });
          break;
        case 'in_progress':
          setToastConfig({ message: t('download.inProgress', 'Download in progress'), color: 'dark' });
          break;
        case 'not_available':
          setToastConfig({ message: t('download.notAvailable', 'Not available for download'), color: 'dark' });
          break;
      }
    } catch (error) {
      console.error('[ContentPlayerPage] download failed for', contentId, error);
      setToastConfig({ message: t('download.downloadFailed', 'Failed to download content.'), color: 'danger', icon: alertCircleOutline });
    }
  }, [isOffline, contentData, contentId, t]);

  const requestDelete = useCallback(() => setShowDeleteAlert(true), []);

  const confirmDeleteDownload = useCallback(async () => {
    setShowDeleteAlert(false);
    if (!contentId) return;
    try {
      const result = await deleteDownloadedContent(contentId);
      console.debug('[ContentPlayerPage] delete result:', result, 'for', contentId);
      if (result.deleted) {
        setDeletedLocal(true);
        setToastConfig({ message: t('download.deleted', 'Content deleted'), color: 'success', icon: checkmarkCircle });
      }
    } catch (error) {
      console.error('[ContentPlayerPage] delete failed for', contentId, error);
      setToastConfig({ message: t('download.deleteFailed', 'Failed to delete'), color: 'danger', icon: alertCircleOutline });
    }
  }, [contentId, t]);

  const handleRetryDownload = useCallback(() => {
    if (contentId) {
      console.debug('[ContentPlayerPage] retrying download for', contentId);
      downloadManager.retry(contentId);
    }
  }, [contentId]);

  const handlePauseDownload = useCallback(() => {
    if (contentId) downloadManager.pause(contentId);
  }, [contentId]);

  const handleResumeDownload = useCallback(() => {
    if (contentId) downloadManager.resume(contentId);
  }, [contentId]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => { });
  }, []);

  const handleClosePlayer = useCallback(() => {
    setIsPlaying(false);
    ScreenOrientation.unlock().catch(() => { });
  }, []);

  // Unlock orientation on unmount
  useEffect(() => {
    return () => {
      ScreenOrientation.unlock().catch(() => { });
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
    // Offline guard: if offline and content not downloaded, show message
    if (isOffline && !isLocal) {
      return (
        <IonPage className="cp-fullscreen">
          <IonContent scrollY={false}>
            <div className="cp-offline-guard">
              <IonIcon icon={cloudOfflineOutline} className="cp-offline-icon" />
              <h2>{t('download.youreOffline')}</h2>
              <p>{t('download.downloadToPlayOffline')}</p>
              <DownloadProgressBadge
                downloadState={downloadState}
                isLocal={isLocal}
                onDownload={handleDownload}
                onRetry={handleRetryDownload}
                onDelete={requestDelete}
                onPause={handlePauseDownload}
                onResume={handleResumeDownload}
              />
              <button className="cp-offline-back" onClick={handleClosePlayer}>
                {t('back')}
              </button>
            </div>
          </IonContent>
        </IonPage>
      );
    }

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
            <button className="cp-action-btn" onClick={() => router.goBack()}>
              <svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2L2 10L10 18" stroke="var(--ion-color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </IonButtons>
          <IonButtons slot="end" className="cp-header-actions">
            <DownloadProgressBadge
              downloadState={downloadState}
              isLocal={isLocal}
              onDownload={handleDownload}
              onRetry={handleRetryDownload}
              onDelete={requestDelete}
              onPause={handlePauseDownload}
              onResume={handleResumeDownload}
            />
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
      <IonToast
        isOpen={!!toastConfig}
        message={toastConfig?.message || ''}
        color={toastConfig?.color}
        icon={toastConfig?.icon}
        duration={2500}
        onDidDismiss={() => setToastConfig(null)}
        position="bottom"
      />
      <IonAlert
        isOpen={showDeleteAlert}
        onDidDismiss={() => setShowDeleteAlert(false)}
        header={t('download.deleteTitle', 'Delete Content')}
        message={t('download.deleteMessage', 'Delete {{name}}? This will delete the downloaded content.', { name: playerMetadata?.name || 'this content' })}
        buttons={[
          { text: t('cancel', 'Cancel'), role: 'cancel' },
          { text: t('download.delete', 'Delete'), role: 'destructive', handler: confirmDeleteDownload },
        ]}
      />
    </IonPage>
  );
};

export default ContentPlayerPage;