import React, { useState } from 'react';
import { IonAccordionGroup, IonAccordion, IonItem, IonLabel, IonModal, IonToast, useIonRouter } from '@ionic/react';
import { chevronDownOutline } from 'ionicons/icons';
import type { HierarchyContentNode } from '../../types/collectionTypes';
import { VideoIcon, DocumentIcon } from '../icons/CollectionIcons';
import { isSelfAssess } from '../../services/course/enrollmentMapper';

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

// ── Recursive sub-unit content ──
interface ExpandedUnitContentProps {
  nodes: HierarchyContentNode[];
  collectionId: string;
  contentBlocked: boolean;
  onContentClick: (leafId: string) => void;
  t: (key: string) => string;
  depth?: number;
  enrollmentData?: EnrollmentData;
}

const ExpandedUnitContent: React.FC<ExpandedUnitContentProps> = ({
  nodes,
  collectionId,
  contentBlocked,
  onContentClick,
  t,
  depth = 0,
  enrollmentData,
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
              />
            </div>
          );
        }

        const duration = formatDuration(node.duration);
        const status = enrollmentData?.contentStatusMap[node.identifier];
        const attemptInfo = enrollmentData?.contentAttemptInfoMap[node.identifier];
        const selfAssess = enrollmentData ? isSelfAssess(node) : false;
        const maxExceeded = selfAssess && node.maxAttempts && node.maxAttempts > 0 && (attemptInfo?.attemptCount ?? 0) >= node.maxAttempts;

        // Leaf content item
        return (
          <div
            key={node.identifier}
            className="cp-curriculum-item"
            onClick={() => !contentBlocked && !maxExceeded && onContentClick(node.identifier)}
            style={contentBlocked || maxExceeded ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
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
              </div>
            </div>
            {duration && (
              <span className="cp-curriculum-item-duration">{duration}</span>
            )}
          </div>
        );
      })}
    </div>
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
}) => {
  const router = useIonRouter();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showJoinToast, setShowJoinToast] = useState(false);

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
          >
            <IonItem slot="header" lines="none" className="cp-curriculum-unit-header-item">
              <IonLabel className="ion-text-wrap">
                <div className="cp-curriculum-unit-header-row">
                  <div className="cp-curriculum-unit-name">
                    {unit.name ?? `Unit ${unitIndex + 1}`}
                  </div>
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
