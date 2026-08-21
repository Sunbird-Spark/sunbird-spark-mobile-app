import React from 'react';
import type { LPTFunction } from './lpTFunction';
import type { LevelStatusKey } from '../../types/learningPathTypes';

interface LPStatusBadgeProps {
  status: LevelStatusKey;
  t: LPTFunction;
}

const STATUS_STYLE: Record<LevelStatusKey, { color: string; bg: string }> = {
  completed: { color: 'var(--ion-color-success)', bg: 'var(--ion-color-success-tint, #e3f5e6)' },
  active: { color: 'var(--ion-color-warning-shade, #b98f00)', bg: 'var(--ion-color-warning-tint, #fff4d6)' },
  notStarted: { color: 'var(--color-757575, #757575)', bg: 'var(--color-e0e0e0, #e0e0e0)' },
  locked: { color: 'var(--color-757575, #757575)', bg: 'var(--color-e0e0e0, #e0e0e0)' },
  waived: { color: 'var(--ion-color-secondary)', bg: 'var(--ion-color-secondary-tint)' },
  credited: { color: 'var(--ion-color-secondary)', bg: 'var(--ion-color-secondary-tint)' },
  creditedPending: { color: 'var(--ion-color-primary-tint, #cc8545)', bg: 'var(--color-f4f4f4, #f4f4f4)' },
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
export const LPStatusBadge: React.FC<LPStatusBadgeProps> = ({ status, t }) => {
  const style = STATUS_STYLE[status];
  return (
    <span
      className="lp-status-badge"
      style={{ color: style.color, backgroundColor: style.bg }}
    >
      {t(STATUS_LABEL_KEY[status])}
    </span>
  );
};

export default LPStatusBadge;
