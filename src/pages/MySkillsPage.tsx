import React, { useEffect } from 'react';
import { IonContent, IonHeader, IonPage, IonToolbar, useIonRouter } from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMySkills } from '../hooks/useMySkills';
import { useSkillSuggestions } from '../hooks/useSkillSuggestions';
import { getLearningPathStatusPath } from '../utils/getContentDetailPath';
import { BackIcon } from '../components/icons/CollectionIcons';
import PageLoader from '../components/common/PageLoader';
import MySkillsHero from '../components/mySkills/MySkillsHero';
import SkillSuggestionRow from '../components/mySkills/SkillSuggestionRow';
import SkillPathAccordion from '../components/mySkills/SkillPathAccordion';
import type { SkillSuggestion } from '../hooks/useSkillSuggestions';
import type { PathSkillSummary } from '../services/learningPath/skillAggregation';
import './MySkillsPage.css';

const MySkillsPage: React.FC = () => {
  const router = useIonRouter();
  const location = useLocation<{ parentRoute?: string }>();
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('pageTitle.mySkills');
  }, [t]);

  const mySkills = useMySkills();
  const enrolledPathIds = mySkills.entries.map((e) => e.path.pathId);
  const { suggestions } = useSkillSuggestions(mySkills.summaries, enrolledPathIds);

  const handleBack = () => {
    if (location.state?.parentRoute) {
      router.push(location.state.parentRoute, 'back', 'pop');
    } else {
      router.goBack();
    }
  };

  const openPath = (pathId: string, contextId?: string) => {
    const base = contextId ? `/learning-path/${pathId}/batch/${contextId}` : `/learning-path/${pathId}`;
    router.push(base, 'forward', 'push');
  };

  const handleSelectSuggestion = (suggestion: SkillSuggestion) => openPath(suggestion.pathId, suggestion.contextId);
  const handleOpenPathSummary = (summary: PathSkillSummary) =>
    router.push(getLearningPathStatusPath(summary.pathId, summary.contextId), 'forward', 'push');

  const isEmpty = !mySkills.isLoading && !mySkills.isError && mySkills.entries.length === 0;

  return (
    <IonPage className="ms-page">
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
          {mySkills.isLoading && <PageLoader message={t('loading')} />}
          {!mySkills.isLoading && mySkills.isError && <PageLoader error={t('mySkills.errorLoading')} />}

          {isEmpty && <PageLoader error={t('mySkills.noEnrolledPaths')} />}

          {!mySkills.isLoading && !mySkills.isError && !isEmpty && (
            <>
              <MySkillsHero
                aggregate={mySkills.aggregate}
                analyzedCount={mySkills.analyzedCount}
                totalCount={mySkills.totalCount}
                t={t}
              />

              <SkillSuggestionRow suggestions={suggestions} onSelect={handleSelectSuggestion} t={t} />

              <SkillPathAccordion summaries={mySkills.summaries} onOpenPath={handleOpenPathSummary} t={t} />
            </>
          )}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default MySkillsPage;
