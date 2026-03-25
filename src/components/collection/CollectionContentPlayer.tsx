import React, { useCallback, useEffect, useMemo } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ContentPlayer } from '../players/ContentPlayer';
import { useContentRead } from '../../hooks/useContent';
import { useQumlContent } from '../../hooks/useQumlContent';
import { useContentStateUpdate } from '../../hooks/useContentStateUpdate';
import { buildCollectionCdata, buildObjectRollup } from '../../services/course/collectionTelemetryContext';
import type { HierarchyContentNode } from '../../types/collectionTypes';
import PageLoader from '../common/PageLoader';
import { telemetryService } from '../../services/TelemetryService';

const QUML_MIME_TYPES = [
  'application/vnd.sunbird.questionset',
  'application/vnd.sunbird.question',
];

interface CollectionContentPlayerProps {
  contentId: string;
  onClose: () => void;
  collectionId?: string;
  batchId?: string;
  hierarchyRoot?: HierarchyContentNode;
  isEnrolled?: boolean;
  isBatchEnded?: boolean;
  currentContentStatus?: number;
  /** A6: When true (creator/mentor viewing own course), skip all progress/state API calls. */
  skipContentStateUpdate?: boolean;
}

const CollectionContentPlayer: React.FC<CollectionContentPlayerProps> = ({
  contentId,
  onClose,
  collectionId,
  batchId,
  hierarchyRoot,
  isEnrolled = false,
  isBatchEnded = false,
  currentContentStatus,
  skipContentStateUpdate = false,
}) => {
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
    ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => { });

    return () => {
      ScreenOrientation.unlock().catch(() => { });
    };
  }, []);

  const handleClose = useCallback(() => {
    ScreenOrientation.unlock().catch(() => { });
    onClose();
  }, [onClose]);

  const handleRetry = useCallback(() => {
    refetch();
    if (isQumlContent) {
      refetchQuml();
    }
  }, [refetch, refetchQuml, isQumlContent]);

  // Build telemetry context for the player.
  // Exclude batch data when the batch has ended — the backend rejects
  // progress updates for expired batches, so tagging telemetry with a
  // stale batchId would cause sync errors.
  const cdata = useMemo(
    () => buildCollectionCdata(collectionId, isBatchEnded ? undefined : batchId),
    [collectionId, batchId, isBatchEnded],
  );

  const objectRollup = useMemo(
    () => buildObjectRollup(hierarchyRoot, contentId),
    [hierarchyRoot, contentId],
  );

  // Content state update hook — bridges telemetry events to API
  const handleTelemetryStateUpdate = useContentStateUpdate({
    collectionId,
    contentId,
    effectiveBatchId: batchId,
    isEnrolledInCurrentBatch: isEnrolled,
    isBatchEnded,
    mimeType,
    currentContentStatus,
    skipContentStateUpdate,
    contentType: contentData?.contentType,
  });

  const handlePlayerEvent = useCallback((event: any) => {
    console.log('[CollectionContentPlayer] Player event:', event);
    if (event?.data?.type === 'EXIT') {
      handleClose();
    }
  }, [handleClose]);

  const handleTelemetryEvent = useCallback((event: any) => {
    console.log('[CollectionContentPlayer] Telemetry event:', event);
    void telemetryService.save(event);
    handleTelemetryStateUpdate(event);
  }, [handleTelemetryStateUpdate]);

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
        <div className="cp-player-fullscreen-container">
          <ContentPlayer
            mimeType={mimeType}
            metadata={playerMetadata}
            cdata={cdata}
            objectRollup={objectRollup}
            onPlayerEvent={handlePlayerEvent}
            onTelemetryEvent={handleTelemetryEvent}
          />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CollectionContentPlayer;
