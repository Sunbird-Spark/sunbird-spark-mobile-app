import React from 'react';
import type { LearningPathModel, LevelStatusKey } from '../../../types/learningPathTypes';
import type { SkillSourceRef } from '../../../services/learningPath/skillAggregation';
import LPStatusBadge from '../LPStatusBadge';
import type { LPTFunction } from '../lpTFunction';

interface StatusTimelineProps {
  model: LearningPathModel;
  levelStatuses: LevelStatusKey[];
  skillSources: SkillSourceRef[];
  selectedSkill: string | null;
  t: LPTFunction;
}

/**
 * Vertical spine of every content Level (skills timeline), each dimmed when a
 * skill is selected in `SkillCelebrationPanel` and this Level doesn't teach it.
 */
export const StatusTimeline: React.FC<StatusTimelineProps> = ({ model, levelStatuses, skillSources, selectedSkill, t }) => {
  return (
    <div className="lp-status-timeline">
      <h2 className="lp-section-title">{t('learningPath.ledgerTitle')}</h2>
      {model.levels.map((level, i) => {
        const status = levelStatuses[i];
        const teachesSelected = !selectedSkill || level.skills.includes(selectedSkill);
        const source = skillSources.find((s) => s.levelId === level.identifier && s.skill === selectedSkill);
        return (
          <div
            key={level.identifier}
            className={`lp-status-timeline-node${!teachesSelected ? ' lp-status-timeline-node--dimmed' : ''}`}
          >
            <div className="lp-status-timeline-marker" data-status={status} />
            <div className="lp-status-timeline-body">
              <div className="lp-status-timeline-header">
                <span className="lp-status-timeline-title">
                  {t('learningPath.levelN', { num: i + 1 })} · {level.name}
                </span>
                <LPStatusBadge status={status} t={t} />
              </div>
              <div className="lp-ledger-level-skills">
                {level.skills.map((skill) => (
                  <span
                    key={skill}
                    className={`lp-skill-chip${skill === selectedSkill ? ' lp-skill-chip--selected' : ''}`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
              {selectedSkill && source?.gained && (
                <span className="lp-status-timeline-gained-note">{t('learningPath.skillGainedHere')}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatusTimeline;
