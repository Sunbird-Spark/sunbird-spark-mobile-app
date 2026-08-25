import React from 'react';
import type { LPTFunction } from '../lpTFunction';

interface SkillCelebrationPanelProps {
  allSkills: string[];
  gainedSkills: ReadonlySet<string>;
  selectedSkill: string | null;
  onSelectSkill: (skill: string | null) => void;
  t: LPTFunction;
}

/**
 * Tappable skill chips shown below the Status hero. Tapping a skill toggles a
 * "focus" mode — the timeline below dims every Level that doesn't teach that
 * skill, so the learner can trace exactly where a skill came from (or where a
 * pending one will be taught).
 */
export const SkillCelebrationPanel: React.FC<SkillCelebrationPanelProps> = ({
  allSkills,
  gainedSkills,
  selectedSkill,
  onSelectSkill,
  t,
}) => {
  if (allSkills.length === 0) return null;
  return (
    <div className="lp-skill-celebration-panel">
      <h2 className="lp-section-title">{t('learningPath.skills')}</h2>
      <div className="lp-skill-celebration-chips">
        {allSkills.map((skill) => {
          const gained = gainedSkills.has(skill);
          const isSelected = selectedSkill === skill;
          return (
            <button type="button"
              key={skill}
              className={`lp-skill-chip lp-skill-chip--tappable${gained ? ' lp-skill-chip--gained' : ''}${isSelected ? ' lp-skill-chip--selected' : ''}`}
              onClick={() => onSelectSkill(isSelected ? null : skill)}
              aria-pressed={isSelected}
            >
              {skill}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SkillCelebrationPanel;
