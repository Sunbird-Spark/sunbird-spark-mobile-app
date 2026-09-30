import React from 'react';
import type { LPTFunction } from './lpTFunction';
import type { LearningPathModel, LearningPathPolicy } from '../../types/learningPathTypes';

const POLICY_LABEL_KEY: Record<LearningPathPolicy, string> = {
  Fixed: 'learningPath.policy.fixed',
  Diagnostic: 'learningPath.policy.diagnostic',
  PriorLearning: 'learningPath.policy.priorLearning',
};

interface LPProgressCardProps {
  model: LearningPathModel;
  progressPct: number;
  doneLevels: number;
  batchEndDate?: string;
  t: LPTFunction;
}

/** Overview hero: path progress bar plus a 2x2 stat grid (Policy / Levels / Courses / Skills). */
export const LPProgressCard: React.FC<LPProgressCardProps> = ({ model, progressPct, doneLevels, batchEndDate, t }) => {
  return (
    <div className="lp-progress-card">
      <div className="lp-progress-card-header">
        <span className="lp-progress-card-pct">{progressPct}%</span>
        <span className="lp-progress-card-levels">
          {t('learningPath.levelsDone', { done: doneLevels, total: model.levels.length })}
        </span>
      </div>
      <div className="lp-progress-bar-track">
        <div className="lp-progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
      </div>
      <div className="lp-progress-stat-grid">
        <div className="lp-progress-stat">
          <span className="lp-progress-stat-label">{t('learningPath.policy.label')}</span>
          <span className="lp-progress-stat-value">{t(POLICY_LABEL_KEY[model.policy])}</span>
        </div>
        <div className="lp-progress-stat">
          <span className="lp-progress-stat-label">{t('learningPath.levels')}</span>
          <span className="lp-progress-stat-value">{model.levels.length}</span>
        </div>
        <div className="lp-progress-stat">
          <span className="lp-progress-stat-label">{t('learningPath.courses')}</span>
          <span className="lp-progress-stat-value">{model.courseTotal}</span>
        </div>
        <div className="lp-progress-stat">
          <span className="lp-progress-stat-label">{t('learningPath.skills')}</span>
          <span className="lp-progress-stat-value">{model.allSkills.length}</span>
        </div>
      </div>
      {batchEndDate && (
        <p className="lp-progress-batch-end">
          {t('learningPath.batchEndsOn', { date: new Date(batchEndDate).toLocaleDateString() })}
        </p>
      )}
    </div>
  );
};

export default LPProgressCard;
