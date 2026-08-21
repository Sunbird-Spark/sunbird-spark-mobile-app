import React from 'react';
import type { AssessmentScore } from '../../types/learningPathTypes';
import type { LPTFunction } from './lpTFunction';

interface LPScoreRowsProps {
  priorScore?: AssessmentScore | null;
  outcomeScore?: AssessmentScore | null;
  t: LPTFunction;
}

/** "Your scores" rows on the Path Completion screen. */
export const LPScoreRows: React.FC<LPScoreRowsProps> = ({ priorScore, outcomeScore, t }) => {
  if (!priorScore && !outcomeScore) return null;
  return (
    <div className="lp-score-rows">
      <h2 className="lp-section-title">{t('learningPath.yourScores')}</h2>
      {priorScore && (
        <div className="lp-score-row">
          <span className="lp-score-row-label">{t('learningPath.priorAssessment')}</span>
          <span className="lp-score-row-value">{priorScore.score}/{priorScore.maxScore}</span>
        </div>
      )}
      {outcomeScore && (
        <div className="lp-score-row">
          <span className="lp-score-row-label">{t('learningPath.outcomeAssessment')}</span>
          <span className="lp-score-row-value">{outcomeScore.score}/{outcomeScore.maxScore}</span>
        </div>
      )}
    </div>
  );
};

export default LPScoreRows;
