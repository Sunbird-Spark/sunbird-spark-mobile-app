import React from 'react';
import { IonAccordion, IonAccordionGroup, IonItem, IonLabel } from '@ionic/react';
import type { LPTFunction } from './lpTFunction';
import type { LearningPathModel, LevelProgressInfo, LevelStatusKey } from '../../types/learningPathTypes';
import type { ProgressInfo } from '../../types/learningPathTypes';
import type { ViewerSummaryRecord } from '../../types/viewerServiceTypes';
import { computeCourseProgress } from '../../services/learningPath/learningPathProgress';
import LPStatusBadge from './LPStatusBadge';
import LPCourseRow from './LPCourseRow';

interface LPLedgerProps {
  model: LearningPathModel;
  levelProgress: LevelProgressInfo[];
  levelStatuses: LevelStatusKey[];
  priorProgress: (ProgressInfo & { status: 'completed' | 'active' | 'notStarted' }) | null;
  priorDone: boolean;
  outcomeProgress: (ProgressInfo & { status: 'completed' | 'active' | 'notStarted' }) | null;
  outcomeUnlocked: boolean;
  /** Needed to compute each course's real progress (see `computeCourseProgress`) rather than a level-average guess. */
  summaryByCollectionId: Map<string, ViewerSummaryRecord>;
  pathSummary?: ViewerSummaryRecord;
  /** Always tappable — the prior assessment gate has no lock state of its own. */
  onOpenPrior: () => void;
  /** Only called when `outcomeUnlocked` — the row is inert until then. */
  onOpenOutcome?: () => void;
  /** Opens the Level detail screen for an unlocked level. */
  onOpenLevel: (levelId: string) => void;
  /** Opens the player at a course's first leaf. */
  onOpenCourse: (courseId: string, contentId: string) => void;
  t: LPTFunction;
}

/**
 * The Overview's ledger: an accordion listing the (optional) prior assessment
 * gate, every content Level with its courses, and the (optional) outcome
 * assessment gate — mirroring the desktop ledger table's rows, collapsed into
 * a single accordion column for a phone screen.
 *
 * Every row is tappable (mirrors the portal's `LedgerTable`/`LedgerLevelRow`/
 * `LedgerCourseRow`): the prior row always opens its gate, the outcome row
 * only once every level is 100%, a level's header expands/collapses its
 * courses (locked levels are inert), and each course row opens the player at
 * its first leaf, plus an explicit "Open level detail →" link for the full
 * Level screen.
 */
export const LPLedger: React.FC<LPLedgerProps> = ({
  model,
  levelProgress,
  levelStatuses,
  priorProgress,
  priorDone,
  outcomeProgress,
  outcomeUnlocked,
  summaryByCollectionId,
  pathSummary,
  onOpenPrior,
  onOpenOutcome,
  onOpenLevel,
  onOpenCourse,
  t,
}) => {
  return (
    <div className="lp-ledger">
      <h2 className="lp-section-title">{t('learningPath.ledgerTitle')}</h2>

      {model.priorAssessment && (
        <div
          className="lp-ledger-gate-row lp-ledger-gate-row--clickable"
          role="button"
          tabIndex={0}
          onClick={onOpenPrior}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenPrior(); } }}
        >
          <div className="lp-ledger-gate-row-main">
            <span className="lp-ledger-gate-label">{t('learningPath.priorAssessment')}</span>
            <span className="lp-ledger-gate-name">{model.priorAssessment.name}</span>
          </div>
          <LPStatusBadge status={priorDone ? 'completed' : priorProgress?.status === 'active' ? 'active' : 'notStarted'} t={t} />
        </div>
      )}

      <IonAccordionGroup className="lp-ledger-accordion-group" value={model.levels[0]?.identifier}>
        {model.levels.map((level, i) => {
          const progress = levelProgress[i];
          const status = levelStatuses[i];
          const locked = status === 'locked';
          return (
            <IonAccordion key={level.identifier} value={level.identifier} disabled={locked}>
              <IonItem
                slot="header"
                className={`lp-ledger-level-header${locked ? ' lp-ledger-level-header--locked' : ''}`}
                lines="none"
              >
                <IonLabel>
                  <div className="lp-ledger-level-title-row">
                    <span className="lp-ledger-level-title">
                      {t('learningPath.levelN', { num: i + 1 })} · {level.name}
                    </span>
                    <LPStatusBadge status={status} t={t} />
                  </div>
                  {!locked && (
                    <div className="lp-ledger-level-progress-track">
                      <div className="lp-ledger-level-progress-fill" style={{ width: `${progress?.pct ?? 0}%` }} />
                    </div>
                  )}
                </IonLabel>
              </IonItem>
              <div className="lp-ledger-level-body" slot="content">
                <div className="lp-ledger-level-courses">
                  {level.courses.map((course) => {
                    const courseProgress = computeCourseProgress(course, summaryByCollectionId, pathSummary);
                    return (
                      <LPCourseRow
                        key={course.identifier}
                        course={course}
                        status={courseProgress.status}
                        completed={courseProgress.completed}
                        total={courseProgress.total}
                        pct={courseProgress.pct}
                        onClick={() => onOpenCourse(course.identifier, course.leafIds[0] ?? '')}
                        t={t}
                      />
                    );
                  })}
                </div>
                {level.skills.length > 0 && (
                  <div className="lp-ledger-level-skills">
                    {level.skills.map((skill) => (
                      <span key={skill} className="lp-skill-chip">{skill}</span>
                    ))}
                  </div>
                )}
                <button type="button" className="lp-ledger-open-level-btn" onClick={() => onOpenLevel(level.identifier)}>
                  {t('learningPath.openLevelDetail')} →
                </button>
              </div>
            </IonAccordion>
          );
        })}
      </IonAccordionGroup>

      {model.outcomeAssessment && (
        <div
          className={`lp-ledger-gate-row${outcomeUnlocked ? ' lp-ledger-gate-row--clickable' : ' lp-ledger-gate-row--disabled'}`}
          role={outcomeUnlocked ? 'button' : undefined}
          tabIndex={outcomeUnlocked ? 0 : undefined}
          onClick={outcomeUnlocked ? onOpenOutcome : undefined}
          onKeyDown={outcomeUnlocked ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenOutcome?.(); } } : undefined}
        >
          <div className="lp-ledger-gate-row-main">
            <span className="lp-ledger-gate-label">{t('learningPath.outcomeAssessment')}</span>
            <span className="lp-ledger-gate-name">{model.outcomeAssessment.name}</span>
          </div>
          {!outcomeUnlocked ? (
            <LPStatusBadge status="locked" t={t} />
          ) : (
            <LPStatusBadge status={outcomeProgress?.status === 'completed' ? 'completed' : outcomeProgress?.status === 'active' ? 'active' : 'notStarted'} t={t} />
          )}
        </div>
      )}
    </div>
  );
};

export default LPLedger;
