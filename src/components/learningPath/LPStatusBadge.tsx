import React from 'react';
import type { LPTFunction } from './lpTFunction';
import type { LevelStatusKey } from '../../types/learningPathTypes';

interface LPStatusBadgeProps {
  status: LevelStatusKey;
  t: LPTFunction;
}

/**
 * Colours live in CSS (`.lp-status-badge--<status>` in `LearningPathPage.css`),
 * not in an inline style map here.
 *
 * The map this replaced paired each status's base colour with its Ionic
 * `-tint` as the background — but in this theme `-tint` is only ~10% lighter
 * than the base (`--ion-color-success: #82a668` vs `-tint: #8faf77`), so every
 * variant rendered same-hue-on-same-hue at ~1.1:1 contrast and was illegible.
 * The pale hex fallbacks in that map (`#e3f5e6`, `#fff4d6`) show the intent was
 * a pale wash, but the theme defines the real vars so the fallbacks never
 * applied. See bug: "Completed" badge unreadable on the LP overview.
 */
const STATUS_MODIFIER: Record<LevelStatusKey, string> = {
  completed: 'completed',
  active: 'active',
  notStarted: 'not-started',
  locked: 'locked',
  waived: 'waived',
  credited: 'credited',
  creditedPending: 'credited-pending',
};

const STATUS_LABEL_KEY: Record<LevelStatusKey, string> = {
  completed: 'completed',
  active: 'inProgress',
  notStarted: 'notStarted',
  locked: 'learningPath.locked',
  waived: 'learningPath.waived',
  credited: 'learningPath.credited',
  creditedPending: 'learningPath.creditedPending',
};

/** Small pill badge for a Level/Course/Assessment status — shared across the Overview ledger and Level detail screens. */
export const LPStatusBadge: React.FC<LPStatusBadgeProps> = ({ status, t }) => (
  <span className={`lp-status-badge lp-status-badge--${STATUS_MODIFIER[status]}`}>
    {t(STATUS_LABEL_KEY[status])}
  </span>
);

export default LPStatusBadge;
