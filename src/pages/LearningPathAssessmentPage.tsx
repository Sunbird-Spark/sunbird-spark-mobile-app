import React, { useEffect, useMemo } from 'react';
import { IonContent, IonHeader, IonPage, IonToolbar, useIonRouter } from '@ionic/react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLearningPath } from '../hooks/useLearningPath';
import { useAssessmentReadMap, useStoredAssessmentScores } from '../hooks/useAssessmentScores';
import { mergeAssessmentSources, resolveAssessmentInfo } from '../services/learningPath/learningPathAssessment';
import { BackIcon } from '../components/icons/CollectionIcons';
import PageLoader from '../components/common/PageLoader';
import './LearningPathAssessmentPage.css';

interface LearningPathAssessmentPageProps {
  variant: 'prior' | 'outcome';
}

const LearningPathAssessmentPage: React.FC<LearningPathAssessmentPageProps> = ({ variant }) => {
  const { pathId, contextId: contextIdParam } = useParams<{ pathId: string; contextId?: string }>();
  const router = useIonRouter();
  const location = useLocation<{ parentRoute?: string }>();
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t(variant === 'prior' ? 'learningPath.priorAssessment' : 'learningPath.outcomeAssessment');
  }, [t, variant]);

  const lp = useLearningPath(pathId, contextIdParam);
  const course = variant === 'prior' ? lp.model.priorAssessment : lp.model.outcomeAssessment;

  const localScores = useStoredAssessmentScores(course?.identifier);
  const serverScores = useAssessmentReadMap(course?.identifier, lp.enrollment.effectiveContextId, course?.leafIds ?? []);
  const assessmentInfo = useMemo(() => {
    if (!course) return null;
    const merged = mergeAssessmentSources(lp.pathSummary, localScores, serverScores);
    return resolveAssessmentInfo(course.identifier, course.leafIds, merged);
  }, [course, lp.pathSummary, localScores, serverScores]);

  const isUnlocked = variant === 'prior' ? true : lp.outcomeState.unlocked;
  const canSkip = variant === 'prior' && lp.policy === 'Fixed';

  const handleBack = () => {
    if (location.state?.parentRoute) {
      router.push(location.state.parentRoute, 'back', 'pop');
    } else {
      router.goBack();
    }
  };

  const handleStart = () => {
    if (!course || !pathId) return;
    const firstLeaf = course.leafIds[0];
    if (!firstLeaf) return;
    const base = contextIdParam
      ? `/learning-path/${pathId}/batch/${contextIdParam}/course/${course.identifier}/content/${firstLeaf}`
      : `/learning-path/${pathId}/course/${course.identifier}/content/${firstLeaf}`;
    router.push(base, 'forward', 'push');
  };

  const handleSkipToLevel1 = () => {
    if (!pathId || lp.model.levels.length === 0) return;
    const firstLevel = lp.model.levels[0];
    const base = contextIdParam
      ? `/learning-path/${pathId}/batch/${contextIdParam}/level/${firstLevel.identifier}`
      : `/learning-path/${pathId}/level/${firstLevel.identifier}`;
    router.push(base, 'forward', 'push');
  };

  const notFound = !lp.isLoading && !lp.isError && !course;

  return (
    <IonPage className="lp-assessment-page">
      <IonHeader className="ion-no-border">
        <IonToolbar className="lp-page-header">
          <div className="lp-page-header-inner">
            <button type="button" onClick={handleBack} className="lp-page-icon-btn" aria-label={t('back')}>
              <BackIcon />
            </button>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <main id="main-content">
          {lp.isLoading && <PageLoader message={t('loading')} />}
          {!lp.isLoading && lp.isError && <PageLoader error={t('learningPath.errorLoading')} />}
          {notFound && <PageLoader error={t('learningPath.notFound')} />}

          {course && (
            <>
              <div className="lp-assessment-header">
                <span className="lp-assessment-eyebrow">
                  {t(variant === 'prior' ? 'learningPath.priorAssessment' : 'learningPath.outcomeAssessment')}
                </span>
                <h1 className="lp-assessment-title">{course.name}</h1>
              </div>

              <div className="lp-assessment-stat-strip">
                <div className="lp-progress-stat">
                  <span className="lp-progress-stat-label">{t('learningPath.questions')}</span>
                  <span className="lp-progress-stat-value">{course.questionCount ?? course.leafIds.length}</span>
                </div>
                <div className="lp-progress-stat">
                  <span className="lp-progress-stat-label">{t('bestScore')}</span>
                  <span className="lp-progress-stat-value">
                    {assessmentInfo ? `${assessmentInfo.score}/${assessmentInfo.maxScore}` : '—'}
                  </span>
                </div>
                <div className="lp-progress-stat">
                  <span className="lp-progress-stat-label">{t('learningPath.attempts')}</span>
                  <span className="lp-progress-stat-value">{assessmentInfo?.attemptCount ?? 0}</span>
                </div>
              </div>

              {course.skills.length > 0 && (
                <div className="lp-assessment-skills-card">
                  <h2 className="lp-section-title">{t('learningPath.skillsAssessed')}</h2>
                  <div className="lp-ledger-level-skills">
                    {course.skills.map((skill) => (
                      <span key={skill} className="lp-skill-chip">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              <p className="lp-assessment-policy-note">
                {variant === 'prior'
                  ? t('learningPath.priorPolicyNote')
                  : t('learningPath.outcomePolicyNote')}
              </p>

              {!isUnlocked ? (
                <div className="lp-assessment-locked-note">{t('learningPath.outcomeLocked')}</div>
              ) : (
                <div className="lp-bottom-cta-wrap">
                  {canSkip && (
                    <button type="button" className="lp-assessment-skip-link" onClick={handleSkipToLevel1}>
                      {t('learningPath.skipToLevel1')}
                    </button>
                  )}
                  <button type="button" className="lp-bottom-cta" onClick={handleStart}>
                    <span className="lp-bottom-cta-text">{t('learningPath.startAssessment')}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default LearningPathAssessmentPage;
