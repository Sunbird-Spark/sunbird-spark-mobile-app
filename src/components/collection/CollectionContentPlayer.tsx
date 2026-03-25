import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ContentPlayer } from '../players/ContentPlayer';
import { useContentRead } from '../../hooks/useContent';
import { useQumlContent } from '../../hooks/useQumlContent';
import { useContentStateUpdate } from '../../hooks/useContentStateUpdate';
import { useIsContentLocal } from '../../hooks/useIsContentLocal';
import { buildCollectionCdata, buildObjectRollup } from '../../services/course/collectionTelemetryContext';
import { resolveContentForPlayer } from '../../services/content/contentPlaybackResolver';
import { contentDbService } from '../../services/db/ContentDbService';
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

  const { isLocal, isCheckPending: isLocalCheckPending } = useIsContentLocal(contentId, { includeParentVisibility: true });

  // Offline fallback: when the API fails but content is downloaded locally,
  // load metadata from the ContentDb local_data field (saved during import).
  const [localFallbackMeta, setLocalFallbackMeta] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!isLocal || !error || contentData) return;
    let cancelled = false;
    contentDbService.getByIdentifier(contentId).then((entry) => {
      if (cancelled || !entry?.local_data) return;
      try {
        const parsed = JSON.parse(entry.local_data);
        parsed.identifier = entry.identifier;
        if (!parsed.mimeType && entry.mime_type) parsed.mimeType = entry.mime_type;
        if (!cancelled) setLocalFallbackMeta(parsed);
      } catch { /* ignore parse errors */ }
    });
    return () => { cancelled = true; };
  }, [contentId, isLocal, error, contentData]);

  const apiMetadata = isQumlContent ? qumlData : contentData;
  const rawPlayerMetadata = apiMetadata ?? localFallbackMeta;
  const playerIsLoading = isLoading || (isQumlContent && isQumlLoading);
  // Don't show API error if we have local fallback data
  const playerError = rawPlayerMetadata ? null : (error || (isQumlContent ? qumlError : null));
  const mimeType = rawPlayerMetadata?.mimeType;

  // Resolve URLs to local filesystem paths when content is downloaded.
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

  const playerMetadata = (isLocal && resolvedMetadata != null && resolvedMetadata.id === rawPlayerMetadata?.identifier)
    ? resolvedMetadata.data
    : rawPlayerMetadata;

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
    // Player services wrap events as: { type: customEvent.detail.eid, data: customEvent.detail, ... }
    // So EXIT events arrive with event.type === 'EXIT' and event.data.eid === 'EXIT'
    const eid = ((
      event?.data?.edata?.type
      ?? event?.eid
      ?? event?.data?.eid
      ?? event?.data?.type
      ?? event?.type
    ) ?? '').toUpperCase();
    if (eid === 'EXIT') {
      handleClose();
    }
  }, [handleClose]);

  const handleTelemetryEvent = useCallback((event: any) => {
    console.log('[CollectionContentPlayer] Telemetry event:', event);
    void telemetryService.save(event);
    handleTelemetryStateUpdate(event);
  }, [handleTelemetryStateUpdate]);

  // Wait for offline URL resolution to complete before mounting the player.
  // Player web components read config once on mount and don't detect prop changes,
  // so we must have the resolved local URLs ready BEFORE the player renders.
  //
  // isLocalCheckPending: still doing the initial DB query — don't show error yet.
  // isResolving: DB confirmed local but URL rewriting hasn't finished yet.
  const isResolving = isLocal && (resolvedMetadata == null || resolvedMetadata.id !== rawPlayerMetadata?.identifier) && !!rawPlayerMetadata?.identifier;

  if (playerIsLoading || isLocalCheckPending || isResolving) {
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
