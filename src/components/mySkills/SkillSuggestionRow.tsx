import React from 'react';
import type { SkillSuggestion } from '../../hooks/useSkillSuggestions';
import type { LPTFunction } from '../learningPath/lpTFunction';

interface SkillSuggestionRowProps {
  suggestions: SkillSuggestion[];
  onSelect: (suggestion: SkillSuggestion) => void;
  t: LPTFunction;
}

/** Horizontal-scroll row of "try this next" Learning Path suggestions, mirroring the home carousel pattern. */
export const SkillSuggestionRow: React.FC<SkillSuggestionRowProps> = ({ suggestions, onSelect, t }) => {
  if (suggestions.length === 0) return null;
  return (
    <div className="ms-suggestions-section">
      <h2 className="lp-section-title">{t('mySkills.suggestionsTitle')}</h2>
      <div className="ms-suggestions-scroll content-carousel-scroll">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.pathId}
            role="button"
            tabIndex={0}
            className="ms-suggestion-card"
            onClick={() => onSelect(suggestion)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(suggestion); } }}
          >
            <span className="ms-suggestion-card-name">{suggestion.pathName}</span>
            <span className="ms-suggestion-card-skills">
              {t('mySkills.newSkillsCount', { count: suggestion.newSkills.length })}
            </span>
            {suggestion.source === 'enrolled' && (
              <span className="ms-suggestion-card-progress">{suggestion.progressPct}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillSuggestionRow;
