import React, { useEffect, useMemo, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonToolbar, useIonRouter } from '@ionic/react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLearningPath } from '../hooks/useLearningPath';
import { buildPathSkillSummary } from '../services/learningPath/skillAggregation';
import { BackIcon } from '../components/icons/CollectionIcons';
import PageLoader from '../components/common/PageLoader';
import StatusHero from '../components/learningPath/status/StatusHero';
import SkillCelebrationPanel from '../components/learningPath/status/SkillCelebrationPanel';
import StatusTimeline from '../components/learningPath/status/StatusTimeline';
import './LearningPathStatusPage.css';

const LearningPathStatusPage: React.FC = () => {
  const { pathId, contextId: contextIdParam } = useParams<{ pathId: string; contextId?: string }>();
  const router = useIonRouter();
  const location = useLocation<{ parentRoute?: string }>();
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('pageTitle.learningPathStatus');
  }, [t]);

  const lp = useLearningPath(pathId, contextIdParam);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const skillSummary = useMemo(
    () => buildPathSkillSummary(lp.model, lp.pathSummary, lp.summaryByCollectionId, lp.enrollment.effectiveContextId),
    [lp.model, lp.pathSummary, lp.summaryByCollectionId, lp.enrollment.effectiveContextId]
  );

  const handleBack = () => {
    if (location.state?.parentRoute) {
      router.push(location.state.parentRoute, 'back', 'pop');
    } else {
      router.goBack();
    }
  };

  const isNotFound = !lp.isLoading && !lp.isError && lp.model.levels.length === 0;

  return (
    <IonPage className="lp-status-page">
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
          {isNotFound && <PageLoader error={t('learningPath.notFound')} />}

          {!lp.isLoading && !lp.isError && !isNotFound && (
            <>
              <div className="lp-status-title-section">
                <h1 className="lp-title">{lp.model.name}</h1>
              </div>

              <StatusHero gainedCount={skillSummary.gainedCount} totalCount={lp.model.allSkills.length} t={t} />

              <SkillCelebrationPanel
                allSkills={lp.model.allSkills}
                gainedSkills={skillSummary.gainedSkills}
                selectedSkill={selectedSkill}
                onSelectSkill={setSelectedSkill}
                t={t}
              />

              <StatusTimeline
                model={lp.model}
                levelStatuses={lp.levelStatuses}
                skillSources={skillSummary.skillSources}
                selectedSkill={selectedSkill}
                t={t}
              />
            </>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default LearningPathStatusPage;
