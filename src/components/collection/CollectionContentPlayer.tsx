import React, { useState, useCallback, useEffect } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ContentPlayer } from '../players/ContentPlayer';
import { useContentRead } from '../../hooks/useContent';
import { useQumlContent } from '../../hooks/useQumlContent';
import PageLoader from '../common/PageLoader';

const QUML_MIME_TYPES = [
  'application/vnd.sunbird.questionset',
  'application/vnd.sunbird.question',
];

interface CollectionContentPlayerProps {
  contentId: string;
  onClose: () => void;
}

const CollectionContentPlayer: React.FC<CollectionContentPlayerProps> = ({
  contentId,
  onClose,
}) => {
  const [isLandscapeLocked, setIsLandscapeLocked] = useState(false);

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

  // Lock to landscape on mount
  useEffect(() => {
    ScreenOrientation.lock({ orientation: 'landscape' })
      .then(() => setIsLandscapeLocked(true))
      .catch(() => {});

    return () => {
      ScreenOrientation.unlock().catch(() => {});
    };
  }, []);

  const handleClose = useCallback(() => {
    ScreenOrientation.unlock().catch(() => {});
    onClose();
  }, [onClose]);

  const handleRetry = useCallback(() => {
    refetch();
    if (isQumlContent) {
      refetchQuml();
    }
  }, [refetch, refetchQuml, isQumlContent]);

  const handlePlayerEvent = useCallback((event: any) => {
    console.log('[CollectionContentPlayer] Player event:', event);
    if (event?.data?.type === 'EXIT') {
      handleClose();
    }
  }, [handleClose]);

  const handleTelemetryEvent = (event: any) => {
    console.log('[CollectionContentPlayer] Telemetry event:', event);
  };

  if (playerIsLoading) {
    return (
      <IonPage className="cp-fullscreen">
        <IonContent scrollY={false}>
          <PageLoader message="Loading content..." />
        </IonContent>
      </IonPage>
    );
  }

  if (playerError || !playerMetadata || !mimeType) {
    return (
      <IonPage className="cp-fullscreen">
        <IonContent scrollY={false}>
          <button
            className="cp-close-btn"
            onClick={handleClose}
            aria-label="Close player"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 1L1 13M1 1L13 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <PageLoader
            error={playerError ? `Failed to load content: ${playerError.message}` : 'No content data available.'}
            onRetry={handleRetry}
          />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="cp-fullscreen">
      <IonContent scrollY={false}>
        <button
          className="cp-close-btn"
          onClick={handleClose}
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
};

export default CollectionContentPlayer;
