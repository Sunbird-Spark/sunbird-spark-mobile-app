import React, { useState, useMemo, useRef } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonModal,
  IonSpinner,
  IonToggle,
  IonToast,
} from '@ionic/react';
import { useParams, useLocation } from 'react-router-dom';
import { useIonRouter, useIonViewDidEnter, useIonViewWillLeave } from '@ionic/react';
import { warningOutline } from 'ionicons/icons';
import { userService } from '../services/UserService';
import { useLanguage } from '../contexts/LanguageContext';
import { useCollection } from '../hooks/useCollection';
import { useCollectionEnrollment } from '../hooks/useCollectionEnrollment';
import { useContentSearch } from '../hooks/useContentSearch';
import { useConsent } from '../hooks/useConsent';
import { useUser } from '../hooks/useUser';
import { useForceSync } from '../hooks/useForceSync';
import { mapSearchContentToRelatedContentItems } from '../services/relatedContentMapper';
import { BackIcon, SearchIcon, RightArrowIcon } from '../components/icons/CollectionIcons';
import CollectionOverview from '../components/collection/CollectionOverview';
import CollectionAccordion from '../components/collection/CollectionAccordion';
import RelatedContent from '../components/collection/RelatedContent';
import CollectionContentPlayer from '../components/collection/CollectionContentPlayer';
import CourseCompletionDialog from '../components/collection/CourseCompletionDialog';
import FAQSection from '../components/home/FAQSection';
import PageLoader from '../components/common/PageLoader';
import './CollectionPage.css';

