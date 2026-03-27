import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import { syncService } from '../../services/sync/SyncService';
import { useAuth } from '../../contexts/AuthContext';

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
  const { userId } = useAuth();
  const { data, isLoading, error, refetch, fetchStatus } = useContentRead(contentId);
  const contentData = data?.data?.content;
  const isQumlContent = QUML_MIME_TYPES.includes(contentData?.mimeType);

  const {
    data: qumlData,
    isLoading: isQumlLoading,
    error: qumlError,
    refetch: refetchQuml,
  } = useQumlContent(contentId, { enabled: isQumlContent });

  const { isLocal, isCheckPending: isLocalCheckPending } = useIsContentLocal(contentId, { includeParentVisibility: true });

  // API is unavailable when:
  // 1. Query errored (network failure after retries)
  // 2. Query paused by React Query (networkMode:'online' detects offline)
  // 3. Query completed (idle) but returned no content data (e.g. empty response,
  //    Capacitor HTTP silent failure, or response without expected structure)
  const isApiUnavailable = !!error || fetchStatus === 'paused'
    || (!isLoading && !contentData && fetchStatus === 'idle');

  // Offline fallback: when the API is unavailable but content is downloaded locally,
  // load metadata from the ContentDb local_data field (saved during import).
  const [localFallbackMeta, setLocalFallbackMeta] = useState<Record<string, unknown> | null>(null);

  // Resolve URLs to local filesystem paths when content is downloaded.
  const [resolvedMetadata, setResolvedMetadata] = useState<{ id: string; data: Record<string, unknown> } | null>(null);

  // Reset stale fallback/resolved state when navigating to a different content item.
  // Without this, rawPlayerMetadata could briefly reuse the previous content's local data.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLocalFallbackMeta(null);
    setResolvedMetadata(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [contentId]);

  useEffect(() => {
    if (!isLocal || !isApiUnavailable || contentData) return;

    let cancelled = false;

    contentDbService.getByIdentifier(contentId).then((entry) => {
      if (cancelled) {
        return;
      }

      if (!entry?.local_data) {
        return;
      }

      try {
        const parsed = JSON.parse(entry.local_data);
        parsed.identifier = entry.identifier;
        if (!parsed.mimeType && entry.mime_type) parsed.mimeType = entry.mime_type;
        if (!cancelled) setLocalFallbackMeta(parsed);
      } catch (e) {
        console.error('[CollectionContentPlayer] Failed to parse local_data for', contentId, e);
      }
    }).catch((e) => {
      console.error('[CollectionContentPlayer] DB lookup failed for', contentId, e);
    });

    return () => { cancelled = true; };
  }, [contentId, isLocal, isApiUnavailable, contentData]);

  const apiMetadata = isQumlContent ? qumlData : contentData;
  const rawPlayerMetadata = apiMetadata ?? localFallbackMeta;
  const playerIsLoading = isLoading || (isQumlContent && isQumlLoading);
  // Don't show API error if we have local fallback data
  const playerError = rawPlayerMetadata ? null : (error || (isQumlContent ? qumlError : null));
  const mimeType = rawPlayerMetadata?.mimeType;

  // Resolve URLs to local filesystem paths when content is downloaded.
  useEffect(() => {
    if (!rawPlayerMetadata?.identifier || !isLocal) {
      return;
    }
    let cancelled = false;

    resolveContentForPlayer(rawPlayerMetadata.identifier, rawPlayerMetadata).then((resolved) => {
      if (cancelled) return;
      setResolvedMetadata({ id: rawPlayerMetadata.identifier, data: resolved });
    }).catch((e) => {
      console.error('[CollectionContentPlayer] Failed to resolve local URLs for', contentId, e);
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

  // Stable attempt_id for the current play session — regenerated on every START event
  // so that all ASSESS events within one attempt share one ID, and a second offline
  // attempt generates a distinct ID that survives as a separate sync group.
  const attemptIdRef = useRef<string>(uuidv4());

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
    void telemetryService.save(event);
    handleTelemetryStateUpdate(event);

    const eid = (event?.eid ?? event?.edata?.type ?? '').toUpperCase();

    // Each START marks a new play session — always generate a fresh attempt_id.
    // This ensures close-and-reopen and crash-and-restart both produce a new
    // attempt, preventing duplicate question answers within the same attempt_id.
    if (eid === 'START') {
      attemptIdRef.current = uuidv4();
    }

    // Persist ASSESS events to the course_assessment staging table so they survive
    // app crashes and can be synced later (offline-safe path).
    if (eid === 'ASSESS' && collectionId && batchId && userId) {
      void syncService.captureAssessmentEvent(event, {
        userId,
        courseId: collectionId,
        batchId,
      }, attemptIdRef.current);
    }
  }, [handleTelemetryStateUpdate, collectionId, batchId, userId]);

  // Build contentMeta for rating dialog telemetry
  const contentMeta = useMemo(() => {
    if (!playerMetadata?.identifier) return undefined;
    return {
      id: playerMetadata.identifier,
      type: playerMetadata.contentType || 'Content',
      ver: String(playerMetadata.pkgVersion || '1'),
    };
  }, [playerMetadata]);

  // Wait for offline URL resolution to complete before mounting the player.
  // Player web components read config once on mount and don't detect prop changes,
  // so we must have the resolved local URLs ready BEFORE the player renders.
  //
  // isLocalCheckPending: still doing the initial DB query — don't show error yet.
  // isLocalFallbackPending: API unavailable, content is local, but fallback metadata
  //   hasn't loaded from DB yet — keep showing the loader instead of flashing an error.
  // isResolving: DB confirmed local but URL rewriting hasn't finished yet.
  const isLocalFallbackPending = isLocal && isApiUnavailable && !contentData && !localFallbackMeta;
  const isResolving = isLocal && (resolvedMetadata == null || resolvedMetadata.id !== rawPlayerMetadata?.identifier) && !!rawPlayerMetadata?.identifier;

  if (playerIsLoading || isLocalCheckPending || isLocalFallbackPending || isResolving) {
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
        <div
          role="button"
          aria-label="Close player"
          className="cp-close-button-wrapper"
          onClick={handleClose}
          style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 100, padding: '10px' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        <IonContent scrollY={false}>
          <PageLoader
            error={playerError ? `Failed to load content: ${playerError.message}` : 'No content data available.'}
            onRetry={handleRetry}
          />
        </IonContent>
      </IonPage>
    );
  };

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
            contentMeta={contentMeta}
          />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CollectionContentPlayer;
