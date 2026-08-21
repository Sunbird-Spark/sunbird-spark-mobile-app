import React, { useEffect, useState } from 'react';
import { IonContent, IonHeader, IonModal, IonPage, IonToolbar, useIonRouter } from '@ionic/react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLearningPath } from '../hooks/useLearningPath';
import { getAssessmentScore } from '../services/learningPath/learningPathProgress';
import { BackIcon } from '../components/icons/CollectionIcons';
import PageLoader from '../components/common/PageLoader';
import ProgressRing from '../components/common/ProgressRing';
import LPScoreRows from '../components/learningPath/LPScoreRows';
import LPCertificateCard from '../components/learningPath/LPCertificateCard';
import './LearningPathCompletePage.css';

const LearningPathCompletePage: React.FC = () => {
  const { pathId, contextId: contextIdParam } = useParams<{ pathId: string; contextId?: string }>();
  const router = useIonRouter();
  const location = useLocation<{ parentRoute?: string }>();
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('learningPath.pathComplete');
  }, [t]);

  const lp = useLearningPath(pathId, contextIdParam);
  const [isCertPreviewOpen, setIsCertPreviewOpen] = useState(false);

  const priorScore = lp.model.priorAssessment
    ? getAssessmentScore(lp.model.priorAssessment.identifier, lp.pathSummary, lp.model.priorAssessment.leafIds)
    : null;
  const outcomeScore = lp.model.outcomeAssessment
    ? getAssessmentScore(lp.model.outcomeAssessment.identifier, lp.pathSummary, lp.model.outcomeAssessment.leafIds)
    : null;

  const handleBack = () => {
    if (location.state?.parentRoute) {
      router.push(location.state.parentRoute, 'back', 'pop');
    } else {
      const base = contextIdParam ? `/learning-path/${pathId}/batch/${contextIdParam}` : `/learning-path/${pathId}`;
      router.push(base, 'back', 'pop');
    }
  };

  const isNotFound = !lp.isLoading && !lp.isError && lp.model.levels.length === 0;

  return (
    <IonPage className="lp-complete-page">
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
          {isNotFound && <PageLoader error={t('learningPath.notFound')} />}

          {!lp.isLoading && !lp.isError && !isNotFound && (
            <>
              <div className="lp-complete-hero">
                <ProgressRing progress={100} size={96} stroke={8} fillColor="var(--ion-color-success)" ariaLabel={t('learningPath.pathComplete')}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M7 12l3 3 7-7" stroke="var(--ion-color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </ProgressRing>
                <h1 className="lp-complete-title">{t('learningPath.pathComplete')}</h1>
                <p className="lp-complete-subtitle">{lp.model.name}</p>
              </div>

              <LPScoreRows priorScore={priorScore} outcomeScore={outcomeScore} t={t} />

              <LPCertificateCard
                unlocked={lp.certificateUnlocked}
                certPreviewUrl={lp.enrollment.certPreviewUrl}
                onView={() => setIsCertPreviewOpen(true)}
                t={t}
              />

              {lp.model.allSkills.length > 0 && (
                <div className="lp-complete-skills-card">
                  <h2 className="lp-section-title">{t('learningPath.skillsGainedTitle')}</h2>
                  <div className="lp-ledger-level-skills">
                    {lp.model.allSkills.map((skill) => (
                      <span key={skill} className="lp-skill-chip lp-skill-chip--gained">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </IonContent>

      <IonModal isOpen={isCertPreviewOpen} onDidDismiss={() => setIsCertPreviewOpen(false)} className="lp-cert-preview-modal">
        <div className="lp-cert-preview-content">
          <div className="lp-cert-preview-header">
            <h2>{t('download.previewCertificate')}</h2>
            <button className="lp-cert-preview-close" onClick={() => setIsCertPreviewOpen(false)} aria-label={t('close')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="var(--ion-color-dark, #333)" />
              </svg>
            </button>
          </div>
          {lp.enrollment.certPreviewUrl && (
            <img src={lp.enrollment.certPreviewUrl} alt={t('download.previewCertificate')} className="lp-cert-preview-img" />
          )}
        </div>
      </IonModal>
    </IonPage>
  );
};

export default LearningPathCompletePage;
