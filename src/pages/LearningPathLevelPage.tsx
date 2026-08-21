import React, { useEffect, useMemo } from 'react';
import { IonContent, IonHeader, IonPage, IonToolbar, useIonRouter } from '@ionic/react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLearningPath } from '../hooks/useLearningPath';
import { computeCourseProgress } from '../services/learningPath/learningPathProgress';
import { BackIcon } from '../components/icons/CollectionIcons';
import PageLoader from '../components/common/PageLoader';
import LPStatusBadge from '../components/learningPath/LPStatusBadge';
import LPCourseRow from '../components/learningPath/LPCourseRow';
import './LearningPathLevelPage.css';

const LearningPathLevelPage: React.FC = () => {
  const { pathId, contextId: contextIdParam, levelId } = useParams<{
    pathId: string;
    contextId?: string;
    levelId: string;
  }>();
  const router = useIonRouter();
  const location = useLocation<{ parentRoute?: string }>();
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('pageTitle.learningPathLevel');
  }, [t]);

  const lp = useLearningPath(pathId, contextIdParam);

  const levelIndex = lp.model.levels.findIndex((l) => l.identifier === levelId);
  const level = levelIndex >= 0 ? lp.model.levels[levelIndex] : undefined;
  const status = levelIndex >= 0 ? lp.levelStatuses[levelIndex] : undefined;
  const progress = levelIndex >= 0 ? lp.levelProgress[levelIndex] : undefined;

  const courseProgresses = useMemo(() => {
    if (!level) return [];
    return level.courses.map((course) => computeCourseProgress(course, lp.summaryByCollectionId, lp.pathSummary));
  }, [level, lp.summaryByCollectionId, lp.pathSummary]);

  const handleBack = () => {
    if (location.state?.parentRoute) {
      router.push(location.state.parentRoute, 'back', 'pop');
    } else {
      router.goBack();
    }
  };

  const openCourse = (courseIndex: number) => {
    if (!level || !pathId) return;
    const course = level.courses[courseIndex];
    const firstLeaf = course.leafIds[0];
    if (!firstLeaf) return;
    const base = contextIdParam
      ? `/learning-path/${pathId}/batch/${contextIdParam}/course/${course.identifier}/content/${firstLeaf}`
      : `/learning-path/${pathId}/course/${course.identifier}/content/${firstLeaf}`;
    router.push(base, 'forward', 'push');
  };

  const notFound = !lp.isLoading && !lp.isError && !level;

  return (
    <IonPage className="lp-level-page">
      <IonHeader className="ion-no-border">
        <IonToolbar className="lp-page-header">
          <div className="lp-page-header-inner">
            <button onClick={handleBack} className="lp-page-icon-btn" aria-label={t('back')}>
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

          {level && status && (
            <>
              <div className="lp-level-header-section">
                <div className="lp-level-header-title-row">
                  <h1 className="lp-level-title">
                    {t('learningPath.levelN', { num: levelIndex + 1 })} · {level.name}
                  </h1>
                  <LPStatusBadge status={status} t={t} />
                </div>
                {level.description && <p className="lp-level-description">{level.description}</p>}
              </div>

              <div className="lp-level-stat-strip">
                <div className="lp-progress-stat">
                  <span className="lp-progress-stat-label">{t('learningPath.courses')}</span>
                  <span className="lp-progress-stat-value">
                    {progress?.completed ?? 0}/{progress?.total ?? level.courses.length}
                  </span>
                </div>
                <div className="lp-progress-stat">
                  <span className="lp-progress-stat-label">{t('learningPath.progress')}</span>
                  <span className="lp-progress-stat-value">{progress?.pct ?? 0}%</span>
                </div>
                <div className="lp-progress-stat">
                  <span className="lp-progress-stat-label">{t('learningPath.skills')}</span>
                  <span className="lp-progress-stat-value">{level.skills.length}</span>
                </div>
              </div>

              <div className="lp-level-courses">
                {level.courses.map((course, i) => (
                  <LPCourseRow
                    key={course.identifier}
                    course={course}
                    status={courseProgresses[i]?.status ?? 'notStarted'}
                    completed={courseProgresses[i]?.completed}
                    total={courseProgresses[i]?.total}
                    pct={courseProgresses[i]?.pct ?? 0}
                    onClick={status === 'locked' ? undefined : () => openCourse(i)}
                    t={t}
                  />
                ))}
              </div>

              {level.skills.length > 0 && (
                <div className="lp-level-skills-card">
                  <h2 className="lp-section-title">{t('learningPath.skillsTaught')}</h2>
                  <div className="lp-ledger-level-skills">
                    {level.skills.map((skill) => (
                      <span key={skill} className="lp-skill-chip">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default LearningPathLevelPage;
