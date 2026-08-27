import React from 'react';
import type { LPCourseNode, LevelStatusKey } from '../../types/learningPathTypes';
import LPStatusBadge from './LPStatusBadge';
import type { LPTFunction } from './lpTFunction';

interface LPCourseRowProps {
  course: LPCourseNode;
  status: LevelStatusKey;
  /** Leaves completed, out of `total` — from `computeCourseProgress`. Falls back to deriving from `pct` when omitted (existing callers that only pass `pct`). */
  completed?: number;
  total?: number;
  pct: number;
  /**
   * Defaults to `false`. When `true` (the course was waived by a prior
   * assessment — see `computeCourseProgress`'s `optional` flag), an "Optional"
   * badge is shown beside the question-set-only badge. The row stays fully
   * visible and openable either way — only progress denominators exclude it.
   */
  isOptional?: boolean;
  onClick?: () => void;
  t: LPTFunction;
}

/** Status → CTA label key, mirroring the portal's LedgerCourseRow. "Revisit" (not "Review") for a
 * finished course, since "Review" is taken by the authoring review/publish workflow. */
const CTA_KEY: Partial<Record<LevelStatusKey, string>> = {
  completed: 'learningPath.revisit',
  active: 'learningPath.resume',
  notStarted: 'learningPath.start',
};

/** A single course row inside a Level detail screen or the Overview ledger's expanded level body. */
export const LPCourseRow: React.FC<LPCourseRowProps> = ({
  course,
  status,
  completed,
  total,
  pct,
  isOptional = false,
  onClick,
  t,
}) => {
  const resolvedTotal = total ?? (course.leafIds.length || course.leafNodesCount || 0);
  const resolvedCompleted = completed ?? Math.round((pct / 100) * resolvedTotal);
  const disabled = status === 'locked';
  const ctaKey = CTA_KEY[status];
  return (
    <div
      role={onClick && !disabled ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      className={`lp-course-row${disabled ? ' lp-course-row--locked' : ''}`}
      onClick={disabled ? undefined : onClick}
      onKeyDown={
        disabled || !onClick
          ? undefined
          : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }
      }
    >
      <div className="lp-course-row-main">
        <div className="lp-course-row-name-row">
          <span className="lp-course-row-name">{course.name}</span>
          {course.isAssessmentCourse && (
            <span className="lp-course-row-badge">{t('learningPath.questionSetOnly')}</span>
          )}
          {isOptional && <span className="lp-course-row-badge">{t('learningPath.optional')}</span>}
        </div>
        <span className="lp-course-row-meta">
          {resolvedTotal > 0 ? `${resolvedCompleted}/${resolvedTotal} · ${pct}%` : `${pct}%`}
        </span>
      </div>
      <div className="lp-course-row-progress">
        {!disabled && ctaKey && <span className="lp-course-row-cta">{t(ctaKey)}</span>}
        <LPStatusBadge status={status} t={t} />
      </div>
    </div>
  );
};

export default LPCourseRow;
