import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonModal,
  IonPage,
  IonSpinner,
  IonToolbar,
  useIonRouter,
  useIonViewDidEnter,
} from '@ionic/react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLearningPath } from '../hooks/useLearningPath';
import { BackIcon } from '../components/icons/CollectionIcons';
import PageLoader from '../components/common/PageLoader';
import LPProgressCard from '../components/learningPath/LPProgressCard';
import LPLedger from '../components/learningPath/LPLedger';
import LPCertificateCard from '../components/learningPath/LPCertificateCard';
import './LearningPathPage.css';

const LearningPathPage: React.FC = () => {
  const { pathId, contextId: contextIdParam } = useParams<{ pathId: string; contextId?: string }>();
  const router = useIonRouter();
  const location = useLocation<{ parentRoute?: string }>();
  const { t } = useTranslation();
  const { isAuthenticated, userId } = useAuth();

  useEffect(() => {
    document.title = t('pageTitle.learningPath');
  }, [t]);

  const lp = useLearningPath(pathId, contextIdParam);

  useIonViewDidEnter(() => {
    // no-op placeholder kept for parity with CollectionPage's refresh-on-enter pattern;
    // useLearningPath's underlying queries already refetch on their own staleTime.
  });

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [isCertPreviewOpen, setIsCertPreviewOpen] = useState(false);

  const handleBack = () => {
    if (location.state?.parentRoute) {
      router.push(location.state.parentRoute, 'back', 'pop');
    } else {
      router.goBack();
    }
  };

  const handleJoin = async () => {
    if (!selectedBatchId || !pathId || !userId) return;
    try {
      await lp.enrollment.enrol.mutateAsync({ courseId: pathId, userId, batchId: selectedBatchId });
      setIsBatchModalOpen(false);
    } catch {
      // Surfaced via lp.enrollment.enrol.error below.
    }
  };

  // Nav helpers — mirror the portal's LearningPathPage route-switch helpers
  // (basePath/goLevel/goPrior/goOutcome/openCourse) so every LP screen builds
  // the same enrolled/not-yet-enrolled URL shape.
  const basePath = contextIdParam ? `/learning-path/${pathId}/batch/${contextIdParam}` : `/learning-path/${pathId}`;
  const goLevel = (levelId: string) => router.push(`${basePath}/level/${levelId}`, 'forward', 'push');
  const goPrior = () => router.push(`${basePath}/prior`, 'forward', 'push');
  const goOutcome = () => router.push(`${basePath}/outcome`, 'forward', 'push');
  const goComplete = () => router.push(`${basePath}/complete`, 'forward', 'push');
  const openCourse = (courseId: string, contentId: string) => {
    if (!contentId) return;
    router.push(`${basePath}/course/${courseId}/content/${contentId}`, 'forward', 'push');
  };

  const priorProgress = lp.priorState.progress;
  const outcomeProgress = lp.outcomeState.progress;

  // Primary Start/Resume CTA for an enrolled learner. Prefers `resumeTarget`
  // (the exact last-viewed leaf) so "Resume" genuinely continues where the
  // learner left off; falls back to the first actionable gate when nothing
  // has been touched yet (a fresh enrolment has no Viewer Service summary
  // record yet, so `resumeTarget` is null — this is the COMMON case right
  // after joining, not an edge case).
  const primaryAction = (() => {
    if (lp.resumeTarget) {
      return {
        labelKey: lp.progress.pct > 0 ? 'learningPath.resume' : 'learningPath.start',
        onClick: () => openCourse(lp.resumeTarget!.collectionId, lp.resumeTarget!.contentId),
      };
    }
    if (lp.model.priorAssessment && !lp.priorState.done) {
      return { labelKey: 'learningPath.startAssessment', onClick: goPrior };
    }
    const firstUnlockedLevelIndex = lp.levelStatuses.findIndex((s) => s !== 'locked' && s !== 'completed');
    if (firstUnlockedLevelIndex >= 0) {
      const level = lp.model.levels[firstUnlockedLevelIndex];
      return { labelKey: 'learningPath.start', onClick: () => goLevel(level.identifier) };
    }
    if (lp.model.outcomeAssessment && lp.outcomeState.unlocked && !lp.outcomeState.done) {
      return { labelKey: 'learningPath.startAssessment', onClick: goOutcome };
    }
    return null;
  })();

  const isNotFound = !lp.isLoading && !lp.isError && lp.model.levels.length === 0 && !lp.model.priorAssessment && !lp.model.outcomeAssessment;

  return (
    <IonPage className="lp-page">
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

          {!lp.isLoading && lp.isError && (
            <PageLoader error={t('learningPath.errorLoading')} />
          )}

          {!lp.isLoading && !lp.isError && isNotFound && (
            <PageLoader error={t('learningPath.notFound')} />
          )}

          {!lp.isLoading && !lp.isError && !isNotFound && (
            <>
              <div className="lp-title-section">
                <h1 className="lp-title">{lp.model.name}</h1>
                {lp.model.description && <p className="lp-description">{lp.model.description}</p>}
              </div>

              {lp.isCreatorViewingOwnPath ? (
                <div className="lp-creator-note">{t('learningPath.creatorCannotEnrol')}</div>
              ) : lp.enrollment.isEnrolled ? (
                <>
                  <LPProgressCard
                    model={lp.model}
                    progressPct={lp.progress.pct}
                    doneLevels={lp.progress.doneLevels}
                    batchEndDate={lp.enrollment.batchEndDate}
                    t={t}
                  />
                  <LPLedger
                    model={lp.model}
                    levelProgress={lp.levelProgress}
                    levelStatuses={lp.levelStatuses}
                    priorProgress={priorProgress}
                    priorDone={lp.priorState.done}
                    outcomeProgress={outcomeProgress}
                    outcomeUnlocked={lp.outcomeState.unlocked}
                    summaryByCollectionId={lp.summaryByCollectionId}
                    pathSummary={lp.pathSummary}
                    onOpenPrior={goPrior}
                    onOpenOutcome={lp.model.outcomeAssessment ? goOutcome : undefined}
                    onOpenLevel={goLevel}
                    onOpenCourse={openCourse}
                    t={t}
                  />
                  <LPCertificateCard
                    unlocked={lp.certificateUnlocked}
                    certPreviewUrl={lp.enrollment.certPreviewUrl}
                    onView={() => setIsCertPreviewOpen(true)}
                    onViewSummary={goComplete}
                    t={t}
                  />
                  {primaryAction && (
                    <div className="lp-bottom-cta-wrap">
                      <div
                        role="button"
                        tabIndex={0}
                        className="lp-bottom-cta"
                        onClick={primaryAction.onClick}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); primaryAction.onClick(); }
                        }}
                      >
                        <span className="lp-bottom-cta-text">{t(primaryAction.labelKey)}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="lp-static-stat-grid">
                    <div className="lp-progress-stat">
                      <span className="lp-progress-stat-label">{t('learningPath.levels')}</span>
                      <span className="lp-progress-stat-value">{lp.model.levels.length}</span>
                    </div>
                    <div className="lp-progress-stat">
                      <span className="lp-progress-stat-label">{t('learningPath.courses')}</span>
                      <span className="lp-progress-stat-value">{lp.model.courseTotal}</span>
                    </div>
                    <div className="lp-progress-stat">
                      <span className="lp-progress-stat-label">{t('learningPath.skills')}</span>
                      <span className="lp-progress-stat-value">{lp.model.allSkills.length}</span>
                    </div>
                  </div>

                  {isAuthenticated ? (
                    <div className="lp-bottom-cta-wrap">
                      <div
                        role="button"
                        tabIndex={0}
                        className="lp-bottom-cta"
                        onClick={() => setIsBatchModalOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsBatchModalOpen(true); }
                        }}
                      >
                        <span className="lp-bottom-cta-text">{t('learningPath.joinThePath')}</span>
                      </div>

                      <IonModal
                        isOpen={isBatchModalOpen}
                        onDidDismiss={() => setIsBatchModalOpen(false)}
                        initialBreakpoint={0.35}
                        breakpoints={[0, 0.35]}
                        className="lp-batch-modal"
                      >
                        <div className="lp-batch-modal-inner">
                          <div className="lp-batch-modal-header">
                            <h2>{t('collection.availableBatches')}</h2>
                            <button type="button" className="lp-batch-modal-close" onClick={() => setIsBatchModalOpen(false)} aria-label={t('close')}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z" fill="var(--ion-color-primary)" />
                              </svg>
                            </button>
                          </div>
                          <div className="lp-batch-modal-content">
                            {lp.enrollment.batchListLoading ? (
                              <div className="lp-batch-modal-spinner"><IonSpinner name="crescent" /></div>
                            ) : lp.enrollment.batchListError ? (
                              <p className="lp-batch-modal-error">{lp.enrollment.batchListError}</p>
                            ) : lp.enrollment.enrollableBatches.length === 0 ? (
                              <p className="lp-batch-modal-empty">{t('collection.noBatchesAvailable')}</p>
                            ) : (
                              <>
                                <p className="lp-batch-modal-subtitle">{t('collection.selectBatchToStart')}</p>
                                <div className="lp-batch-select-container">
                                  <select
                                    className="lp-batch-select"
                                    value={selectedBatchId}
                                    onChange={(e) => setSelectedBatchId(e.target.value)}
                                  >
                                    <option value="" disabled>{t('collection.selectBatch')}</option>
                                    {lp.enrollment.enrollableBatches.map((batch) => (
                                      <option key={batch.identifier} value={batch.identifier}>
                                        {batch.name ?? batch.identifier}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}
                            {lp.enrollment.enrol.error && (
                              <p className="lp-batch-modal-error">{lp.enrollment.enrol.error.message}</p>
                            )}
                          </div>
                          <div className="lp-batch-modal-cta-wrap">
                            <div
                              role="button"
                              tabIndex={(!selectedBatchId || lp.enrollment.enrol.isPending) ? -1 : 0}
                              aria-disabled={!selectedBatchId || lp.enrollment.enrol.isPending}
                              className="lp-batch-modal-cta"
                              onClick={() => { if (!selectedBatchId || lp.enrollment.enrol.isPending) { return; } void handleJoin(); }}
                              onKeyDown={(e) => {
                                if (!selectedBatchId || lp.enrollment.enrol.isPending) return;
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void handleJoin(); }
                              }}
                              style={{ opacity: (!selectedBatchId || lp.enrollment.enrol.isPending) ? 0.5 : 1 }}
                            >
                              {lp.enrollment.enrol.isPending ? (
                                <IonSpinner name="crescent" style={{ width: 18, height: 18, color: 'white' }} />
                              ) : (
                                <span className="lp-bottom-cta-text">{t('learningPath.joinTheBatch')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </IonModal>
                    </div>
                  ) : (
                    <div className="lp-anonymous-cta">
                      <p>{t('collection.unlockYourLearning')}</p>
                      <button type="button" className="lp-bottom-cta" onClick={() => router.push('/sign-in', 'forward', 'push')}>
                        <span className="lp-bottom-cta-text">{t('collection.loginToBeginJourney')}</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </IonContent>

      <IonModal isOpen={isCertPreviewOpen} onDidDismiss={() => setIsCertPreviewOpen(false)} className="lp-cert-preview-modal">
        <div className="lp-cert-preview-content">
          <div className="lp-cert-preview-header">
            <h2>{t('download.previewCertificate')}</h2>
            <button type="button" className="lp-cert-preview-close" onClick={() => setIsCertPreviewOpen(false)} aria-label={t('close')}>
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

export default LearningPathPage;
