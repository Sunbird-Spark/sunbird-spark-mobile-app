import React, { useState, useMemo, useEffect, useRef } from 'react';
import { IonAccordionGroup, IonAccordion, IonItem, IonLabel, IonModal, IonToast, IonSpinner, useIonRouter, IonAlert } from '@ionic/react';
import { chevronDownOutline } from 'ionicons/icons';
import type { HierarchyContentNode } from '../../types/collectionTypes';
import type { DownloadProgress } from '../../services/download_manager/types';
import { VideoIcon, DocumentIcon } from '../icons/CollectionIcons';
import { isSelfAssess } from '../../services/course/enrollmentMapper';
import { flattenLeafNodes, isDownloadable } from '../../services/content/hierarchyUtils';
import { startBulkDownload } from '../../services/content/courseDownloadHelper';
import { deleteDownloadedContent } from '../../services/content/contentDeleteHelper';

const COLLECTION_MIME = 'application/vnd.ekstep.content-collection';

// ── Helpers ──
function isCollectionNode(node: HierarchyContentNode): boolean {
  return (node.mimeType ?? '').toLowerCase() === COLLECTION_MIME;
}

function isVideoMime(mimeType?: string): boolean {
  return !!mimeType && mimeType.toLowerCase().startsWith('video/');
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ── Status Icons (enrolled view only) ──
const StatusNotStarted = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="var(--ion-color-medium, #92949c)" strokeWidth="1.5" />
  </svg>
);

const StatusInProgress = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="var(--ion-color-warning, #ffc409)" strokeWidth="1.5" />
    <path d="M8 4V8L10.5 10.5" stroke="var(--ion-color-warning, #ffc409)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const StatusCompleted = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="8" fill="var(--ion-color-success, #2dd36f)" />
    <path d="M5 8L7 10L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function getStatusIcon(status: number | undefined) {
  if (status === 2) return <StatusCompleted />;
  if (status === 1) return <StatusInProgress />;
  return <StatusNotStarted />;
}

// ── Enrollment data passed to accordion for enrolled view ──
interface EnrollmentData {
  contentStatusMap: Record<string, number>;
  contentAttemptInfoMap: Record<string, { attemptCount?: number; bestScore?: { totalScore: number; totalMaxScore: number } }>;
}

// ── Tiny inline progress ring for per-item indicators ──
const ItemProgressRing: React.FC<{ progress: number; size?: number }> = ({ progress, size = 18 }) => {
  const r = (size - 3) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ion-color-light, #e0e0e0)" strokeWidth="2" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ion-color-primary)" strokeWidth="2"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
};

// ── Individual Leaf Item with ephemeral success and error states ──
interface CurriculumLeafItemProps {
  node: HierarchyContentNode;
  collectionId: string;
  contentBlocked: boolean;
  onContentClick: (leafId: string) => void;
  t: (key: string) => string;
  enrollmentData?: EnrollmentData;
  isLocal: boolean;
  isOffline?: boolean;
  downloadState?: DownloadProgress;
  showProgress?: boolean;
}

