import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonIcon,
  IonToolbar,
  IonContent,
  IonModal,
  IonSpinner,
  IonToggle,
  IonToast,
  IonAlert,
} from '@ionic/react';
import { useParams, useLocation } from 'react-router-dom';
import { useIonRouter, useIonViewDidEnter, useIonViewWillLeave } from '@ionic/react';
import { warningOutline, checkmarkCircle, alertCircleOutline, pause, play } from 'ionicons/icons';
import { userService } from '../services/UserService';
import { useLanguage } from '../contexts/LanguageContext';
import { useCollection } from '../hooks/useCollection';
import { useCollectionEnrollment } from '../hooks/useCollectionEnrollment';
import { useContentSearch } from '../hooks/useContentSearch';
import { useConsent } from '../hooks/useConsent';
import { useUser } from '../hooks/useUser';
import { useForceSync } from '../hooks/useForceSync';
import { useNetwork } from '../providers/NetworkProvider';
import { useLocalContentSet } from '../hooks/useLocalContentSet';
import { useIsContentLocal } from '../hooks/useIsContentLocal';
import { useCourseDownloadProgress } from '../hooks/useCourseDownloadProgress';
import { useBatchDownloadStates } from '../hooks/useBatchDownloadStates';
import { downloadManager } from '../services/download_manager';
import { mapSearchContentToRelatedContentItems } from '../services/relatedContentMapper';
import { flattenLeafNodes, calculateDownloadSize, formatBytes, filterHierarchyTree, isDownloadable } from '../services/content/hierarchyUtils';
import { startBulkDownload } from '../services/content/courseDownloadHelper';
import { downloadSpineEcar } from '../services/content/spineDownloadHelper';
import { deleteDownloadedContent } from '../services/content/contentDeleteHelper';
import { contentDbService } from '../services/db/ContentDbService';
import { BackIcon, SearchIcon, RightArrowIcon } from '../components/icons/CollectionIcons';
import CollectionOverview from '../components/collection/CollectionOverview';
import CollectionAccordion from '../components/collection/CollectionAccordion';
import RelatedContent from '../components/collection/RelatedContent';
import CollectionContentPlayer from '../components/collection/CollectionContentPlayer';
import CourseCompletionDialog from '../components/collection/CourseCompletionDialog';
import FAQSection from '../components/home/FAQSection';
import PageLoader from '../components/common/PageLoader';
import './CollectionPage.css';
import useImpression from '../hooks/useImpression';
import { TelemetryTracker } from '../components/telemetry/TelemetryTracker';
import { telemetryService } from '../services/TelemetryService';

