import React, { useEffect, useMemo, useState } from 'react';
import { IonAlert, IonFooter, IonModal, IonToolbar, useIonRouter } from '@ionic/react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLearningPath } from '../hooks/useLearningPath';
import CollectionContentPlayer from '../components/collection/CollectionContentPlayer';
import LPCourseUnitTree from '../components/learningPath/LPCourseUnitTree';
import LPCertificateCard from '../components/learningPath/LPCertificateCard';
import type { LPCourseNode, LPLevelNode } from '../types/learningPathTypes';
import './LearningPathPlayerPage.css';

interface OwningContext {
  course: LPCourseNode;
  level?: LPLevelNode;
  levelIndex?: number;
  kind: 'prior' | 'level' | 'outcome';
}

function findOwningCourse(
  model: ReturnType<typeof useLearningPath>['model'],
  courseId: string
): OwningContext | undefined {
  if (model.priorAssessment?.identifier === courseId) {
    return { course: model.priorAssessment, kind: 'prior' };
  }
  if (model.outcomeAssessment?.identifier === courseId) {
    return { course: model.outcomeAssessment, kind: 'outcome' };
  }
  for (let i = 0; i < model.levels.length; i++) {
    const course = model.levels[i].courses.find((c) => c.identifier === courseId);
    if (course) return { course, level: model.levels[i], levelIndex: i, kind: 'level' };
  }
  return undefined;
}

const LearningPathPlayerPage: React.FC = () => {
  const { pathId, contextId: contextIdParam, courseId, contentId } = useParams<{
    pathId: string;
    contextId?: string;
    courseId: string;
    contentId: string;
  }>();
  const router = useIonRouter();
  const location = useLocation<{ parentRoute?: string }>();
  const { t } = useTranslation();

  const lp = useLearningPath(pathId, contextIdParam);
  const owning = useMemo(() => findOwningCourse(lp.model, courseId), [lp.model, courseId]);

  useEffect(() => {
    document.title = owning?.course.name ?? t('pageTitle.learningPath');
  }, [owning, t]);

  const [isRailOpen, setIsRailOpen] = useState(false);

  const leafIds = owning?.course.leafIds ?? [];
  const currentIndex = leafIds.indexOf(contentId);
  const prevLeaf = currentIndex > 0 ? leafIds[currentIndex - 1] : undefined;
  const nextLeaf = currentIndex >= 0 && currentIndex < leafIds.length - 1 ? leafIds[currentIndex + 1] : undefined;

  const buildContentUrl = (leafId: string) =>
    contextIdParam
      ? `/learning-path/${pathId}/batch/${contextIdParam}/course/${courseId}/content/${leafId}`
      : `/learning-path/${pathId}/course/${courseId}/content/${leafId}`;

  const goToLeaf = (leafId: string) => router.push(buildContentUrl(leafId), 'forward', 'push');

  const handleClose = () => {
    if (location.state?.parentRoute) {
      router.push(location.state.parentRoute, 'back', 'pop');
      return;
    }
    const base = contextIdParam
      ? `/learning-path/${pathId}/batch/${contextIdParam}`
      : `/learning-path/${pathId}`;
    router.push(base, 'back', 'pop');
  };

  const crumb = owning
    ? owning.kind === 'level'
      ? t('learningPath.playerCrumb', {
          num: (owning.levelIndex ?? 0) + 1,
          levelName: owning.level?.name,
          i: Math.max(currentIndex, 0) + 1,
          n: leafIds.length,
        })
      : owning.course.name
    : '';

  const currentContentStatus = lp.pathSummary?.contentStatus?.[contentId];

  if (!lp.isLoading && !lp.enrollment.isEnrolled) {
    return (
      <IonAlert
        isOpen
        header={t('learningPath.joinRequiredTitle')}
        message={t('learningPath.joinRequiredMessage')}
        buttons={[{ text: t('ok'), handler: handleClose }]}
        onDidDismiss={handleClose}
      />
    );
  }

  if (lp.isLoading || !owning) {
    return null;
  }

  return (
    <div className="lp-player-page">
      <CollectionContentPlayer
        contentId={contentId}
        onClose={handleClose}
        collectionId={courseId}
        batchId={lp.enrollment.effectiveContextId}
        hierarchyRoot={lp.hierarchyRoot}
        isEnrolled={lp.enrollment.isEnrolled}
        isBatchEnded={lp.enrollment.isBatchEnded}
        currentContentStatus={currentContentStatus}
        lpContext={
          lp.enrollment.effectiveContextId
            ? { pathId: pathId!, contextId: lp.enrollment.effectiveContextId }
            : undefined
        }
      />

      <IonFooter className="lp-player-footer">
        <IonToolbar className="lp-player-footer-toolbar">
          <div className="lp-player-footer-inner">
            <button
              className="lp-player-nav-btn"
              disabled={!prevLeaf}
              onClick={() => prevLeaf && goToLeaf(prevLeaf)}
            >
              {t('learningPath.previous')}
            </button>
            <button className="lp-player-crumb" onClick={() => setIsRailOpen(true)}>
              {crumb}
            </button>
            <button
              className="lp-player-nav-btn"
              disabled={!nextLeaf}
              onClick={() => nextLeaf && goToLeaf(nextLeaf)}
            >
              {t('learningPath.next')}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>

      <IonModal
        isOpen={isRailOpen}
        onDidDismiss={() => setIsRailOpen(false)}
        breakpoints={[0, 0.5, 0.9]}
        initialBreakpoint={0.5}
        className="lp-player-rail-modal"
      >
        <div className="lp-player-rail-inner">
          <h2 className="lp-section-title">{t('learningPath.pathContents')}</h2>
          <div className="lp-player-rail-progress">
            <span>{lp.progress.pct}%</span>
            <span>{t('learningPath.levelsDone', { done: lp.progress.doneLevels, total: lp.model.levels.length })}</span>
          </div>
          {lp.model.levels.map((level, i) => (
            <div key={level.identifier} className="lp-player-rail-level">
              <span className="lp-player-rail-level-title">
                {t('learningPath.levelN', { num: i + 1 })} · {level.name}
              </span>
              {level.courses.map((course) => (
                <div key={course.identifier} className="lp-player-rail-course">
                  <span className="lp-player-rail-course-name">{course.name}</span>
                  {course.units && (
                    <LPCourseUnitTree
                      units={course.units}
                      contentStatus={lp.pathSummary?.contentStatus}
                      activeContentId={course.identifier === courseId ? contentId : undefined}
                      onSelectLeaf={(leafId) => {
                        setIsRailOpen(false);
                        if (course.identifier === courseId) {
                          goToLeaf(leafId);
                        } else {
                          const base = contextIdParam
                            ? `/learning-path/${pathId}/batch/${contextIdParam}/course/${course.identifier}/content/${leafId}`
                            : `/learning-path/${pathId}/course/${course.identifier}/content/${leafId}`;
                          router.push(base, 'forward', 'push');
                        }
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
          <LPCertificateCard unlocked={lp.certificateUnlocked} certPreviewUrl={lp.enrollment.certPreviewUrl} t={t} />
        </div>
      </IonModal>
    </div>
  );
};

export default LearningPathPlayerPage;