const CurriculumLeafItem: React.FC<CurriculumLeafItemProps> = ({
  node,
  contentBlocked,
  onContentClick,
  t,
  enrollmentData,
  isLocal,
  isOffline,
  downloadState,
  showProgress,
}) => {
  const duration = formatDuration(node.duration);
  const status = enrollmentData?.contentStatusMap[node.identifier];
  const attemptInfo = enrollmentData?.contentAttemptInfoMap[node.identifier];
  const selfAssess = enrollmentData ? isSelfAssess(node) : false;
  const maxExceeded = selfAssess && node.maxAttempts && node.maxAttempts > 0 && (attemptInfo?.attemptCount ?? 0) >= node.maxAttempts;

  const dimmed = isOffline && !isLocal;
  const blocked = contentBlocked || maxExceeded || dimmed;

  const isActiveDownload = downloadState && ['DOWNLOADING', 'PAUSED', 'QUEUED', 'IMPORTING', 'RETRY_WAIT'].includes(downloadState.state);
  const isFailed = downloadState?.state === 'FAILED';
  const downloadable = isDownloadable(node);

  return (
    <div
      className="cp-curriculum-item"
      onClick={() => !blocked && onContentClick(node.identifier)}
      style={blocked ? { opacity: dimmed ? 0.4 : 0.6, pointerEvents: dimmed ? 'none' : contentBlocked || maxExceeded ? 'none' : undefined } : undefined}
    >
      <div className="cp-curriculum-item-left">
        {enrollmentData && getStatusIcon(status)}
        <span className="cp-curriculum-item-icon">
          {isVideoMime(node.mimeType) ? <VideoIcon size={22} /> : <DocumentIcon size={22} />}
        </span>
        <div>
          <span className="cp-curriculum-item-title">{node.name}</span>
          {selfAssess && attemptInfo?.bestScore && (
            <div style={{ fontSize: '0.7rem', color: 'var(--ion-color-medium)', marginTop: 2 }}>
              Best Score: {attemptInfo.bestScore.totalScore}/{attemptInfo.bestScore.totalMaxScore}
            </div>
          )}
          {maxExceeded && (
            <div style={{ fontSize: '0.7rem', color: 'var(--ion-color-danger, #eb445a)', marginTop: 2 }}>
              Max attempts reached
            </div>
          )}
          {dimmed && (
            <div style={{ fontSize: '0.7rem', color: 'var(--ion-color-medium)', marginTop: 2 }}>
              Download to play offline
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {showProgress && downloadable && isActiveDownload && downloadState && (
          downloadState.state === 'DOWNLOADING' || downloadState.state === 'PAUSED' ? (
            <ItemProgressRing progress={Math.round(downloadState.progress)} />
          ) : (
            <IonSpinner name="crescent" style={{ width: 16, height: 16, color: 'var(--ion-color-primary)' }} />
          )
        )}
        {/* Error icon if failed */}
        {showProgress && downloadable && isFailed && !isActiveDownload && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--ion-color-danger, #eb445a)" strokeWidth="1.5" />
            <path d="M12 8V12M12 16H12.01" stroke="var(--ion-color-danger, #eb445a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {/* Duration shown when not downloading/failed or not downloadable */}
        {duration && (!downloadable || (!isActiveDownload && !isFailed)) && (
          <span className="cp-curriculum-item-duration">{duration}</span>
        )}
      </div>
    </div>
  );
};

// ── Recursive sub-unit content ──
interface ExpandedUnitContentProps {
  nodes: HierarchyContentNode[];
  collectionId: string;
  contentBlocked: boolean;
  onContentClick: (leafId: string) => void;
  t: (key: string) => string;
  depth?: number;
  enrollmentData?: EnrollmentData;
  localContentSet?: Set<string>;
  isOffline?: boolean;
  downloadStates?: Map<string, DownloadProgress>;
  showProgress?: boolean;
}

const ExpandedUnitContent: React.FC<ExpandedUnitContentProps> = ({
  nodes,
  collectionId,
  contentBlocked,
  onContentClick,
  t,
  depth = 0,
  enrollmentData,
  localContentSet,
  isOffline,
  downloadStates,
  showProgress,
}) => {
  if (!nodes?.length) return null;

  return (
    <div className={`cp-curriculum-nested ${depth > 0 ? 'cp-curriculum-nested-indented' : ''}`}>
      {nodes.map((node) => {
        if (isCollectionNode(node)) {
          const childList = node.children ?? [];
          return (
            <div key={node.identifier} className="cp-curriculum-subunit">
              <div className="cp-curriculum-subunit-label">
                <span className="cp-curriculum-subunit-name">
                  {node.name ?? t('collection.untitled')}
                </span>
              </div>
              <ExpandedUnitContent
                nodes={childList}
                collectionId={collectionId}
                contentBlocked={contentBlocked}
                onContentClick={onContentClick}
                t={t}
                depth={depth + 1}
                enrollmentData={enrollmentData}
                localContentSet={localContentSet}
                isOffline={isOffline}
                downloadStates={downloadStates}
                showProgress={showProgress}
              />
            </div>
          );
        }

        return (
          <CurriculumLeafItem
            key={node.identifier}
            node={node}
            collectionId={collectionId}
            contentBlocked={contentBlocked}
            onContentClick={onContentClick}
            t={t}
            enrollmentData={enrollmentData}
            isLocal={localContentSet?.has(node.identifier) ?? false}
            isOffline={isOffline}
            downloadState={downloadStates?.get(node.identifier)}
            showProgress={showProgress}
          />
        );
      })}
    </div>
  );
};

// ── Per-unit download button with progress and delete ──
interface UnitDownloadButtonProps {
  unit: HierarchyContentNode;
  collectionId: string;
  localContentSet?: Set<string>;
  isOffline?: boolean;
  downloadStates?: Map<string, DownloadProgress>;
  spineDownloadUrl?: string;
  spinePkgVersion?: number;
}

const UnitDownloadButton: React.FC<UnitDownloadButtonProps> = ({
  unit,
  collectionId,
  localContentSet,
  isOffline,
  downloadStates,
  spineDownloadUrl,
  spinePkgVersion,
}) => {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const leaves = flattenLeafNodes(unit.children ?? []);
  const downloadableLeaves = leaves.filter(isDownloadable);
  const localCount = downloadableLeaves.filter((l) => localContentSet?.has(l.identifier)).length;
  const allLocal = downloadableLeaves.length > 0 && localCount >= downloadableLeaves.length;
  const hasDownloadable = downloadableLeaves.length > 0;
  const hasAnyLocal = localCount > 0;

  // Count active downloads in this unit & compute aggregate progress
  const { activeCount, avgProgress } = useMemo(() => {
    if (!downloadStates) return { activeCount: 0, avgProgress: 0 };
    let count = 0;
    let totalPct = 0;
    for (const l of downloadableLeaves) {
      const s = downloadStates.get(l.identifier);
      if (s && ['DOWNLOADING', 'PAUSED', 'QUEUED', 'IMPORTING', 'RETRY_WAIT'].includes(s.state)) {
        count++;
        totalPct += s.progress;
      }
    }
    return { activeCount: count, avgProgress: count > 0 ? totalPct / count : 0 };
  }, [downloadableLeaves, downloadStates]);

  const failedCount = useMemo(() => {
    if (!downloadStates) return 0;
    return downloadableLeaves.filter((l) => downloadStates.get(l.identifier)?.state === 'FAILED').length;
  }, [downloadableLeaves, downloadStates]);

  const confirmDelete = async () => {
    setShowAlert(false);
    if (deleting) return;
    setDeleting(true);
    try {
      for (const leaf of downloadableLeaves) {
        if (localContentSet?.has(leaf.identifier)) {
          await deleteDownloadedContent(leaf.identifier);
        }
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAlert(true);
  };

  const handleDownloadRemaining = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOffline || loading) return;
    setLoading(true);
    try {
      await startBulkDownload(collectionId, unit.children ?? [], {
        spineDownloadUrl,
        pkgVersion: spinePkgVersion,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasDownloadable) return null;

  // All downloaded — show delete icon
  if (allLocal && activeCount === 0) {
    return (
      <>
        <button
          onClick={handleDeleteClick}
          disabled={deleting}
          style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', flexShrink: 0 }}
          aria-label="Delete unit downloads"
        >
          {deleting ? (
            <IonSpinner name="crescent" style={{ width: 16, height: 16 }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 6H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19ZM10 10V17M14 10V17" stroke="var(--ion-color-danger, #eb445a)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Delete Unit"
          message={`Delete all downloaded contents for Unit ${unit.name || ''}?`}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Delete', role: 'destructive', handler: confirmDelete },
          ]}
        />
      </>
    );
  }

  // Items actively downloading — show progress ring with count
  if (activeCount > 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ItemProgressRing progress={Math.round(avgProgress)} size={20} />
        <span style={{ fontSize: '0.7rem', color: 'var(--ion-color-primary)' }}>
          {localCount}/{downloadableLeaves.length}
        </span>
      </div>
    );
  }

  // Partial: some items downloaded, some failed — yellow warning download icon
  if (failedCount > 0 && localCount > 0) {
    return (
      <button
        onClick={handleDownloadRemaining}
        disabled={isOffline || loading}
        style={{
          background: 'none', border: 'none', padding: '4px',
          cursor: isOffline ? 'default' : 'pointer',
          opacity: isOffline ? 0.4 : 1, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
        aria-label={`Partial download — retry ${failedCount} failed item(s)`}
      >
        {loading ? (
          <IonSpinner name="crescent" style={{ width: 16, height: 16 }} />
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 4V16M12 16L7 11M12 16L17 11" stroke="var(--ion-color-warning, #ffc409)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 20H20" stroke="var(--ion-color-warning, #ffc409)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: '0.7rem', color: 'var(--ion-color-warning, #ffc409)' }}>
              {localCount}/{downloadableLeaves.length}
            </span>
          </>
        )}
      </button>
    );
  }

  // All failed: no items downloaded, some failed — red error icon
  if (failedCount > 0 && localCount === 0) {
    return (
      <button
        onClick={handleDownloadRemaining}
        disabled={isOffline || loading}
        style={{
          background: 'none', border: 'none', padding: '4px',
          cursor: isOffline ? 'default' : 'pointer',
          opacity: isOffline ? 0.4 : 1, flexShrink: 0,
        }}
        aria-label="Download failed — tap to retry"
      >
        {loading ? (
          <IonSpinner name="crescent" style={{ width: 16, height: 16 }} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--ion-color-danger, #eb445a)" strokeWidth="1.5" />
            <path d="M12 8V12M12 16H12.01" stroke="var(--ion-color-danger, #eb445a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    );
  }

  // Some or none downloaded — show download arrow
  return (
    <button
      onClick={handleDownloadRemaining}
      disabled={isOffline || loading}
      style={{
        background: 'none', border: 'none', padding: '4px',
        cursor: isOffline ? 'default' : 'pointer',
        opacity: isOffline ? 0.4 : 1, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '4px',
      }}
      aria-label={hasAnyLocal ? `Download remaining (${downloadableLeaves.length - localCount} items)` : `Download unit contents (${downloadableLeaves.length} items)`}
    >
      {loading ? (
        <IonSpinner name="crescent" style={{ width: 16, height: 16 }} />
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 4V16M12 16L7 11M12 16L17 11" stroke="var(--ion-color-primary, #8B5E3C)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 20H20" stroke="var(--ion-color-primary, #8B5E3C)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {hasAnyLocal && (
            <span style={{ fontSize: '0.7rem', color: 'var(--ion-color-primary)' }}>
              {localCount}/{downloadableLeaves.length}
            </span>
          )}
        </>
      )}
    </button>
  );
};

// ── Main component ──
interface CollectionAccordionProps {
  children: HierarchyContentNode[];
  collectionId: string;
  isCourse: boolean;
  viewState: 'anonymous' | 'unenrolled' | 'enrolled' | 'default';
  t: (key: string) => string;
  onContentPlay?: (id: string) => void;
  enrollmentData?: EnrollmentData;
  hideTitle?: boolean;
  localContentSet?: Set<string>;
  isOffline?: boolean;
  downloadStates?: Map<string, DownloadProgress>;
  spineDownloadUrl?: string;
  spinePkgVersion?: number;
}

const CollectionAccordion: React.FC<CollectionAccordionProps> = ({
  children,
  collectionId,
  isCourse,
  viewState,
  t,
  onContentPlay,
  enrollmentData,
  hideTitle,
  localContentSet,
  isOffline,
  downloadStates,
  spineDownloadUrl,
  spinePkgVersion,
}) => {
  const router = useIonRouter();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showJoinToast, setShowJoinToast] = useState(false);

  // Progress indicators visible for enrolled + default (not anonymous/unenrolled)
  const showProgress = viewState === 'enrolled' || viewState === 'default';

  // Content is blocked only for logged-in users who haven't joined a batch
  const contentBlocked = viewState === 'unenrolled';

  const handleContentClick = (leafId: string) => {
    if (viewState === 'anonymous') {
      setShowLoginPrompt(true);
    } else if (viewState === 'unenrolled') {
      setShowJoinToast(true);
    } else {
      onContentPlay?.(leafId);
    }
  };

  const [expandedValues, setExpandedValues] = useState<string[]>(
    children && children.length > 0 ? [children[0].identifier] : []
  );

  return (
    <div className="cp-curriculum-section">
      {!hideTitle && (
        <h2 className="cp-curriculum-title">
          {isCourse ? 'Course' : 'Collection'} Curriculum
        </h2>
      )}

      <IonAccordionGroup multiple={true} value={expandedValues} onIonChange={(event) => setExpandedValues(event.detail.value as string[])}>
        {(children ?? []).map((unit, unitIndex) => (
          <IonAccordion
            key={unit.identifier}
            value={unit.identifier}
            className="cp-curriculum-unit"
            toggleIconSlot="start"
            toggleIcon={chevronDownOutline}
            style={{ '--color': 'var(--ion-color-primary)' } as React.CSSProperties}
          >
            <IonItem slot="header" lines="none" className="cp-curriculum-unit-header-item">
              <IonLabel className="ion-text-wrap">
                <div className="cp-curriculum-unit-header-row">
                  <div className="cp-curriculum-unit-name">
                    {unit.name ?? `Unit ${unitIndex + 1}`}
                  </div>
                  {showProgress && (
                    <UnitDownloadButton
                      unit={unit}
                      collectionId={collectionId}
                      localContentSet={localContentSet}
                      isOffline={isOffline}
                      downloadStates={downloadStates}
                      spineDownloadUrl={spineDownloadUrl}
                      spinePkgVersion={spinePkgVersion}
                    />
                  )}
                </div>
                {unit.description && (
                  <div className="cp-curriculum-subtitle">{unit.description}</div>
                )}
              </IonLabel>
            </IonItem>

            <div slot="content" className="cp-curriculum-unit-content">
              <ExpandedUnitContent
                nodes={unit.children ?? []}
                collectionId={collectionId}
                contentBlocked={contentBlocked}
                onContentClick={handleContentClick}
                t={t}
                enrollmentData={enrollmentData}
                localContentSet={localContentSet}
                isOffline={isOffline}
                downloadStates={downloadStates}
                showProgress={showProgress}
              />
            </div>
          </IonAccordion>
        ))}
      </IonAccordionGroup>

      {/* Login prompt for anonymous users */}
      <IonModal
        isOpen={showLoginPrompt}
        onDidDismiss={() => setShowLoginPrompt(false)}
        initialBreakpoint={0.25}
        breakpoints={[0, 0.25]}
        className="cp-login-prompt-modal"
      >
        <div className="cp-login-prompt-inner">
          <h2 className="cp-login-prompt-title">
            Unlock your learning.
          </h2>
          <p className="cp-login-prompt-subtitle">
            Log in to begin your learning journey with us.
          </p>
          <button
            className="cp-login-prompt-btn"
            onClick={() => {
              setShowLoginPrompt(false);
              router.push('/sign-in', 'forward', 'push');
            }}
          >
            Login
          </button>
        </div>
      </IonModal>

      {/* Toast for unenrolled users trying to play content */}
      <IonToast
        isOpen={showJoinToast}
        onDidDismiss={() => setShowJoinToast(false)}
        message="Join the course to access content."
        duration={2500}
        position="bottom"
        color="warning"
      />
    </div>
  );
};

export default CollectionAccordion;
