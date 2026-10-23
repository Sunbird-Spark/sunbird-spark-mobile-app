import React from 'react';
import type { LPUnitNode } from '../../types/learningPathTypes';

interface LPCourseUnitTreeProps {
  units: LPUnitNode[];
  contentStatus?: Record<string, number>;
  activeContentId?: string;
  onSelectLeaf: (leafId: string) => void;
  depth?: number;
}

/** Recursively renders a course's Unit/Resource tree — used in the LP player's "Path contents" bottom sheet. */
export const LPCourseUnitTree: React.FC<LPCourseUnitTreeProps> = ({
  units,
  contentStatus,
  activeContentId,
  onSelectLeaf,
  depth = 0,
}) => {
  return (
    <div className="lp-unit-tree" style={{ paddingLeft: depth > 0 ? '0.75rem' : 0 }}>
      {units.map((node) =>
        node.isUnit ? (
          <div key={node.identifier} className="lp-unit-tree-group">
            <span className="lp-unit-tree-unit-name">{node.name}</span>
            <LPCourseUnitTree
              units={node.children}
              contentStatus={contentStatus}
              activeContentId={activeContentId}
              onSelectLeaf={onSelectLeaf}
              depth={depth + 1}
            />
          </div>
        ) : (
          <div
            key={node.identifier}
            role="button"
            tabIndex={0}
            className={`lp-unit-tree-leaf${node.identifier === activeContentId ? ' lp-unit-tree-leaf--active' : ''}`}
            onClick={() => onSelectLeaf(node.identifier)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectLeaf(node.identifier); } }}
          >
            <span className="lp-unit-tree-leaf-status" data-complete={contentStatus?.[node.identifier] === 2} />
            <span className="lp-unit-tree-leaf-name">{node.name}</span>
          </div>
        )
      )}
    </div>
  );
};

export default LPCourseUnitTree;
