import React, { useState, useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonModal,
} from '@ionic/react';
import { useParams, useLocation } from 'react-router-dom';
import { useIonRouter } from '@ionic/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCollection } from '../hooks/useCollection';
import { useContentSearch } from '../hooks/useContentSearch';
import { useFaqData } from '../hooks/useFaqData';
import { mapSearchContentToRelatedContentItems } from '../services/relatedContentMapper';
import { BackIcon, SearchIcon, RightArrowIcon } from '../components/icons/CollectionIcons';
import CollectionOverview from '../components/collection/CollectionOverview';
import CollectionAccordion from '../components/collection/CollectionAccordion';
import RelatedContent from '../components/collection/RelatedContent';
import CollectionContentPlayer from '../components/collection/CollectionContentPlayer';
import PageLoader from '../components/common/PageLoader';
import './CollectionPage.css';

// ── Component ──────────────────────────────────────────────────────────────
const CollectionPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const router = useIonRouter();
  const location = useLocation<{ parentRoute?: string }>();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  // Data fetching
  const { data: collectionData, isLoading, isError, fetchStatus } = useCollection(collectionId);
  // When AppInitializer hasn't completed (browser dev mode), the query stays idle.
  const isQueryIdle = fetchStatus === 'idle' && !collectionData && !isError;

  const isTrackable =
    (collectionData?.trackable?.enabled?.toLowerCase() ?? '') === 'yes';
  const isCourse = collectionData?.primaryCategory?.toLowerCase() === 'course';

  // Determine view state for trackable collections
  type ViewState = 'anonymous' | 'unenrolled' | 'enrolled';
  const viewState: ViewState = useMemo(() => {
    if (!isTrackable) return 'enrolled'; // Non-trackable: show content freely
    if (!isAuthenticated) return 'anonymous';
    // TODO: integrate enrollment check — for now treat authenticated as unenrolled
    return 'unenrolled';
  }, [isTrackable, isAuthenticated]);

  // Player state
  const [playingContentId, setPlayingContentId] = useState<string | null>(null);

  // Batch modal state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Related content search (matches portal: limit 20, filter to root-level items)
  const hierarchySuccess = !isError && !!collectionData;
  const { data: searchData } = useContentSearch({
    request: { limit: 20, offset: 0 },
    enabled: hierarchySuccess,
  });
  const relatedItems = useMemo(
    () => mapSearchContentToRelatedContentItems(searchData?.data?.content, collectionData?.id, 3),
    [searchData, collectionData?.id]
  );

  // FAQ data
  const { faqData } = useFaqData();
  const allFaqs = useMemo(() => {
    if (!faqData?.categories) return [];
    return faqData.categories.flatMap((cat) => cat.faqs);
  }, [faqData]);

  const handleBack = () => {
    if (location.state?.parentRoute) {
      router.push(location.state.parentRoute, 'back', 'pop');
    } else {
      router.goBack();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  // Fullscreen player — replaces entire page (no header/footer)
  if (playingContentId) {
    return (
      <CollectionContentPlayer
        contentId={playingContentId}
        onClose={() => setPlayingContentId(null)}
      />
    );
  }

  return (
    <IonPage className="collection-page">
      {/* Header */}
      <IonHeader className="ion-no-border">
        <IonToolbar className="collection-page-header">
          <div className="collection-page-header-inner">
            <button onClick={handleBack} className="collection-page-icon-btn">
              <BackIcon />
            </button>
            <div className="collection-page-header-actions">
              <button className="collection-page-icon-btn" onClick={() => router.push('/search', 'forward', 'push')}>
                <SearchIcon />
              </button>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {/* Loading */}
        {(isLoading || isQueryIdle) && (
          <PageLoader message={isQueryIdle ? 'Initializing…' : t('loading')} />
        )}

        {/* Error */}
        {!isLoading && !isQueryIdle && isError && (
          <PageLoader error={t('collection.errorLoading')} />
        )}

        {/* Not found */}
        {!isLoading && !isQueryIdle && !isError && !collectionData && (
          <PageLoader error={t('collection.notFound')} />
        )}

        {/* Main content */}
        {!isLoading && collectionData && (
          <>
            <CollectionOverview
              collectionData={collectionData}
              isCourse={isCourse}
              t={t}
            />

            <CollectionAccordion
              children={collectionData.children}
              collectionId={collectionId}
              isCourse={isCourse}
              viewState={viewState}
              t={t}
              onContentPlay={(id) => setPlayingContentId(id)}
            />

            <RelatedContent
              items={relatedItems}
              t={t}
            />

            {/* Bottom padding for sticky CTA */}
            <div style={{ height: '80px' }} />
          </>
        )}
      </IonContent>

      {/* ── Bottom CTA based on viewState ── */}

      {/* Anonymous: "Let's Get Started" → login */}
      {viewState === 'anonymous' && !isLoading && collectionData && (
        <div
          className="cp-bottom-cta"
          onClick={() => {
            // In a mobile app, this would trigger the login flow
            window.location.href = '/app/login?prompt=none';
          }}
        >
          <span className="cp-bottom-cta-text">{t('collection.letsGetStarted')}</span>
          <RightArrowIcon />
        </div>
      )}

      {/* Unenrolled: "Join the Course" → open batch modal */}
      {viewState === 'unenrolled' && isTrackable && !isLoading && collectionData && (
        <>
          <div className="cp-bottom-cta" onClick={() => setIsBatchModalOpen(true)}>
            <span className="cp-bottom-cta-text">{t('collection.joinTheCourse')}</span>
          </div>

          <IonModal
            isOpen={isBatchModalOpen}
            onDidDismiss={() => setIsBatchModalOpen(false)}
            initialBreakpoint={0.4}
            breakpoints={[0, 0.4, 0.75, 1]}
            className="cp-batch-modal"
          >
            <div className="cp-batch-modal-inner">
              <div className="cp-batch-modal-header">
                <h2>{t('collection.availableBatches')}</h2>
                <button className="cp-batch-modal-close" onClick={() => setIsBatchModalOpen(false)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z" fill="var(--ion-color-primary)" />
                  </svg>
                </button>
              </div>
              <div className="cp-batch-modal-content">
                <p className="cp-batch-modal-subtitle">{t('collection.selectBatchToStart')}</p>
                <div className="cp-batch-select-container">
                  <select
                    className="cp-batch-select"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                  >
                    <option value="" disabled>{t('collection.selectBatch')}</option>
                    {/* TODO: Populate with real batches from batch list API */}
                  </select>
                  <svg className="cp-batch-select-icon" width="14" height="8" viewBox="0 0 14 8" fill="none">
                    <path d="M1 1L7 7L13 1" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="cp-batch-modal-cta-wrap">
                <div
                  className="cp-batch-modal-cta"
                  onClick={() => {
                    if (selectedBatchId) {
                      setIsBatchModalOpen(false);
                      router.push(`/course-learning`, 'forward', 'push');
                    }
                  }}
                >
                  <span className="cp-bottom-cta-text">{t('collection.joinTheBatch')}</span>
                </div>
              </div>
            </div>
          </IonModal>
        </>
      )}
    </IonPage>
  );
};

export default CollectionPage;
