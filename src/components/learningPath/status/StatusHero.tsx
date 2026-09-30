import React from 'react';
import ProgressRing from '../../common/ProgressRing';
import type { LPTFunction } from '../lpTFunction';

interface StatusHeroProps {
  gainedCount: number;
  totalCount: number;
  t: LPTFunction;
}

/** Ring hero at the top of the Learning Path Status screen: skills gained out of total. */
export const StatusHero: React.FC<StatusHeroProps> = ({ gainedCount, totalCount, t }) => {
  const pct = totalCount > 0 ? Math.round((gainedCount / totalCount) * 100) : 0;
  return (
    <div className="lp-status-hero">
      <ProgressRing
        progress={pct}
        size={92}
        stroke={7}
        ariaLabel={t('learningPath.skillsGainedLabel', { gained: gainedCount, total: totalCount })}
      >
        <div className="lp-status-hero-ring-content">
          <span className="lp-status-hero-pct">{pct}%</span>
        </div>
      </ProgressRing>
      <span className="lp-status-hero-caption">
        {t('learningPath.skillsGained', { gained: gainedCount, total: totalCount })}
      </span>
    </div>
  );
};

export default StatusHero;