// ── Circular Progress Widget ──
const CircularProgress = ({ value, size = 48 }: { value: number; size?: number }) => {
  const radius = size / 2;
  const stroke = 5;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const isComplete = value >= 100;

  return (
    <div className="cp-progress-complete-icon">
      <svg height={size} width={size} className="circular-progress">
        {/* Background track */}
        <circle stroke="var(--ion-color-warning-shade, #F0CE94)" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        {/* Progress arc */}
        <circle stroke={isComplete ? '#2dd36f' : 'var(--ion-color-primary, #8B5E3C)'} fill="transparent" strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset }}
          strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`} />
        {/* Small green tick in center when 100% */}
        {isComplete && (
          <g transform={`translate(${radius - 7}, ${radius - 6})`}>
            <circle cx="7" cy="6" r="8" fill="#2dd36f" />
            <path d="M3.5 6L6 8.5L10.5 3.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>
    </div>
  );
};

const CertificateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="3" width="16" height="14" rx="2" fill="var(--ion-color-primary-tint, #D28D5D)" />
    <path d="M7 6H13M7 9H13M7 12H10" stroke="var(--ion-color-light)" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="15" cy="14" r="3" fill="var(--ion-color-primary)" />
  </svg>
);

// ══════════════════════════════════════════════════════════════
//  CollectionPage — single page for anonymous, unenrolled & enrolled
// ══════════════════════════════════════════════════════════════

const CollectionPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const router = useIonRouter();
  const location = useLocation<{ parentRoute?: string }>();
  const isAuthenticated = userService.isLoggedIn();
  const userId = userService.getUserId();
  const { t } = useLanguage();

  // Track whether this Ionic view is currently active (visible).
  // State-based so child components (e.g. CourseCompletionDialog) can react to it.
  const [isViewActive, setIsViewActive] = useState(false);
  useIonViewDidEnter(() => { setIsViewActive(true); });
  useIonViewWillLeave(() => { setIsViewActive(false); });

  // Data fetching
  const { data: collectionData, isLoading, isError, fetchStatus } = useCollection(collectionId);
  const isQueryIdle = fetchStatus === 'idle' && !collectionData && !isError;

  const isTrackable =
    (collectionData?.trackable?.enabled?.toLowerCase() ?? '') === 'yes';
  const isCourse = collectionData?.primaryCategory?.toLowerCase() === 'course';

  // Creator check — course creators cannot enroll in / consume their own trackable courses
  // (mirrors old SunbirdEd mobile app behaviour)
  const isCreator = !!(userId && collectionData?.createdBy && userId === collectionData.createdBy);

  // Enrollment state — uses real API data
  const enrollment = useCollectionEnrollment(collectionId, collectionData);

  // Determine view state for trackable collections
  // Non-trackable collections always use the default view (no enrollment flow)
  type ViewState = 'anonymous' | 'unenrolled' | 'enrolled' | 'default';
  const viewState: ViewState = useMemo(() => {
    if (!isTrackable) return 'default';
    if (!isAuthenticated) return 'anonymous';
    if (isCreator) return 'unenrolled'; // Creator treated as unenrolled — blocked from consuming
    if (enrollment.isEnrolled) return 'enrolled';
    return 'unenrolled';
  }, [isTrackable, isAuthenticated, isCreator, enrollment.isEnrolled]);

  // Player state
  const [playingContentId, setPlayingContentId] = useState<string | null>(null);
  // Track progress before player opens so we can detect completion on return
  const progressBeforePlayerRef = useRef<number | null>(null);

  // Batch modal state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Enrolled-only: toggle for downloaded content
  const [viewDownloadedOnly, setViewDownloadedOnly] = useState(false);

  // 3-dot menu state (Completed section)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Leave course confirmation
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Certificate preview modal
  const [isCertPreviewOpen, setIsCertPreviewOpen] = useState(false);

  const showConsent =
    isAuthenticated &&
    !isCreator &&
    enrollment.isEnrolled &&
    collectionData?.userConsent?.toLowerCase() === 'yes';

  const consent = useConsent({
    collectionId,
    channel: collectionData?.channel,
    enabled: showConsent,
  });

  const { data: userProfile } = useUser(userId);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [consentToastMessage, setConsentToastMessage] = useState('');

  // Force sync (enrolled only)
  const forceSync = useForceSync(userId, collectionId, enrollment.enrolledBatchId ?? undefined, enrollment.progressProps, enrollment.isBatchEnded);

  // Related content search
  const hierarchySuccess = !isError && !!collectionData;
  const { data: searchData } = useContentSearch({
    request: { limit: 20, offset: 0 },
    enabled: hierarchySuccess,
  });
  const relatedItems = useMemo(
    () => mapSearchContentToRelatedContentItems(searchData?.data?.content, collectionData?.id, 3),
    [searchData, collectionData?.id],
  );

  const handleBack = () => {
    if (location.state?.parentRoute) {
      router.push(location.state.parentRoute, 'back', 'pop');
    } else {
      router.goBack();
    }
  };

  const handleJoinCourse = async () => {
    if (!selectedBatchId || !collectionId || !userId) return;
    try {
      await enrollment.enrol.mutateAsync({ courseId: collectionId, userId, batchId: selectedBatchId });
      setIsBatchModalOpen(false);
    } catch {
      // Error is available via enrollment.joinError
    }
  };

  const handleLeaveCourse = async () => {
    if (!collectionId || !userId || !enrollment.enrolledBatchId) return;
    setIsLeaving(true);
    try {
      await enrollment.unenrol.mutateAsync({
        courseId: collectionId,
        userId,
        batchId: enrollment.enrolledBatchId,
      });
      setShowLeaveConfirm(false);
      setIsMenuOpen(false);
    } catch {
      // Error handled by mutation
    } finally {
      setIsLeaving(false);
    }
  };

  // Enrollment data for CollectionAccordion (enrolled view only)
  const enrollmentData = useMemo(() => {
    if (viewState !== 'enrolled') return undefined;
    return {
      contentStatusMap: enrollment.contentStatusMap,
      contentAttemptInfoMap: enrollment.contentAttemptInfoMap,
    };
  }, [viewState, enrollment.contentStatusMap, enrollment.contentAttemptInfoMap]);
  const batchStartLabel = enrollment.batchStartDate
    ? new Date(enrollment.batchStartDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : '';

  // Fullscreen player
  if (playingContentId) {
    return (
      <CollectionContentPlayer
        contentId={playingContentId}
        onClose={() => setPlayingContentId(null)}
        collectionId={collectionId}
        batchId={enrollment.enrolledBatchId ?? undefined}
        hierarchyRoot={collectionData?.hierarchyRoot}
        isEnrolled={enrollment.isEnrolled}
        isBatchEnded={enrollment.isBatchEnded}
        currentContentStatus={playingContentId ? enrollment.contentStatusMap[playingContentId] : undefined}
        skipContentStateUpdate={isCreator}
      />
    );
  }

  // Snapshot progress before opening the player so CourseCompletionDialog can
  // detect a <100 → ≥100 transition that happened while the dialog was unmounted.
  const openPlayer = (contentId: string) => {
    progressBeforePlayerRef.current = enrollment.progressProps.percentage;
    setPlayingContentId(contentId);
  };

  // Upcoming batch gate
  if (!isLoading && collectionData && viewState === 'enrolled' && isTrackable && enrollment.isBatchUpcoming) {
    const startLabel = enrollment.batchStartDate
      ? new Date(enrollment.batchStartDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    return (
      <IonPage className="collection-page">
        <IonHeader className="ion-no-border">
          <IonToolbar className="collection-page-header">
            <div className="collection-page-header-inner">
              <button onClick={handleBack} className="collection-page-icon-btn">
                <BackIcon />
              </button>
            </div>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <div style={{ marginTop: '4rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{collectionData.title}</h2>
            <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              This batch has not started yet.
              {startLabel ? ` It starts on ${startLabel}.` : ''}{' '}
              You can access the content once the batch begins.
            </p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="collection-page">
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
        {(isLoading || isQueryIdle) && (
          <PageLoader message={isQueryIdle ? 'Initializing…' : t('loading')} />
        )}

        {!isLoading && !isQueryIdle && isError && (
          <PageLoader error={t('collection.errorLoading')} />
        )}

        {!isLoading && !isQueryIdle && !isError && !collectionData && (
          <PageLoader error={t('collection.notFound')} />
        )}

        {/* ── Default / Anonymous / Unenrolled view ── */}
        {!isLoading && collectionData && viewState !== 'enrolled' && (
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
              onContentPlay={openPlayer}
            />

            <RelatedContent items={relatedItems} t={t} />
            <FAQSection />
            <div style={{ height: '80px' }} />
          </>
        )}

        {/* ── Enrolled trackable view ── */}
        {!isLoading && collectionData && viewState === 'enrolled' && (
          <>
            {/* Course Overview with progress merged in */}
            <CollectionOverview
              collectionData={collectionData}
              isCourse={isCourse}
              t={t}
              hideBestSuited
            >
              {/* Progress + 3-dot menu inside overview card */}
              <div className="cp-enrolled-progress-row">
                <div className="cp-progress-section">
                  <CircularProgress value={enrollment.progressProps.percentage} size={48} />
                  <div className="cp-progress-details">
                    <h3 className="cp-progress-percentage">Completed : {enrollment.progressProps.percentage}%</h3>
                    {batchStartLabel && <span className="cp-progress-date">Batch Started on : {batchStartLabel}</span>}
                  </div>
                </div>
                {/* 3-dot menu only if there are items to show */}
                {(enrollment.progressProps.percentage < 100 || forceSync.showForceSyncButton) && (
                  <div className="cp-menu-wrapper" ref={menuRef}>
                    <button
                      className="cp-menu-trigger"
                      onClick={() => setIsMenuOpen((prev) => !prev)}
                      aria-label="More options"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="5" r="2" fill="var(--ion-color-dark, #333)" />
                        <circle cx="12" cy="12" r="2" fill="var(--ion-color-dark, #333)" />
                        <circle cx="12" cy="19" r="2" fill="var(--ion-color-dark, #333)" />
                      </svg>
                    </button>
                    {isMenuOpen && (
                      <>
                        <div className="cp-menu-backdrop" onClick={() => setIsMenuOpen(false)} />
                        <div className="cp-menu-dropdown">
                          {enrollment.progressProps.percentage >= 100 ? (
                            forceSync.showForceSyncButton && (
                              <button
                                className="cp-menu-item"
                                onClick={() => {
                                  forceSync.handleForceSync();
                                  setIsMenuOpen(false);
                                }}
                                disabled={forceSync.isForceSyncing}
                              >
                                {forceSync.isForceSyncing ? (
                                  <IonSpinner name="crescent" style={{ width: 14, height: 14 }} />
                                ) : (
                                  'Sync Progress'
                                )}
                              </button>
                            )
                          ) : (
                            <button
                              className="cp-menu-item cp-menu-item-danger"
                              onClick={() => {
                                setIsMenuOpen(false);
                                setShowLeaveConfirm(true);
                              }}
                            >
                              Leave Course
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              {forceSync.forceSyncError && (
                <p style={{ fontSize: '0.75rem', color: 'var(--ion-color-danger)', textAlign: 'center', padding: '0 1rem 0.5rem' }}>
                  {forceSync.forceSyncError}
                </p>
              )}
            </CollectionOverview>

            {/* View Downloaded Only Toggle */}
            <div className="cp-toggle-section">
              <span className="cp-toggle-label">View downloaded only</span>
              <IonToggle
                className="custom-toggle"
                checked={viewDownloadedOnly}
                onIonChange={(e) => setViewDownloadedOnly(e.detail.checked)}
              />
            </div>

            {/* Enrolled Curriculum — reuses CollectionAccordion with enrollment data for status icons */}
            <CollectionAccordion
              children={collectionData.children}
              collectionId={collectionId}
              isCourse={isCourse}
              viewState={viewState}
              t={t}
              onContentPlay={openPlayer}
              enrollmentData={enrollmentData}
              hideTitle
            />

            {/* Info Cards */}
            <div className="info-cards-container">
              {/* Certificate Card — A3: always shown for enrolled users, A6: not for creator */}
              {!isCreator && (
                <div className="info-card">
                  <div className="info-card-header">
                    <CertificateIcon />
                    <h3 className="info-card-title">Certificate</h3>
                  </div>
                  {enrollment.hasCertificate ? (
                    <>
                      <p className="info-card-desc">Earn a certificate on completion of the course. Verify the details before completing the course.</p>
                      {enrollment.certPreviewUrl && (
                        <button
                          className="btn-primary"
                          onClick={() => setIsCertPreviewOpen(true)}
                        >
                          Preview Certificate
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="info-card-desc">Currently, this course does not have a certificate. The course creator may attach a certificate later.</p>
                  )}
                </div>
              )}

              {/* Profile Data Sharing */}
              {showConsent && (
                <div className="info-card">
                  <h3 className="info-card-title" style={{ marginTop: 0 }}>Profile Data Sharing</h3>
                  <p className="info-card-desc">
                    {consent.status === 'ACTIVE'
                      ? 'Profile data sharing is On. You have agreed to share your profile details with the course administrator.'
                      : 'Profile data sharing is Off. You have not agreed to share your profile details with the course administrator.'}
                  </p>
                  <div className="info-card-footer">
                    {consent.lastUpdatedOn && (
                      <span className="info-card-date">
                        Last updated on {new Date(consent.lastUpdatedOn).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      className="btn-link"
                      onClick={() => {
                        setConsentChecked(false);
                        setIsConsentModalOpen(true);
                      }}
                      disabled={consent.isUpdating}
                    >
                      {consent.isUpdating ? <IonSpinner name="crescent" style={{ width: 14, height: 14 }} /> : 'Update'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Course Completion Dialog */}
            <CourseCompletionDialog
              progressPercentage={enrollment.progressProps.percentage}
              isEnrolled={enrollment.isEnrolled}
              isEnrollmentLoading={enrollment.isLoading}
              isViewActive={isViewActive}
              collectionId={collectionId}
              hasCertificate={enrollment.hasCertificate}
              progressBeforePlayer={progressBeforePlayerRef.current}
            />

            {/* Task 4: Certificate Preview Modal (in-app) */}
            <IonModal
              isOpen={isCertPreviewOpen}
              onDidDismiss={() => setIsCertPreviewOpen(false)}
              className="cp-cert-preview-modal"
            >
              <div className="cp-cert-preview-content">
                <div className="cp-cert-preview-header">
                  <h2 className="cp-cert-preview-title">Preview Certificate</h2>
                  <button className="cp-cert-preview-close" onClick={() => setIsCertPreviewOpen(false)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="var(--ion-color-dark, #333)" />
                    </svg>
                  </button>
                </div>
                <div className="cp-cert-preview-body">
                  {enrollment.certPreviewUrl && (
                    <img
                      src={enrollment.certPreviewUrl}
                      alt="Certificate Preview"
                      className="cp-cert-preview-img"
                    />
                  )}
                </div>
              </div>
            </IonModal>

            {/* Leave Course Confirmation Dialog */}
            <IonModal
              isOpen={showLeaveConfirm}
              onDidDismiss={() => setShowLeaveConfirm(false)}
              className="cp-completion-dialog"
            >
              <div className="cp-completion-dialog-content">
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.75rem', color: 'var(--ion-color-dark)' }}>
                  Leave Course
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--ion-color-medium)', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
                  Are you sure you want to leave this course? Your progress will be lost.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    className="cp-completion-dialog-btn"
                    style={{ background: '#fff', border: '1px solid var(--ion-color-primary)', color: 'var(--ion-color-primary)', flex: 1 }}
                    onClick={() => setShowLeaveConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="cp-completion-dialog-btn"
                    style={{ background: 'var(--ion-color-primary)', border: '1px solid var(--ion-color-primary)', color: '#fff', opacity: isLeaving ? 0.6 : 1, flex: 1 }}
                    onClick={handleLeaveCourse}
                    disabled={isLeaving}
                  >
                    {isLeaving ? <IonSpinner name="crescent" style={{ width: 14, height: 14 }} /> : 'Leave'}
                  </button>
                </div>
              </div>
            </IonModal>

            {/* Consent Modal */}
            <IonModal
              isOpen={isConsentModalOpen}
              onDidDismiss={() => setIsConsentModalOpen(false)}
              className="cp-consent-modal"
              initialBreakpoint={0.65}
              breakpoints={[0, 0.65, 1]}
            >
              <div className="cp-consent-modal-wrap" style={{ padding: '1.5rem', background: 'var(--ion-background-color, #fff)', color: 'var(--ion-text-color, #000)', flex: 1, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--ion-color-light-shade, #eee)', paddingBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--ion-text-color)' }}>Profile Data Sharing</h2>
                  <button onClick={() => setIsConsentModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', lineHeight: 1, color: 'var(--ion-color-medium)' }}>&times;</button>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--ion-color-dark)', lineHeight: '1.6' }}>
                  <p style={{ margin: '0.5rem 0' }}><strong>Name:</strong> {userProfile?.firstName || ''} {userProfile?.lastName || ''}</p>
                  <p style={{ margin: '0.5rem 0' }}><strong>State:</strong> {(userProfile as any)?.state || '-'}</p>
                  <p style={{ margin: '0.5rem 0' }}><strong>User ID:</strong> {userProfile?.id || userProfile?.userId || userId}</p>
                  <p style={{ margin: '0.5rem 0' }}><strong>Mobile Number:</strong> {(userProfile as any)?.maskedPhone || (userProfile as any)?.phone || ''}</p>
                  <p style={{ margin: '0.5rem 0' }}><strong>Email:</strong> {(userProfile as any)?.maskedEmail || (userProfile as any)?.email || ''}</p>

                  <p style={{ color: 'var(--ion-color-medium)', marginTop: '1rem', marginBottom: '1rem' }}>You can edit these details from your profile.</p>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input
                      type="checkbox"
                      id="consent-checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      style={{ marginTop: '0.2rem', accentColor: 'var(--ion-color-primary)' }}
                    />
                    <label htmlFor="consent-checkbox" style={{ fontSize: '0.9rem', color: 'var(--ion-text-color)' }}>
                      I agree to share the above profile details with the course administrator.
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      onClick={async () => {
                        await consent.updateConsent('REVOKED');
                        setIsConsentModalOpen(false);
                        setConsentToastMessage('Profile data sharing preference updated.');
                        consent.refetch();
                      }}
                      style={{ padding: '0.6rem 1rem', border: '1px solid var(--ion-color-medium-tint)', borderRadius: '8px', background: 'transparent', color: 'var(--ion-color-dark)', fontWeight: 500 }}
                    >
                      Do not share
                    </button>
                    <button
                      onClick={async () => {
                        if (consentChecked) {
                          await consent.updateConsent('ACTIVE');
                          setIsConsentModalOpen(false);
                          setConsentToastMessage('Profile data sharing preference updated.');
                          consent.refetch();
                        }
                      }}
                      disabled={!consentChecked || consent.isUpdating}
                      style={{ padding: '0.6rem 1rem', border: 'none', borderRadius: '8px', background: consentChecked ? 'var(--ion-color-primary, #D28D5D)' : 'var(--ion-color-light-shade, #ccc)', color: consentChecked ? 'var(--ion-color-primary-contrast, #fff)' : 'var(--ion-color-medium)', fontWeight: 500 }}
                    >
                      {consent.isUpdating ? <IonSpinner name="crescent" style={{ width: 14, height: 14 }} /> : 'Share'}
                    </button>
                  </div>
                </div>
              </div>
            </IonModal>

            <IonToast
              isOpen={!!consentToastMessage}
              onDidDismiss={() => setConsentToastMessage('')}
              message={consentToastMessage}
              duration={3000}
              position="top"
              color="dark"
            />


            <RelatedContent items={relatedItems} t={t} />
            <FAQSection />
            <div style={{ height: '40px' }} />
          </>
        )}
      </IonContent>

      {/* Anonymous: "Let's Get Started" → login */}
      {viewState === 'anonymous' && !isLoading && collectionData && (
        <div
          className="cp-bottom-cta"
          onClick={() => {
            router.push('/sign-in', 'forward', 'push');
          }}
        >
          <span className="cp-bottom-cta-text">{t('collection.letsGetStarted')}</span>
          <RightArrowIcon />
        </div>
      )}

      {/* Unenrolled: "Join the Course" → open batch modal (blocked for creators) */}
      {viewState === 'unenrolled' && isTrackable && !isLoading && collectionData && (
        <>
          <div
            className="cp-bottom-cta"
            onClick={() => {
              if (isCreator) {
                setToastMessage(t('collection.creatorCannotEnrol'));
              } else {
                setIsBatchModalOpen(true);
              }
            }}
          >
            <span className="cp-bottom-cta-text">{t('collection.joinTheCourse')}</span>
          </div>

          <IonModal
            isOpen={isBatchModalOpen}
            onDidDismiss={() => setIsBatchModalOpen(false)}
            initialBreakpoint={0.35}
            breakpoints={[0, 0.35]}
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
                {enrollment.batchListLoading ? (
                  <div style={{ textAlign: 'center', padding: '1rem' }}><IonSpinner name="crescent" /></div>
                ) : enrollment.batchListError ? (
                  <p style={{ color: 'var(--ion-color-danger)', textAlign: 'center' }}>
                    {enrollment.batchListError}
                  </p>
                ) : enrollment.enrollableBatches.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)' }}>
                    No batches available for enrollment.
                  </p>
                ) : (
                  <>
                    <p className="cp-batch-modal-subtitle">{t('collection.selectBatchToStart')}</p>
                    <div className="cp-batch-select-container">
                      <select
                        className="cp-batch-select"
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                      >
                        <option value="" disabled>{t('collection.selectBatch')}</option>
                        {enrollment.enrollableBatches.map((batch) => (
                          <option key={batch.identifier} value={batch.identifier}>
                            {batch.name ?? batch.identifier}
                          </option>
                        ))}
                      </select>
                      <svg className="cp-batch-select-icon" width="14" height="8" viewBox="0 0 14 8" fill="none">
                        <path d="M1 1L7 7L13 1" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </>
                )}

                {enrollment.joinError && (
                  <p style={{ color: 'var(--ion-color-danger)', fontSize: '13px', textAlign: 'center', marginTop: '8px' }}>
                    {enrollment.joinError}
                  </p>
                )}
              </div>
              <div className="cp-batch-modal-cta-wrap">
                <div
                  className="cp-batch-modal-cta"
                  onClick={handleJoinCourse}
                  style={{ opacity: (!selectedBatchId || enrollment.joinLoading) ? 0.5 : 1 }}
                >
                  {enrollment.joinLoading ? (
                    <IonSpinner name="crescent" style={{ width: 18, height: 18, color: 'white' }} />
                  ) : (
                    <span className="cp-bottom-cta-text">{t('collection.joinTheBatch')}</span>
                  )}
                </div>
              </div>
            </div>
          </IonModal>
        </>
      )}

      {/* Page-level toast (creator error, etc.) — visible across all view states */}
      <IonToast
        isOpen={!!toastMessage}
        onDidDismiss={() => setToastMessage('')}
        message={toastMessage}
        icon={warningOutline}
        duration={3500}
        position="bottom"
        color="warning"
        cssClass="cp-creator-toast"
      />
    </IonPage>
  );
};

export default CollectionPage;
