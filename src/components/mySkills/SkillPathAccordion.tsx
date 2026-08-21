import React from 'react';
import { IonAccordion, IonAccordionGroup, IonItem, IonLabel } from '@ionic/react';
import type { PathSkillSummary } from '../../services/learningPath/skillAggregation';
import type { LPTFunction } from '../learningPath/lpTFunction';

interface SkillPathAccordionProps {
  summaries: PathSkillSummary[];
  onOpenPath: (summary: PathSkillSummary) => void;
  t: LPTFunction;
}

const STATUS_LABEL_KEY: Record<PathSkillSummary['status'], string> = {
  completed: 'completed',
  ongoing: 'inProgress',
  'not-started': 'notStarted',
};

/** By-path breakdown: one accordion row per enrolled Learning Path, listing gained vs. pending skills. */
export const SkillPathAccordion: React.FC<SkillPathAccordionProps> = ({ summaries, onOpenPath, t }) => {
  if (summaries.length === 0) return null;
  return (
    <IonAccordionGroup className="ms-path-accordion-group">
      {summaries.map((summary) => (
        <IonAccordion key={summary.pathId} value={summary.pathId}>
          <IonItem slot="header" lines="none" className="ms-path-accordion-header">
            <IonLabel>
              <div className="ms-path-accordion-title-row">
                <span className="ms-path-accordion-name">{summary.pathName}</span>
                <span className="ms-path-accordion-status">{t(STATUS_LABEL_KEY[summary.status])}</span>
              </div>
              <span className="ms-path-accordion-count">
                {t('mySkills.gainedOfTotal', { gained: summary.gainedCount, total: summary.allSkills.length })}
              </span>
            </IonLabel>
          </IonItem>
          <div slot="content" className="ms-path-accordion-body">
            <div className="ms-path-accordion-skills">
              {summary.allSkills.map((skill) => (
                <span
                  key={skill}
                  className={`lp-skill-chip${summary.gainedSkills.has(skill) ? ' lp-skill-chip--gained' : ''}`}
                >
                  {skill}
                </span>
              ))}
            </div>
            <button className="ms-path-accordion-view-btn" onClick={() => onOpenPath(summary)}>
              {t('mySkills.viewPath')}
            </button>
          </div>
        </IonAccordion>
      ))}
    </IonAccordionGroup>
  );
};

export default SkillPathAccordion;
