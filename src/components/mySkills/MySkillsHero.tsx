import React from 'react';
import ProgressRing from '../common/ProgressRing';
import type { SkillAggregate } from '../../services/learningPath/skillAggregation';
import type { LPTFunction } from '../learningPath/lpTFunction';

interface MySkillsHeroProps {
  aggregate: SkillAggregate;
  analyzedCount: number;
  totalCount: number;
  t: LPTFunction;
}

/** Hero card at the top of My Skills: ring + stat rows + "Analyzed X of Y" streaming indicator. */
export const MySkillsHero: React.FC<MySkillsHeroProps> = ({ aggregate, analyzedCount, totalCount, t }) => {
  const pct = aggregate.totalSkills > 0 ? Math.round((aggregate.gainedSkills / aggregate.totalSkills) * 100) : 0;
  return (
    <div className="ms-hero">
      <ProgressRing progress={pct} size={92} stroke={7} ariaLabel={t('mySkills.heroRingLabel', { pct })}>
        <span className="ms-hero-pct">{pct}%</span>
      </ProgressRing>
      <div className="ms-hero-stats">
        <div className="ms-hero-stat">
          <span className="ms-hero-stat-value">{aggregate.gainedSkills}</span>
          <span className="ms-hero-stat-label">{t('mySkills.gained')}</span>
        </div>
        <div className="ms-hero-stat">
          <span className="ms-hero-stat-value">{aggregate.pendingSkills}</span>
          <span className="ms-hero-stat-label">{t('mySkills.pending')}</span>
        </div>
        <div className="ms-hero-stat">
          <span className="ms-hero-stat-value">{aggregate.pathsCompleted}</span>
          <span className="ms-hero-stat-label">{t('mySkills.pathsCompleted')}</span>
        </div>
      </div>
      {totalCount > 0 && (
        <span className="ms-hero-analyzed">{t('mySkills.analyzed', { analyzed: analyzedCount, total: totalCount })}</span>
      )}
    </div>
  );
};

export default MySkillsHero;
