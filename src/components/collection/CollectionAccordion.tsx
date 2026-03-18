import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { HierarchyContentNode } from '../../types/collectionTypes';
import { VideoIcon, DocumentIcon, ChevronDownIcon, ChevronUpIcon } from '../icons/CollectionIcons';

const COLLECTION_MIME = 'application/vnd.ekstep.content-collection';

// ── Helpers ──
function isCollectionNode(node: HierarchyContentNode): boolean {
  return (node.mimeType ?? '').toLowerCase() === COLLECTION_MIME;
}

function isVideoMime(mimeType?: string): boolean {
  return !!mimeType && mimeType.toLowerCase().startsWith('video/');
}

const getCollectionIdentifiers = (nodes: HierarchyContentNode[]): string[] => {
  let ids: string[] = [];
  for (const node of nodes) {
    if (isCollectionNode(node) && node.children?.length) {
      ids.push(node.identifier);
      ids.push(...getCollectionIdentifiers(node.children));
    }
  }
  return ids;
};

const findNode = (nodes: HierarchyContentNode[], id: string): HierarchyContentNode | null => {
  for (const node of nodes) {
    if (node.identifier === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// ── Recursive sub-unit content ──
interface ExpandedUnitContentProps {
  nodes: HierarchyContentNode[];
  collectionId: string;
  viewState: 'anonymous' | 'unenrolled' | 'enrolled';
  expandedUnits: Set<string>;
  toggleUnit: (id: string) => void;
  onContentClick: (leafId: string) => void;
  t: (key: string) => string;
  depth?: number;
}

const ExpandedUnitContent: React.FC<ExpandedUnitContentProps> = ({
  nodes,
  collectionId,
  viewState,
  expandedUnits,
  toggleUnit,
  onContentClick,
  t,
  depth = 0,
}) => {
  if (!nodes?.length) return null;

  return (
    <div className={`cp-curriculum-nested ${depth > 0 ? 'cp-curriculum-nested-indented' : ''}`}>
      {nodes.map((node) => {
        if (isCollectionNode(node) && node.children?.length) {
          // Sub-unit: render as a collapsible sub-section
          const isExpanded = expandedUnits.has(node.identifier);
          return (
            <div key={node.identifier} className="cp-curriculum-subunit">
              <button
                className="cp-curriculum-subunit-header"
                onClick={() => toggleUnit(node.identifier)}
              >
                <span className="cp-curriculum-chevron">
                  {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </span>
                <span className="cp-curriculum-subunit-name">
                  {node.name ?? t('collection.untitled')}
                </span>
              </button>
              {isExpanded && (
                <ExpandedUnitContent
                  nodes={node.children}
                  collectionId={collectionId}
                  viewState={viewState}
                  expandedUnits={expandedUnits}
                  toggleUnit={toggleUnit}
                  onContentClick={onContentClick}
                  t={t}
                  depth={depth + 1}
                />
              )}
            </div>
          );
        }

        // Leaf content item
        return (
          <div
            key={node.identifier}
            className="cp-curriculum-item"
            onClick={() => onContentClick(node.identifier)}
            style={{ cursor: viewState === 'anonymous' ? 'default' : 'pointer' }}
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
}

const CollectionAccordion: React.FC<CollectionAccordionProps> = ({
  children,
  collectionId,
  isCourse,
  viewState,
  t,
}) => {
  const history = useHistory();
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (children && children.length > 0) {
      const firstUnit = children[0];
      initial.add(firstUnit.identifier);
      if (firstUnit.children) {
        getCollectionIdentifiers(firstUnit.children).forEach(id => initial.add(id));
      }
    }
    return initial;
  });

  const toggleUnit = (id: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        const node = findNode(children ?? [], id);
        if (node?.children) {
          getCollectionIdentifiers(node.children).forEach(childId => next.add(childId));
        }
      }
      return next;
    });
  };

  const handleContentClick = (leafId: string) => {
    if (viewState !== 'anonymous') {
      history.push(`/collection/${collectionId}/content/${leafId}`);
    }
  };

  return (
    <div className="cp-curriculum-section">
      <h2 className="cp-curriculum-title">
        {isCourse ? t('collection.courseCurriculum') : t('collection.collectionCurriculum')}
      </h2>

      {(children ?? []).map((unit, unitIndex) => {
        const isExpanded = expandedUnits.has(unit.identifier);

        return (
          <div key={unit.identifier} className="cp-curriculum-unit">
            {/* Unit header */}
            <button
              className="cp-curriculum-unit-header"
              onClick={() => toggleUnit(unit.identifier)}
            >
              <span className="cp-curriculum-chevron">
                {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </span>
              <div className="cp-curriculum-unit-info">
                <div className="cp-curriculum-unit-name">
                  {unit.name ?? `Unit ${unitIndex + 1}`}
                </div>
                {unit.description && (
                  <div className="cp-curriculum-subtitle">{unit.description}</div>
                )}
              </div>
            </button>

            {/* Expanded content — recursive multi-level */}
            {isExpanded && (
              <div className="cp-curriculum-unit-content">
                <ExpandedUnitContent
                  nodes={unit.children ?? []}
                  collectionId={collectionId}
                  viewState={viewState}
                  expandedUnits={expandedUnits}
                  toggleUnit={toggleUnit}
                  onContentClick={handleContentClick}
                  t={t}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CollectionAccordion;
