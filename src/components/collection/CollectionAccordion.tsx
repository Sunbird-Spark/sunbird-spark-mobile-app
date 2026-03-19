import React, { useState } from 'react';
import { IonAccordionGroup, IonAccordion, IonItem, IonLabel, IonModal, useIonRouter } from '@ionic/react';
import { chevronDownOutline } from 'ionicons/icons';
import type { HierarchyContentNode } from '../../types/collectionTypes';
import { VideoIcon, DocumentIcon } from '../icons/CollectionIcons';

const COLLECTION_MIME = 'application/vnd.ekstep.content-collection';

// ── Helpers ──
function isCollectionNode(node: HierarchyContentNode): boolean {
  return (node.mimeType ?? '').toLowerCase() === COLLECTION_MIME;
}

function isVideoMime(mimeType?: string): boolean {
  return !!mimeType && mimeType.toLowerCase().startsWith('video/');
}

// ── Recursive sub-unit content ──
interface ExpandedUnitContentProps {
  nodes: HierarchyContentNode[];
  collectionId: string;
  viewState: 'anonymous' | 'unenrolled' | 'enrolled';
  onContentClick: (leafId: string) => void;
  t: (key: string) => string;
  depth?: number;
}

const ExpandedUnitContent: React.FC<ExpandedUnitContentProps> = ({
  nodes,
  collectionId,
  viewState,
  onContentClick,
  t,
  depth = 0,
}) => {
  if (!nodes?.length) return null;

  return (
    <div className={`cp-curriculum-nested ${depth > 0 ? 'cp-curriculum-nested-indented' : ''}`}>
      {nodes.map((node) => {
        if (isCollectionNode(node)) {
          // Sub-unit: render as a section title without accordion
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
                viewState={viewState}
                onContentClick={onContentClick}
                t={t}
                depth={depth + 1}
              />
            </div>
          );
        }

        // Leaf content item
        return (
          <div
            key={node.identifier}
            className="cp-curriculum-item"
            onClick={() => onContentClick(node.identifier)}
          >
            <div className="cp-curriculum-item-left">
              <span className="cp-curriculum-item-icon">
                {isVideoMime(node.mimeType) ? <VideoIcon size={22} /> : <DocumentIcon size={22} />}
              </span>
              <span className="cp-curriculum-item-title">{node.name}</span>
            </div>
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
  viewState: 'anonymous' | 'unenrolled' | 'enrolled';
  t: (key: string) => string;
  onContentPlay?: (id: string) => void;
}

const CollectionAccordion: React.FC<CollectionAccordionProps> = ({
  children,
  collectionId,
  isCourse,
  viewState,
  t,
  onContentPlay,
}) => {
  const router = useIonRouter();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleContentClick = (leafId: string) => {
    if (viewState === 'anonymous') {
      setShowLoginPrompt(true);
    } else {
      onContentPlay?.(leafId);
    }
  };

  const [expandedValues, setExpandedValues] = useState<string[]>(
    children && children.length > 0 ? [children[0].identifier] : []
  );

  return (
    <div className="cp-curriculum-section">
      <h2 className="cp-curriculum-title">
        {isCourse ? 'Course' : 'Collection'} Curriculum
      </h2>

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
                <div className="cp-curriculum-unit-name">
                  {unit.name ?? `Unit ${unitIndex + 1}`}
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
                viewState={viewState}
                onContentClick={handleContentClick}
                t={t}
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
    </div>
  );
};

export default CollectionAccordion;