// ── Circular Progress Widget ──
const CircularProgress = ({ value, size = 48 }: { value: number; size?: number }) => {
  const radius = size / 2;
  const stroke = 7;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="cp-progress-complete-icon">
      <svg height={size} width={size} className="circular-progress">
        {/* Background track */}
        <circle stroke="var(--ion-color-warning-shade, #F0CE94)" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        {/* Progress arc */}
        <circle stroke="var(--ion-color-primary, #8B5E3C)" fill="transparent" strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset }}
          strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`} />
      </svg>
    </div>
  );
};

const CertificateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="3" width="16" height="14" rx="2" fill="var(--ion-color-primary-tint, #D28D5D)" />
    <path d="M7 6H13M7 9H13M7 12H10" stroke="var(--ion-color-light)" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="15" cy="14" r="3" fill="var(--ion-color-primary)" />
  </svg>
);

// ══════════════════════════════════════════════════════════════
//  CollectionPage — single page for anonymous, unenrolled & enrolled
// ══════════════════════════════════════════════════════════════

const CollectionPage: React.FC = () => {
  useImpression({ pageid: 'CollectionPage', env: 'collection' });
  const { collectionId } = useParams<{ collectionId: string }>();
  const router = useIonRouter();
  const location = useLocation<{ parentRoute?: string }>();
  const isAuthenticated = userService.isLoggedIn();
  const userId = userService.getUserId();
  const { t } = useLanguage();

  // Track whether this Ionic view is currently active (visible).
  // State-based so child components (e.g. CourseCompletionDialog) can react to it.
  const [isViewActive, setIsViewActive] = useState(false);
  useIonViewDidEnter(() => {
    setIsViewActive(true);
    // Safety net: if the query is still idle (AppInitializer timing race) or
    // previously errored, re-trigger it now that the view is fully visible.
    if ((fetchStatus === 'idle' || isError) && !isLoading) {
      void refetchCollection();
    }
  });
  useIonViewWillLeave(() => { setIsViewActive(false); });

  // Data fetching
  const { data: collectionData, isLoading, isError, fetchStatus, status: queryStatus, refetch: refetchCollection } = useCollection(collectionId);
  // True only while the query has never run yet (pending + not actively fetching).
  // After the query completes with null (offline + not cached), queryStatus becomes
  // 'success' — we must not treat that as "still initializing".
  const isQueryIdle = queryStatus === 'pending' && fetchStatus === 'idle';

  const isTrackable =
    (collectionData?.trackable?.enabled?.toLowerCase() ?? '') === 'yes';
  const isCourse = collectionData?.primaryCategory?.toLowerCase() === 'course';

  // Creator check — course creators cannot enroll in / consume their own trackable courses
  // (mirrors old SunbirdEd mobile app behaviour)
  const isCreator = !!(userId && collectionData?.createdBy && userId === collectionData.createdBy);

  // Enrollment state — uses real API data
  const enrollment = useCollectionEnrollment(collectionId, collectionData);

  // Determine view state for trackable collections
  // Non-trackable collections always use the default view (no enrollment flow)
  type ViewState = 'anonymous' | 'unenrolled' | 'enrolled' | 'default';
  const viewState: ViewState = useMemo(() => {
    if (!isTrackable) return 'default';
    if (!isAuthenticated) return 'anonymous';
    if (isCreator) return 'unenrolled'; // Creator treated as unenrolled — blocked from consuming
    if (enrollment.isEnrolled) return 'enrolled';
    return 'unenrolled';
  }, [isTrackable, isAuthenticated, isCreator, enrollment.isEnrolled]);

  // Player state
  const [playingContentId, setPlayingContentId] = useState<string | null>(null);
  // Track progress before player opens so we can detect completion on return
  const progressBeforePlayerRef = useRef<number | null>(null);

  // Batch modal state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // ── Download infrastructure (all views — trackable enrolled + non-trackable default) ──
  const { isOffline } = useNetwork();
  const [isDownloadStarting, setIsDownloadStarting] = useState(false);

  // Refetch collection hierarchy the moment device comes back online so the UI
  // immediately shows server data instead of the stale offline-cached hierarchy.
  const wasCollectionOfflineRef = useRef(isOffline);
  useEffect(() => {
    const wasOffline = wasCollectionOfflineRef.current;
    wasCollectionOfflineRef.current = isOffline;
    if (wasOffline && !isOffline) {
      void refetchCollection();
    }
  }, [isOffline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle for downloaded content filter — ON by default when opened offline
  const [viewDownloadedOnly, setViewDownloadedOnly] = useState(isOffline);

  // Auto-download spine ECAR for offline hierarchy support on first visit
  // Auto-download spine ECAR removed to prevent premature entry in Downloaded Contents list.
  // Spine is now handled exclusively by startBulkDownload when a manual download is initiated.

  const leafIdentifiers = useMemo(() => {
    if (!collectionData?.children) return [];
    return flattenLeafNodes(collectionData.children).map((n) => n.identifier);
  }, [collectionData?.children]);

  // Check if this collection itself has been downloaded (spine ECAR imported).
  // When the collection IS downloaded, all locally-available children (regardless of
  // visibility) show as "downloaded in this collection". When NOT downloaded, no
  // children show as downloaded — even if they exist locally from a standalone download
  // or another collection. This avoids ref_count ambiguity when the same content
  // appears in multiple collections.
  const { isLocal: isCollectionDownloaded } = useIsContentLocal(collectionId, { includeParentVisibility: true });
  const localContentSet = useLocalContentSet(
    isCollectionDownloaded ? leafIdentifiers : [],
    { includeParentVisibility: true },
  );
  const courseProgress = useCourseDownloadProgress(collectionId, collectionData?.children, localContentSet);
  const downloadStates = useBatchDownloadStates(leafIdentifiers);

  // Download size info for the confirm dialog
  const downloadSizeInfo = useMemo(() => {
    if (!collectionData?.children) return { totalBytes: 0, downloadableCount: 0, alreadyLocalCount: 0, skippedTypes: [] };
    return calculateDownloadSize(collectionData.children, localContentSet);
  }, [collectionData?.children, localContentSet]);

  // Filtered hierarchy for "View Downloaded Only" toggle
  const filteredChildren = useMemo(() => {
    if (!viewDownloadedOnly || !collectionData?.children) return collectionData?.children ?? [];
    return filterHierarchyTree(collectionData.children, localContentSet);
  }, [viewDownloadedOnly, collectionData?.children, localContentSet]);

  // Download is available for: enrolled trackable courses OR non-trackable collections (all users)
  const canDownload = viewState === 'enrolled' || viewState === 'default';

  const [isDownloadSheetOpen, setIsDownloadSheetOpen] = useState(false);

  const handleDownloadAll = useCallback(async () => {
    setIsDownloadSheetOpen(false);
    if (!collectionData?.children) return;
    if (isOffline) {
      setToastMessage({ message: t('download.noInternet'), color: 'warning', icon: warningOutline });
      return;
    }
    setIsDownloadStarting(true);
    try {
      // Pass spine download URL from hierarchy root for offline hierarchy support
      const spineUrl = collectionData.hierarchyRoot?.downloadUrl;
      const pkgVersion = collectionData.hierarchyRoot?.pkgVersion;
      const result = await startBulkDownload(collectionId, collectionData.children, {
        spineDownloadUrl: spineUrl,
        pkgVersion,
      });
      if (result.enqueued === 0 && result.skippedLocal > 0) {
        setToastMessage({ message: t('download.allDownloaded') });
      } else if (result.enqueued > 0) {
        setToastMessage({ message: t('download.downloadingItems', { count: result.enqueued }) });
      }
    } catch {
      setToastMessage({ message: t('download.failedToStart'), color: 'danger', icon: warningOutline });
    } finally {
      setIsDownloadStarting(false);
    }
  }, [collectionData, collectionId, isOffline, t]);

  // Delete all downloaded content for this collection
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAll = useCallback(async () => {
    setShowDeleteAlert(false);
    if (!collectionData?.children) return;
    setIsDeleting(true);
    try {
      const leaves = flattenLeafNodes(collectionData.children);
      const localLeaves = leaves.filter((l) => localContentSet.has(l.identifier));
      for (const leaf of localLeaves) {
        await deleteDownloadedContent(leaf.identifier);
      }
      // Also delete the parent collection entry from ContentDb so it
      // disappears from DownloadedContentsPage
      await contentDbService.delete(collectionId);
      downloadManager.notifyContentDeleted(collectionId);
      // Reset the "success toast shown" flag so it fires again after a fresh download
      localStorage.removeItem(`dl_toast_shown_${collectionId}`);
      setToastMessage({ message: t('download.deleted') });
    } catch {
      setToastMessage({ message: t('download.deleteFailed'), color: 'danger', icon: warningOutline });
    } finally {
      setIsDeleting(false);
    }
  }, [collectionData, collectionId, localContentSet, t]);

  // Pause / Resume all downloads for this collection
  const handlePauseAll = useCallback(async () => {
    for (const [id, state] of downloadStates) {
      if (['DOWNLOADING', 'QUEUED', 'RETRY_WAIT'].includes(state.state)) {
        await downloadManager.pause(id);
      }
    }
  }, [downloadStates]);

  const handleResumeAll = useCallback(async () => {
    for (const [id, state] of downloadStates) {
      if (state.state === 'PAUSED') {
        await downloadManager.resume(id);
      }
    }
  }, [downloadStates]);

  // True when all active items are IMPORTING (extracting) — no pause/resume in that phase
  const isImporting = useMemo(() => {
    if (!courseProgress.isDownloading) return false;
    let hasQueued = false;
    for (const [, state] of downloadStates) {
      if (state.state === 'DOWNLOADING' || state.state === 'PAUSED') return false;
      if (['QUEUED', 'IMPORTING', 'RETRY_WAIT'].includes(state.state)) hasQueued = true;
    }
    return hasQueued; // only true when QUEUED/IMPORTING items exist (not when all FAILED)
  }, [courseProgress.isDownloading, downloadStates]);

  // Collection-level download state summary for the header icon
  const collectionDownloadStatus = useMemo((): 'none' | 'partial_error' | 'all_failed' | 'partial_local' => {
    // If anything is currently active (queued/downloading/importing/paused), don't show summary state yet
    if (courseProgress.isDownloading) return 'none';

    // If we have any failures, they take priority for UI feedback (retry action)
    let failedCount = 0;
    for (const id of leafIdentifiers) {
      if (downloadStates.get(id)?.state === 'FAILED') failedCount++;
    }

    if (failedCount > 0) {
      return localContentSet.size > 0 ? 'partial_error' : 'all_failed';
    }

    // No errors; check if we are partially local (some units downloaded, others not enqueued etc)
    if (localContentSet.size > 0 && !courseProgress.isFullyLocal) {
      return 'partial_local';
    }

    return 'none';
  }, [courseProgress.isDownloading, courseProgress.allDownloaded, localContentSet, leafIdentifiers, downloadStates]);

  // Pre-compute ring geometry for the header progress indicator
  const dlRingRadius = 16;
  const dlRingCirc = 2 * Math.PI * dlRingRadius;
  const dlRingOffset = dlRingCirc - (courseProgress.overallPercent / 100) * dlRingCirc;

  // 3-dot menu state (Completed section)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Leave course confirmation
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Certificate preview modal
  const [isCertPreviewOpen, setIsCertPreviewOpen] = useState(false);

  const showConsent =
    isAuthenticated &&
    !isCreator &&
    enrollment.isEnrolled &&
    collectionData?.userConsent?.toLowerCase() === 'yes';

  const consent = useConsent({
    collectionId,
    channel: collectionData?.channel,
    enabled: showConsent,
  });

  const { data: userProfile } = useUser(userId);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  type ToastConfig = { message: string; color?: string; icon?: string };
  const [toastMessage, setToastMessage] = useState<ToastConfig | null>(null);
  const [consentToastMessage, setConsentToastMessage] = useState('');

  // Download event toast (success/failure per-item, similar to ContentPlayerPage)
  type DownloadToastConfig = { message: string; color: 'success' | 'danger'; icon?: string };
  const [downloadToast, setDownloadToast] = useState<DownloadToastConfig | null>(null);

  // Listen for progress completion to show aggregate success message
  useEffect(() => {
    if (!collectionId) return;
    const unsub = downloadManager.subscribe(async (event) => {
      // When the entire queue is done, check if we were downloading items for THIS collection
      if (event.type === 'all_done') {
        const leaves = flattenLeafNodes(collectionData?.children ?? []);
        const downloadable = leaves.filter(isDownloadable);
        const identifiers = downloadable.map(l => l.identifier);

        // Count how many are now local (visibility-aware)
        const entries = await contentDbService.getByIdentifiers(identifiers);
        const localCount = entries.filter(e => e.content_state === 2).length;

        // Show aggregate success toast only once per download session.
        // Resets when the user deletes the content (handleDeleteAll clears the key).
        const toastKey = `dl_toast_shown_${collectionId}`;
        if (downloadable.length > 0 && localCount > 0 && !localStorage.getItem(toastKey)) {
          localStorage.setItem(toastKey, '1');
          setDownloadToast({
            message: `Downloaded (${localCount}/${downloadable.length} items) successfully.`,
            color: 'success',
            icon: checkmarkCircle,
          });
        }
      } else if (event.type === 'state_change' && event.identifier) {
        const entry = await downloadManager.getEntry(event.identifier);
        if (entry?.state === 'FAILED') {
          // Show failed toast only once per item (until it's retried/deleted)
          const failKey = `dl_fail_shown_${event.identifier}`;
          if (!localStorage.getItem(failKey)) {
            localStorage.setItem(failKey, '1');
            // Try to get the content name for a descriptive message
            const contentEntry = await contentDbService.getByIdentifier(event.identifier);
            const contentName = (() => {
              try {
                const server = contentEntry?.server_data ? JSON.parse(contentEntry.server_data) : null;
                return server?.name || server?.title || null;
              } catch { return null; }
            })();
            setDownloadToast({
              message: contentName
                ? `Failed to download "${contentName}"`
                : t('download.downloadFailed'),
              color: 'danger',
              icon: alertCircleOutline,
            });
          }
        }
        // Clear the fail-shown flag when the item is retried so the toast can fire again
        if (entry?.state === 'DOWNLOADING' || entry?.state === 'QUEUED') {
          localStorage.removeItem(`dl_fail_shown_${event.identifier}`);
        }
      }
    });
    return unsub;
  }, [collectionId, collectionData, t]);

  // Force sync (enrolled only)
  const forceSync = useForceSync(userId, collectionId, enrollment.enrolledBatchId ?? undefined, enrollment.progressProps, enrollment.isBatchEnded);

  // Show force sync errors as a toast instead of inline text
  useEffect(() => {
    if (forceSync.forceSyncError) {
      setDownloadToast({ message: forceSync.forceSyncError, color: 'danger', icon: alertCircleOutline });
    }
  }, [forceSync.forceSyncError]);

  // Related content search
  const hierarchySuccess = !isError && !!collectionData;
  const { data: searchData } = useContentSearch({
    request: { limit: 20, offset: 0 },
    enabled: hierarchySuccess,
  });
  const relatedItems = useMemo(
    () => mapSearchContentToRelatedContentItems(searchData?.data?.content, collectionData?.id, 3),
    [searchData, collectionData?.id],
  );

  const handleBack = () => {
    if (location.state?.parentRoute) {
      router.push(location.state.parentRoute, 'back', 'pop');
    } else {
      router.goBack();
    }
  };


  const handleJoinCourse = async () => {
    if (!selectedBatchId || !collectionId || !userId) return;
    try {
      await enrollment.enrol.mutateAsync({ courseId: collectionId, userId, batchId: selectedBatchId });
      void telemetryService.audit({
        edata: { props: ['enrollment'], prevstate: 'NotEnrolled', state: 'Enrolled' },
        object: { id: collectionId, type: 'Collection', ver: '1' },
      });
      setIsBatchModalOpen(false);
    } catch {
      // Error is available via enrollment.joinError
    }
  };

  const handleLeaveCourse = async () => {
    if (!collectionId || !userId || !enrollment.enrolledBatchId) return;
    if (isOffline) {
      setDownloadToast({ message: t('collection.leaveCourseOffline'), color: 'danger', icon: alertCircleOutline });
      setShowLeaveConfirm(false);
      return;
    }
    setIsLeaving(true);
    try {
      await enrollment.unenrol.mutateAsync({
        courseId: collectionId,
        userId,
        batchId: enrollment.enrolledBatchId,
      });
      setShowLeaveConfirm(false);
      setIsMenuOpen(false);
    } catch (err) {
      const msg = (err as Error)?.message?.trim() || 'Failed to unenroll from the course';
      setDownloadToast({ message: msg, color: 'danger', icon: alertCircleOutline });
    } finally {
      setIsLeaving(false);
    }
  };

  // Enrollment data for CollectionAccordion (enrolled view only)
  const enrollmentData = useMemo(() => {
    if (viewState !== 'enrolled') return undefined;
    return {
      contentStatusMap: enrollment.contentStatusMap,
      contentAttemptInfoMap: enrollment.contentAttemptInfoMap,
    };
  }, [viewState, enrollment.contentStatusMap, enrollment.contentAttemptInfoMap]);
  const batchStartLabel = enrollment.batchStartDate
    ? new Date(enrollment.batchStartDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : '';

  // Fullscreen player
  if (playingContentId) {
    return (
      <CollectionContentPlayer
        contentId={playingContentId}
        onClose={() => setPlayingContentId(null)}
        collectionId={collectionId}
        batchId={enrollment.enrolledBatchId ?? undefined}
        hierarchyRoot={collectionData?.hierarchyRoot}
        isEnrolled={enrollment.isEnrolled}
        isBatchEnded={enrollment.isBatchEnded}
        currentContentStatus={playingContentId ? enrollment.contentStatusMap[playingContentId] : undefined}
        skipContentStateUpdate={isCreator}
      />
    );
  }

  // Snapshot progress before opening the player so CourseCompletionDialog can
  // detect a <100 → ≥100 transition that happened while the dialog was unmounted.
  const openPlayer = (contentId: string) => {
    progressBeforePlayerRef.current = enrollment.progressProps.percentage;
    setPlayingContentId(contentId);
  };

  // Upcoming batch gate
  if (!isLoading && collectionData && viewState === 'enrolled' && isTrackable && enrollment.isBatchUpcoming) {
    const startLabel = enrollment.batchStartDate
      ? new Date(enrollment.batchStartDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    return (
      <IonPage className="collection-page">
        <IonHeader className="ion-no-border">
          <IonToolbar className="collection-page-header">
            <div className="collection-page-header-inner">
              <button onClick={handleBack} className="collection-page-icon-btn">
                <BackIcon />
              </button>
            </div>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <div style={{ marginTop: '4rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{collectionData.title}</h2>
            <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              This batch has not started yet.
              {startLabel ? ` It starts on ${startLabel}.` : ''}{' '}
              You can access the content once the batch begins.
            </p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const collectionObject = collectionData
    ? { id: collectionId, type: collectionData.primaryCategory || 'Collection', ver: '1' }
    : undefined;

  const spineUrl = collectionData?.hierarchyRoot?.downloadUrl;
  const spinePkgVersion = collectionData?.hierarchyRoot?.pkgVersion;

  return (
    <IonPage className="collection-page">
      <TelemetryTracker
        disabled={!collectionData}
        startEventInput={{ type: 'START', mode: 'play', pageid: 'CollectionPage' }}
        endEventInput={{ type: 'END', mode: 'play', pageid: 'CollectionPage', summary: [] }}
        startOptions={collectionObject ? { object: collectionObject } : undefined}
        endOptions={collectionObject ? { object: collectionObject } : undefined}
        summaryOptions={collectionObject ? { object: collectionObject } : undefined}
      />
      <IonHeader className="ion-no-border">
        <IonToolbar className="collection-page-header">
          <div className="collection-page-header-inner">
            <button onClick={handleBack} className="collection-page-icon-btn">
              <BackIcon />
            </button>
            <div className="collection-page-header-actions">
              {/* Download area — visible for enrolled trackable courses + all non-trackable collections */}
              {canDownload && collectionData && (
                courseProgress.isFullyLocal && localContentSet.size > 0 ? (
                  /* Trash icon — all content downloaded, tap to delete */
                  <button
                    className="collection-page-icon-btn"
                    onClick={() => setShowDeleteAlert(true)}
                    aria-label={t('download.deleteDownloadedContent')}
                  >
                    {isDeleting ? (
                      <IonSpinner name="crescent" style={{ width: 20, height: 20, color: 'var(--ion-color-primary)' }} />
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19ZM10 10V17M14 10V17" stroke="var(--ion-color-primary, #024f9d)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ) : courseProgress.isDownloading ? (
                  isImporting ? (
                    /* Extracting phase — spinner only, no pause/resume */
                    <span className="collection-page-icon-btn" style={{ cursor: 'default' }}>
                      <IonSpinner name="crescent" style={{ width: 24, height: 24, color: 'var(--ion-color-primary)' }} />
                    </span>
                  ) : (
                    /* Downloading — circular progress ring with pause/resume */
                    <button
                      onClick={courseProgress.isPaused ? handleResumeAll : handlePauseAll}
                      aria-label={courseProgress.isPaused ? t('download.resumeAll') : t('download.pauseAll')}
                      style={{
                        position: 'relative', width: 44, height: 44, padding: 0,
                        border: 'none', background: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute', top: 0, left: 0 }}>
                        <circle cx="22" cy="22" r={dlRingRadius} fill="none" stroke="var(--ion-color-light-shade, #d0d0d0)" strokeWidth="3.5" />
                        <circle
                          cx="22" cy="22" r={dlRingRadius} fill="none"
                          stroke="var(--ion-color-primary)"
                          strokeWidth="3.5"
                          strokeDasharray={dlRingCirc}
                          strokeDashoffset={dlRingOffset}
                          strokeLinecap="round"
                          transform="rotate(-90 22 22)"
                        />
                      </svg>
                      <IonIcon
                        icon={courseProgress.isPaused ? play : pause}
                        style={{ fontSize: '18px', color: 'var(--ion-color-primary)', position: 'relative', zIndex: 1 }}
                      />
                    </button>
                  )
                ) : collectionDownloadStatus === 'all_failed' ? (
                  /* All downloads failed — red error icon, tap to retry via download sheet */
                  <button
                    className="collection-page-icon-btn"
                    onClick={() => setIsDownloadSheetOpen(true)}
                    aria-label={t('download.downloadFailedRetry')}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="var(--ion-color-danger, #eb445a)" strokeWidth="1.5" />
                      <path d="M12 8V12M12 16H12.01" stroke="var(--ion-color-danger, #eb445a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : collectionDownloadStatus === 'partial_error' || collectionDownloadStatus === 'partial_local' ? (
                  /* Partial status (failures or pending) — yellow warning download icon, tap to retry/download remaining */
                  <button
                    className="collection-page-icon-btn"
                    onClick={() => setIsDownloadSheetOpen(true)}
                    aria-label={
                      collectionDownloadStatus === 'partial_error'
                        ? t('download.partialDownloadRetry')
                        : t('download.partialDownloadRemaining')
                    }
                    style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M12 4V16M12 16L7 11M12 16L17 11" stroke="var(--ion-color-warning, #ffc409)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 20H20" stroke="var(--ion-color-warning, #ffc409)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : (
                  /* Download button — opens download sheet */
                  <button
                    className="collection-page-icon-btn"
                    onClick={() => setIsDownloadSheetOpen(true)}
                    disabled={isDownloadStarting}
                    aria-label={t('download.download')}
                  >
                    {isDownloadStarting ? (
                      <IonSpinner name="crescent" style={{ width: 20, height: 20, color: 'var(--ion-color-primary)' }} />
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M12 4V16M12 16L7 11M12 16L17 11" stroke="var(--ion-color-primary, #024f9d)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 20H20" stroke="var(--ion-color-primary, #024f9d)" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                )
              )}
              <button className="collection-page-icon-btn" onClick={() => router.push('/search', 'forward', 'push')}>
                <SearchIcon />
              </button>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {/* Offline with no cached data — show immediately, bypassing any pending/idle query state */}
        {isOffline && !isLoading && !collectionData && (
          <PageLoader error={t('collection.offlineNotAvailable')} />
        )}

        {/* Loading spinner — suppressed when offline+no-data is already handled above */}
        {(isLoading || isQueryIdle) && !(isOffline && !collectionData) && (
          <PageLoader message={t('loading')} />
        )}

        {!isLoading && !isQueryIdle && isError && (
          <PageLoader error={t('collection.errorLoading')} />
        )}

        {!isOffline && !isLoading && !isQueryIdle && !isError && !collectionData && (
          <PageLoader error={t('collection.notFound')} />
        )}

        {/* ── Default / Anonymous / Unenrolled view ── */}
        {!isLoading && collectionData && viewState !== 'enrolled' && (
          <>
            <CollectionOverview
              collectionData={collectionData}
              isCourse={isCourse}
              t={t}
            />

            {/* View Downloaded Only toggle — inline below overview for non-trackable */}
            {viewState === 'default' && (
              <div className="cp-toggle-section">
                <span className="cp-toggle-label">{t('download.viewDownloadedOnly')}</span>
                <IonToggle
                  className="custom-toggle"
                  checked={viewDownloadedOnly}
                  onIonChange={(e) => setViewDownloadedOnly(e.detail.checked)}
                />
              </div>
            )}

            {viewDownloadedOnly && filteredChildren.length === 0 ? (
              <div style={{ background: '#fff', margin: '0.5rem 1rem', borderRadius: '0.75rem', padding: '2rem 1rem', textAlign: 'center', color: 'var(--ion-color-dark-tint, #4a4a4a)' }}>
                No Downloaded contents found
              </div>
            ) : (
              <CollectionAccordion
                children={viewState === 'default' ? filteredChildren : collectionData.children}
                collectionId={collectionId}
                isCourse={isCourse}
                viewState={viewState}
                t={t}
                onContentPlay={openPlayer}
                localContentSet={viewState === 'default' ? localContentSet : undefined}
                isOffline={viewState === 'default' ? isOffline : undefined}
                downloadStates={viewState === 'default' ? downloadStates : undefined}
                spineDownloadUrl={spineUrl}
                spinePkgVersion={spinePkgVersion}
              />
            )}

            <RelatedContent items={relatedItems} t={t} />
            <FAQSection />
            <div style={{ height: '80px' }} />
          </>
        )}

        {/* ── Enrolled trackable view ── */}
        {!isLoading && collectionData && viewState === 'enrolled' && (
          <>
            {/* Course Overview with progress merged in */}
            <CollectionOverview
              collectionData={collectionData}
              isCourse={isCourse}
              t={t}
              hideBestSuited
            >
              {/* Progress + 3-dot menu inside overview card */}
              <div className="cp-enrolled-progress-row">
                <div className="cp-progress-section">
                  <CircularProgress value={enrollment.progressProps.percentage} size={48} />
                  <div className="cp-progress-details">
                    <h3 className="cp-progress-percentage">{t('completed')}: {enrollment.progressProps.percentage}%</h3>
                    {batchStartLabel && <span className="cp-progress-date">{t('collection.batchStartedOn')} : {batchStartLabel}</span>}
                  </div>
                </div>
                {/* 3-dot menu only if there are items to show */}
                {(enrollment.progressProps.percentage < 100 || forceSync.showForceSyncButton) && (
                  <div className="cp-menu-wrapper" ref={menuRef}>
                    <button
                      className="cp-menu-trigger"
                      onClick={() => setIsMenuOpen((prev) => !prev)}
                      aria-label="More options"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="5" r="2" fill="var(--ion-color-dark, #333)" />
                        <circle cx="12" cy="12" r="2" fill="var(--ion-color-dark, #333)" />
                        <circle cx="12" cy="19" r="2" fill="var(--ion-color-dark, #333)" />
                      </svg>
                    </button>
                    {isMenuOpen && (
                      <>
                        <div className="cp-menu-backdrop" onClick={() => setIsMenuOpen(false)} />
                        <div className="cp-menu-dropdown">
                          {enrollment.progressProps.percentage >= 100 ? (
                            forceSync.showForceSyncButton && (
                              <button
                                className="cp-menu-item"
                                onClick={() => {
                                  forceSync.handleForceSync();
                                  setIsMenuOpen(false);
                                }}
                                disabled={forceSync.isForceSyncing}
                              >
                                {forceSync.isForceSyncing ? (
                                  <IonSpinner name="crescent" style={{ width: 14, height: 14 }} />
                                ) : (
                                  t('download.syncProgress')
                                )}
                              </button>
                            )
                          ) : (
                            <button
                              className="cp-menu-item cp-menu-item-danger"
                              onClick={() => {
                                setIsMenuOpen(false);
                                setShowLeaveConfirm(true);
                              }}
                            >
                              {t('download.leaveCourse')}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CollectionOverview>

            {/* View Downloaded Only toggle — inline below progress */}
            {canDownload && (
              <div className="cp-toggle-section">
                <span className="cp-toggle-label">{t('download.viewDownloadedOnly')}</span>
                <IonToggle
                  className="custom-toggle"
                  checked={viewDownloadedOnly}
                  onIonChange={(e) => setViewDownloadedOnly(e.detail.checked)}
                />
              </div>
            )}

            {/* Enrolled Curriculum — reuses CollectionAccordion with enrollment data for status icons */}
            {viewDownloadedOnly && filteredChildren.length === 0 ? (
              <div style={{ background: '#fff', margin: '0.5rem 1rem', borderRadius: '0.75rem', padding: '2rem 1rem', textAlign: 'center', color: 'var(--ion-color-dark-tint, #4a4a4a)' }}>
                No Downloaded contents found
              </div>
            ) : (
              <CollectionAccordion
                children={filteredChildren}
                collectionId={collectionId}
                isCourse={isCourse}
                viewState={viewState}
                t={t}
                onContentPlay={openPlayer}
                enrollmentData={enrollmentData}
                hideTitle
                localContentSet={localContentSet}
                isOffline={isOffline}
                downloadStates={downloadStates}
                spineDownloadUrl={spineUrl}
                spinePkgVersion={spinePkgVersion}
              />
            )}

            {/* Info Cards */}
            <div className="info-cards-container">
              {/* Certificate Card — A3: always shown for enrolled users, A6: not for creator, hidden offline */}
              {!isCreator && !isOffline && (
                <div className="info-card">
                  <div className="info-card-header">
                    <CertificateIcon />
                    <h3 className="info-card-title">{t('certificate')}</h3>
                  </div>
                  {enrollment.hasCertificate ? (
                    <>
                      <p className="info-card-desc">Earn a certificate on completion of the course. Verify the details before completing the course.</p>
                      {enrollment.certPreviewUrl && (
                        <button
                          className="btn-primary"
                          onClick={() => setIsCertPreviewOpen(true)}
                        >
                          Preview Certificate
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="info-card-desc">Currently, this course does not have a certificate. The course creator may attach a certificate later.</p>
                  )}
                </div>
              )}

              {/* Profile Data Sharing */}
              {showConsent && (
                <div className="info-card">
                  <h3 className="info-card-title" style={{ marginTop: 0 }}>{t('personalInformation')}</h3>
                  <p className="info-card-desc">
                    {consent.status === 'ACTIVE'
                      ? 'Profile data sharing is On. You have agreed to share your profile details with the course administrator.'
                      : 'Profile data sharing is Off. You have not agreed to share your profile details with the course administrator.'}
                  </p>
                  <div className="info-card-footer">
                    {consent.lastUpdatedOn && (
                      <span className="info-card-date">
                        Last updated on {new Date(consent.lastUpdatedOn).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      className="btn-link"
                      onClick={() => {
                        setConsentChecked(false);
                        setIsConsentModalOpen(true);
                      }}
                      disabled={consent.isUpdating}
                    >
                      {consent.isUpdating ? <IonSpinner name="crescent" style={{ width: 14, height: 14 }} /> : 'Update'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Course Completion Dialog */}
            <CourseCompletionDialog
              progressPercentage={enrollment.progressProps.percentage}
              isEnrolled={enrollment.isEnrolled}
              isEnrollmentLoading={enrollment.isLoading}
              isViewActive={isViewActive}
              collectionId={collectionId}
              hasCertificate={enrollment.hasCertificate}
              progressBeforePlayer={progressBeforePlayerRef.current}
              isOffline={isOffline}
            />

            {/* Task 4: Certificate Preview Modal (in-app) */}
            <IonModal
              isOpen={isCertPreviewOpen}
              onDidDismiss={() => setIsCertPreviewOpen(false)}
              className="cp-cert-preview-modal"
            >
              <div className="cp-cert-preview-content">
                <div className="cp-cert-preview-header">
                  <h2 className="cp-cert-preview-title">{t('download.previewCertificate')}</h2>
                  <button className="cp-cert-preview-close" onClick={() => setIsCertPreviewOpen(false)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="var(--ion-color-dark, #333)" />
                    </svg>
                  </button>
                </div>
                <div className="cp-cert-preview-body">
                  {enrollment.certPreviewUrl && (
                    <img
                      src={enrollment.certPreviewUrl}
                      alt="Certificate Preview"
                      className="cp-cert-preview-img"
                    />
                  )}
                </div>
              </div>
            </IonModal>

            {/* Leave Course Confirmation Dialog */}
            <IonModal
              isOpen={showLeaveConfirm}
              onDidDismiss={() => setShowLeaveConfirm(false)}
              className="cp-completion-dialog"
            >
              <div className="cp-completion-dialog-content">
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.75rem', color: 'var(--ion-color-dark)' }}>
                  {t('download.leaveCourse')}
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--ion-color-medium)', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
                  {t('download.leaveCourseConfirm')}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    className="cp-completion-dialog-btn"
                    style={{ background: '#fff', border: '1px solid var(--ion-color-primary)', color: 'var(--ion-color-primary)', flex: 1 }}
                    onClick={() => setShowLeaveConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="cp-completion-dialog-btn"
                    style={{ background: 'var(--ion-color-primary)', border: '1px solid var(--ion-color-primary)', color: '#fff', opacity: isLeaving ? 0.6 : 1, flex: 1 }}
                    onClick={handleLeaveCourse}
                    disabled={isLeaving}
                  >
                    {isLeaving ? <IonSpinner name="crescent" style={{ width: 14, height: 14 }} /> : t('download.leave')}
                  </button>
                </div>
              </div>
            </IonModal>

            {/* Consent Modal */}
            <IonModal
              isOpen={isConsentModalOpen}
              onDidDismiss={() => setIsConsentModalOpen(false)}
              className="cp-consent-modal"
              initialBreakpoint={0.65}
              breakpoints={[0, 0.65, 1]}
            >
              <div className="cp-consent-modal-wrap" style={{ padding: '1.5rem', background: 'var(--ion-background-color, #fff)', color: 'var(--ion-text-color, #000)', flex: 1, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--ion-color-light-shade, #eee)', paddingBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--ion-text-color)' }}>{t('personalInformation')}</h2>
                  <button onClick={() => setIsConsentModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', lineHeight: 1, color: 'var(--ion-color-medium)' }}>&times;</button>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--ion-color-dark)', lineHeight: '1.6' }}>
                  <p style={{ margin: '0.5rem 0' }}><strong>Name:</strong> {userProfile?.firstName || ''} {userProfile?.lastName || ''}</p>
                  <p style={{ margin: '0.5rem 0' }}><strong>State:</strong> {(userProfile as any)?.state || '-'}</p>
                  <p style={{ margin: '0.5rem 0' }}><strong>User ID:</strong> {userProfile?.id || userProfile?.userId || userId}</p>
                  <p style={{ margin: '0.5rem 0' }}><strong>Mobile Number:</strong> {(userProfile as any)?.maskedPhone || (userProfile as any)?.phone || ''}</p>
                  <p style={{ margin: '0.5rem 0' }}><strong>Email:</strong> {(userProfile as any)?.maskedEmail || (userProfile as any)?.email || ''}</p>

                  <p style={{ color: 'var(--ion-color-medium)', marginTop: '1rem', marginBottom: '1rem' }}>You can edit these details from your profile.</p>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input
                      type="checkbox"
                      id="consent-checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      style={{ marginTop: '0.2rem', accentColor: 'var(--ion-color-primary)' }}
                    />
                    <label htmlFor="consent-checkbox" style={{ fontSize: '0.9rem', color: 'var(--ion-text-color)' }}>
                      I agree to share the above profile details with the course administrator.
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      onClick={async () => {
                        await consent.updateConsent('REVOKED');
                        setIsConsentModalOpen(false);
                        setConsentToastMessage('Profile data sharing preference updated.');
                        consent.refetch();
                      }}
                      style={{ padding: '0.6rem 1rem', border: '1px solid var(--ion-color-medium-tint)', borderRadius: '8px', background: 'transparent', color: 'var(--ion-color-dark)', fontWeight: 500 }}
                    >
                      Do not share
                    </button>
                    <button
                      onClick={async () => {
                        if (consentChecked) {
                          await consent.updateConsent('ACTIVE');
                          setIsConsentModalOpen(false);
                          setConsentToastMessage('Profile data sharing preference updated.');
                          consent.refetch();
                        }
                      }}
                      disabled={!consentChecked || consent.isUpdating}
                      style={{ padding: '0.6rem 1rem', border: 'none', borderRadius: '8px', background: consentChecked ? 'var(--ion-color-primary, #D28D5D)' : 'var(--ion-color-light-shade, #ccc)', color: consentChecked ? 'var(--ion-color-primary-contrast, #fff)' : 'var(--ion-color-medium)', fontWeight: 500 }}
                    >
                      {consent.isUpdating ? <IonSpinner name="crescent" style={{ width: 14, height: 14 }} /> : 'Share'}
                    </button>
                  </div>
                </div>
              </div>
            </IonModal>

            <IonToast
              isOpen={!!consentToastMessage}
              onDidDismiss={() => setConsentToastMessage('')}
              message={consentToastMessage}
              duration={3000}
              position="top"
              color="dark"
            />


            <RelatedContent items={relatedItems} t={t} />
            <FAQSection />
            <div style={{ height: '40px' }} />
          </>
        )}
      </IonContent>

      {/* Anonymous: "Let's Get Started" → login */}
      {viewState === 'anonymous' && !isLoading && collectionData && (
        <div
          className="cp-bottom-cta"
          onClick={() => {
            router.push('/sign-in', 'forward', 'push');
          }}
        >
          <span className="cp-bottom-cta-text">{t('collection.letsGetStarted')}</span>
          <RightArrowIcon />
        </div>
      )}

      {/* Unenrolled: "Join the Course" → open batch modal (blocked for creators) */}
      {viewState === 'unenrolled' && isTrackable && !isLoading && collectionData && (
        <>
          <div
            className="cp-bottom-cta"
            onClick={() => {
              if (isCreator) {
                setToastMessage({ message: t('collection.creatorCannotEnrol'), color: 'warning', icon: warningOutline });
              } else {
                setIsBatchModalOpen(true);
              }
            }}
          >
            <span className="cp-bottom-cta-text">{t('collection.joinTheCourse')}</span>
          </div>

          <IonModal
            isOpen={isBatchModalOpen}
            onDidDismiss={() => setIsBatchModalOpen(false)}
            initialBreakpoint={0.35}
            breakpoints={[0, 0.35]}
            className="cp-batch-modal"
          >
            <div className="cp-batch-modal-inner">
              <div className="cp-batch-modal-header">
                <h2>{t('collection.availableBatches')}</h2>
                <button className="cp-batch-modal-close" onClick={() => setIsBatchModalOpen(false)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z" fill="var(--ion-color-primary)" />
                  </svg>
                </button>
              </div>
              <div className="cp-batch-modal-content">
                {enrollment.batchListLoading ? (
                  <div style={{ textAlign: 'center', padding: '1rem' }}><IonSpinner name="crescent" /></div>
                ) : enrollment.batchListError ? (
                  <p style={{ color: 'var(--ion-color-danger)', textAlign: 'center' }}>
                    {enrollment.batchListError}
                  </p>
                ) : enrollment.enrollableBatches.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)' }}>
                    {t('collection.noBatchesAvailable')}
                  </p>
                ) : (
                  <>
                    <p className="cp-batch-modal-subtitle">{t('collection.selectBatchToStart')}</p>
                    <div className="cp-batch-select-container">
                      <select
                        className="cp-batch-select"
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                      >
                        <option value="" disabled>{t('collection.selectBatch')}</option>
                        {enrollment.enrollableBatches.map((batch) => (
                          <option key={batch.identifier} value={batch.identifier}>
                            {batch.name ?? batch.identifier}
                          </option>
                        ))}
                      </select>
                      <svg className="cp-batch-select-icon" width="14" height="8" viewBox="0 0 14 8" fill="none">
                        <path d="M1 1L7 7L13 1" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </>
                )}

                {enrollment.joinError && (
                  <p style={{ color: 'var(--ion-color-danger)', fontSize: '13px', textAlign: 'center', marginTop: '8px' }}>
                    {enrollment.joinError}
                  </p>
                )}
              </div>
              <div className="cp-batch-modal-cta-wrap">
                <div
                  className="cp-batch-modal-cta"
                  onClick={handleJoinCourse}
                  style={{ opacity: (!selectedBatchId || enrollment.joinLoading) ? 0.5 : 1 }}
                >
                  {enrollment.joinLoading ? (
                    <IonSpinner name="crescent" style={{ width: 18, height: 18, color: 'white' }} />
                  ) : (
                    <span className="cp-bottom-cta-text">{t('collection.joinTheBatch')}</span>
                  )}
                </div>
              </div>
            </div>
          </IonModal>
        </>
      )}

      {/* ── Download Bottom Sheet ── */}
      <IonModal
        isOpen={isDownloadSheetOpen}
        onDidDismiss={() => setIsDownloadSheetOpen(false)}
        initialBreakpoint={1}
        breakpoints={[0, 1]}
        className="cp-download-sheet"
      >
        <div className="cp-download-sheet-inner">
          <div className="cp-download-sheet-content">

            {/* All downloaded — show delete option */}
            {courseProgress.allDownloaded && localContentSet.size > 0 && !courseProgress.isDownloading && (
              <div className="cp-download-sheet-action">
                <div className="cp-download-sheet-complete">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="8" fill="var(--ion-color-success, #2dd36f)" />
                    <path d="M5 8L7 10L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{t('download.allContentDownloaded')}</span>
                </div>
                <button
                  className="cp-download-sheet-btn cp-download-sheet-btn-delete"
                  onClick={() => {
                    setIsDownloadSheetOpen(false);
                    setShowDeleteAlert(true);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19ZM10 10V17M14 10V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{t('download.deleteAllDownloads')}</span>
                </button>
              </div>
            )}

            {/* Download All — when there are items to download */}
            {!courseProgress.allDownloaded && downloadSizeInfo.downloadableCount > 0 && !courseProgress.isDownloading && (
              <div className="cp-download-sheet-action">
                <p className="cp-download-sheet-desc">
                  Download ({downloadSizeInfo.downloadableCount} items) for {isCourse ? 'Course' : 'Collection'} <strong>{collectionData?.title}</strong>?
                </p>

                <button
                  className="cp-download-sheet-btn"
                  onClick={() => {
                    setIsDownloadSheetOpen(false);
                    handleDownloadAll();
                  }}
                  disabled={isOffline || isDownloadStarting}
                >
                  {isDownloadStarting ? (
                    <IonSpinner name="crescent" style={{ width: 16, height: 16 }} />
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 4V16M12 16L7 11M12 16L17 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 20H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <span>{t('download.download')}{downloadSizeInfo.totalBytes > 0 ? ` (${formatBytes(downloadSizeInfo.totalBytes)})` : ''}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* No downloadable items */}
            {downloadSizeInfo.downloadableCount === 0 && !courseProgress.allDownloaded && !courseProgress.isDownloading && (
              <div className="cp-download-sheet-empty">
                <span>{t('download.noDownloadableItems')}</span>
              </div>
            )}

            {/* Offline warning */}
            {isOffline && (
              <div className="cp-download-sheet-offline">
                <span>{t('download.noInternet')}</span>
              </div>
            )}
          </div>
        </div>
      </IonModal>

      {/* Delete confirmation alert */}
      <IonAlert
        isOpen={showDeleteAlert}
        onDidDismiss={() => setShowDeleteAlert(false)}
        header={`Delete ${isCourse ? 'Course' : 'Collection'}`}
        message={t('download.deleteCollectionMessage', { title: collectionData?.title ?? '' })}
        buttons={[
          { text: t('cancel'), role: 'cancel' },
          { text: t('download.delete'), role: 'destructive', handler: handleDeleteAll },
        ]}
      />

      {/* Page-level toast (creator error, etc.) — visible across all view states */}
      <IonToast
        isOpen={!!toastMessage}
        onDidDismiss={() => setToastMessage(null)}
        message={toastMessage?.message || ''}
        icon={toastMessage?.icon}
        duration={3500}
        position="bottom"
        color={toastMessage?.color}
        cssClass={toastMessage?.color ? "cp-creator-toast" : undefined}
      />

      {/* Download success/failure toast */}
      <IonToast
        isOpen={!!downloadToast}
        message={downloadToast?.message || ''}
        color={downloadToast?.color}
        icon={downloadToast?.icon}
        duration={2500}
        onDidDismiss={() => setDownloadToast(null)}
        position="bottom"
      />
    </IonPage>
  );
};

export default CollectionPage;