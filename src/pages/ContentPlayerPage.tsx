import { useState, useCallback, useEffect, useMemo } from 'react';
import {
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
import { shareSocialOutline, cloudOfflineOutline, checkmarkCircle, alertCircleOutline } from 'ionicons/icons';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { useTranslation } from 'react-i18next';
import { ContentPlayer } from '../components/players/ContentPlayer';
import { useContentRead } from '../hooks/useContent';
import { useQumlContent } from '../hooks/useQumlContent';
import { useContentSearch } from '../hooks/useContentSearch';
import { useDownloadState } from '../hooks/useDownloadState';
import { useIsContentLocal } from '../hooks/useIsContentLocal';
import { useNetwork } from '../providers/NetworkProvider';
import { DownloadProgressBadge } from '../components/common/DownloadProgressBadge';
import RelatedContent from '../components/collection/RelatedContent';
import { startContentDownload } from '../services/content/contentDownloadHelper';
import { deleteDownloadedContent } from '../services/content/contentDeleteHelper';
import { resolveContentForPlayer } from '../services/content/contentPlaybackResolver';
import { mapSearchContentToRelatedContentItems } from '../services/relatedContentMapper';
import { downloadManager } from '../services/download_manager';
import { BackIcon } from '../components/icons/CollectionIcons';
import PageLoader from '../components/common/PageLoader';
import { telemetryService } from '../services/TelemetryService';
import './ContentPlayerPage.css';

const QUML_MIME_TYPES = [
  'application/vnd.sunbird.questionset',
  'application/vnd.sunbird.question',
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

  const rawPlayerMetadata = isQumlContent ? qumlData : contentData;
  const playerIsLoading = isLoading || (isQumlContent && isQumlLoading);
  const playerError = error || (isQumlContent ? qumlError : null);
  const mimeType = rawPlayerMetadata?.mimeType;

  // Download state (with optimistic UI override for post-delete snapping)
  const rawDownloadState = useDownloadState(contentId);
  const rawIsLocal = useIsContentLocal(contentId);

  // Track which contentId was optimistically marked as deleted.
  // Storing the ID (not a boolean) means it auto-resets when contentId changes.
  const [deletedContentId, setDeletedContentId] = useState<string | null>(null);
  const deletedLocal = deletedContentId === contentId;

  const isLocal = deletedLocal ? false : rawIsLocal;
  const downloadState = deletedLocal ? null : rawDownloadState;

  // Resolve URLs to local filesystem paths when content is downloaded.
  // The resolver rewrites artifactUrl/streamingUrl/basePath to local Capacitor
  // webview URLs so players can load files from disk (both online and offline).
  const [resolvedMetadata, setResolvedMetadata] = useState<{ id: string; data: Record<string, unknown> } | null>(null);
  useEffect(() => {
    if (!rawPlayerMetadata?.identifier || !isLocal) {
      return;
    }
    let cancelled = false;
    resolveContentForPlayer(rawPlayerMetadata.identifier, rawPlayerMetadata).then((resolved) => {
      if (!cancelled) setResolvedMetadata({ id: rawPlayerMetadata.identifier, data: resolved });
    });
    return () => { cancelled = true; };
  }, [rawPlayerMetadata, isLocal]);

  const playerMetadata = (isLocal && resolvedMetadata?.id === rawPlayerMetadata?.identifier) ? resolvedMetadata.data : rawPlayerMetadata;

  // Related content
  const contentLoaded = !isLoading && !!contentData;
  const { data: searchData } = useContentSearch({
    request: { limit: 20, offset: 0 },
    enabled: contentLoaded,
  });
  const relatedItems = useMemo(
    () => mapSearchContentToRelatedContentItems(searchData?.data?.content, contentId, 3),
    [searchData, contentId],
  );

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
    setDeletedContentId(null);
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
        setDeletedContentId(contentId);
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
    console.debug('[ContentPlayerPage] Player event:', event);
  };

  const handleTelemetryEvent = (event: any) => {
    console.debug('[ContentPlayerPage] Telemetry event:', event);
    void telemetryService.save(event);
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
          <div className="cp-toolbar-inner">
            <button type="button"
              onClick={() => router.goBack()}
              className="cp-icon-btn"
              aria-label={t('back')}
            >
              <BackIcon />
            </button>
            <div className="cp-header-actions">
              <DownloadProgressBadge
                downloadState={downloadState}
                isLocal={isLocal}
                onDownload={handleDownload}
                onRetry={handleRetryDownload}
                onDelete={requestDelete}
                onPause={handlePauseDownload}
                onResume={handleResumeDownload}
              />
              <button type="button"
                className="cp-icon-btn"
                aria-label="Share"
              >
                <IonIcon icon={shareSocialOutline} color="primary" />
              </button>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent>
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
                {playerMetadata.description && (
                  <p className="cp-description">{playerMetadata.description}</p>
                )}
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

            <RelatedContent items={relatedItems} t={t} />
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
