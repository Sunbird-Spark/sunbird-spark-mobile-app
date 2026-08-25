import React, { useState, useMemo, useEffect } from 'react';
import _ from 'lodash';
import {
  IonContent,
  IonHeader,
  IonPage,
  useIonViewDidEnter,
} from '@ionic/react';
import PageLoader from '../components/common/PageLoader';
import { useTranslation } from 'react-i18next';
import { useIonRouter } from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { saveReturnTo } from '../utils/returnTo';
import { FaArrowRightLong } from 'react-icons/fa6';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { QRScanButton } from '../components/common/QRScanButton';
import { useAuth } from '../contexts/AuthContext';
import { useUserEnrollmentList } from '../hooks/useUserEnrollment';
import { useContentSearch } from '../hooks/useContentSearch';
import type { TrackableCollection } from '../types/collectionTypes';
import type { ContentSearchItem } from '../types/contentTypes';
import CollectionCard from '../components/content/CollectionCard';
import ResourceCard from '../components/content/ResourceCard';
import { getPlaceholderImage } from '../utils/placeholderImages';
import './MyLearningPage.css';
import useImpression from '../hooks/useImpression';
import { parseCourseContextId } from '../services/viewer/summaryMapper';
import { getContentDetailPath } from '../utils/getContentDetailPath';
import { isLearningPathCategory } from '../utils/isLearningPath';
import { applyLearningPathProgress } from '../utils/applyLearningPathProgress';
import { useViewerSummary } from '../hooks/useViewerSummary';
import { useMySkills } from '../hooks/useMySkills';

const COLLECTION_MIME_TYPE = 'application/vnd.ekstep.content-collection';

// ── SVG icons ──
const ChevronDownIcon = () => (
  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1L6 6L11 1" stroke="var(--ion-color-dark, #222222)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Donut chart ──
/**
 * Two concentric progress rings with a count in the middle. Deliberately
 * metric-agnostic: the Courses tab feeds it lessons/courses, the Learning Paths
 * tab feeds it paths/skills (see `LEARNING_PROGRESS_METRICS` below), so the
 * same chart serves both without a second copy.
 */
interface DonutChartProps {
  outerValue: number;
  outerTotal: number;
  innerValue: number;
  innerTotal: number;
  /** Number shown in the middle. */
  centerValue: number;
  innerColor: string;
  ariaLabel: string;
}

const DonutChart: React.FC<DonutChartProps> = ({
  outerValue,
  outerTotal,
  innerValue,
  innerTotal,
  centerValue,
  innerColor,
  ariaLabel,
}) => {
  const size = 133;
  const cx = size / 2;
  const cy = size / 2;

  const outerR = 52;
  const outerStroke = 10;
  const outerCirc = 2 * Math.PI * outerR;
  const outerRatio = _.clamp(outerTotal > 0 ? outerValue / outerTotal : 0, 0, 1);
  const outerOffset = outerCirc * (1 - outerRatio);

  const innerR = 32;
  const innerStroke = 10;
  const innerCirc = 2 * Math.PI * innerR;
  const innerRatio = _.clamp(innerTotal > 0 ? innerValue / innerTotal : 0, 0, 1);
  const innerOffset = innerCirc * (1 - innerRatio);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }} role="img" aria-label={ariaLabel}>
      {/* Outer track */}
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={outerStroke} />
      {/* Outer fill */}
      <circle
        cx={cx} cy={cy} r={outerR}
        fill="none" stroke="var(--ion-color-primary)" strokeWidth={outerStroke}
        strokeDasharray={outerCirc}
        strokeDashoffset={outerOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Inner track */}
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={innerStroke} />
      {/* Inner fill */}
      <circle
        cx={cx} cy={cy} r={innerR}
        fill="none" stroke={innerColor} strokeWidth={innerStroke}
        strokeDasharray={innerCirc}
        strokeDashoffset={innerOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Center text */}
      <text x={cx} y={cx + 5} textAnchor="middle" fill="var(--ion-color-dark, #222222)"
        style={{ fontFamily: 'var(--ion-font-family)' }} fontSize="20" fontWeight="700">
        {centerValue}
      </text>
    </svg>
  );
};

// ── Course card ──
interface CourseCardItemProps {
  course: TrackableCollection;
}

const CourseCardItem: React.FC<CourseCardItemProps> = ({ course }) => {
  const { t } = useTranslation();
  const router = useIonRouter();

  const collectionId = course.collectionId || course.courseId;
  const title = course.courseName || _.get(course, 'content.name', 'Untitled Course');
  const thumbnail = _.get(course, 'content.posterImage') || _.get(course, 'content.appIcon', '');
  const progress = _.clamp(Math.round(course.completionPercentage ?? 0), 0, 100);

  const handleNavigate = () => collectionId && router.push(getContentDetailPath(collectionId, course.content?.primaryCategory));

  return (
    <div
      className="my-learning__card"
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNavigate();
        }
      }}>
      <div className="my-learning__card-thumbnail">
        <img src={thumbnail || getPlaceholderImage(collectionId || 'default')} alt={title} />
      </div>

      <div className="my-learning__card-content">
        <div className="my-learning__card-top">
          <p className="my-learning__card-title">{title}</p>
        </div>
        <div className="my-learning__card-bottom">
          <p className="my-learning__card-progress-text">
            {t('completedPercent', { percent: progress })}
          </p>
          <div className="my-learning__card-progress-row">
            <div className="my-learning__progress-bar-track">
              <div className="my-learning__progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Recommended section ──
const RecommendedSection: React.FC<{ enrolledCourseIds: string[] }> = ({ enrolledCourseIds }) => {
  const { t } = useTranslation();
  const router = useIonRouter();
  const { data, isLoading } = useContentSearch({
    request: {
      filters: { status: ['Live'], objectType: ['Content'] },
      sort_by: { lastUpdatedOn: 'desc' },
      limit: 10,
    },
  });

  const recommended = useMemo(() => {
    const content: ContentSearchItem[] = _.get(data, 'data.content', []);
    return _.take(
      _.reject(content, item => _.includes(enrolledCourseIds, item.identifier)),
      3
    );
  }, [data, enrolledCourseIds]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (_.isEmpty(recommended)) return null;

  return (
    <section className="content-carousel-section">
      <div className="content-carousel-header">
        <h2 className="content-carousel-title">
          {t('recommendedContent')}
          <button
            className="content-carousel-arrow-inline"
            onClick={() => router.push('/explore', 'forward', 'push')}
            aria-label={t('viewAll')}
          >
            <FaArrowRightLong />
          </button>
        </h2>
      </div>
      <div className="content-carousel-scroll">
        {recommended.map((item) =>
          item.mimeType === COLLECTION_MIME_TYPE
            ? <CollectionCard key={item.identifier} item={item} />
            : <ResourceCard key={item.identifier} item={item} />
        )}
      </div>
    </section>
  );
};

// ── Types ──
type Tab = 'activeCourses' | 'completed' | 'upcoming';
type ContentType = 'courses' | 'learningPaths';

// ── Page ──
const MyLearningPage: React.FC = () => {
  useImpression({ pageid: 'MyLearningPage', env: 'profile' });
  const [activeTab, setActiveTab] = useState<Tab>('activeCourses');
  const [contentType, setContentType] = useState<ContentType>('courses');
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('pageTitle.myLearning')}`;
  }, [t]);

  const { isAuthenticated, userId } = useAuth();
  const router = useIonRouter();
  const location = useLocation();

  const {
    data: enrollmentData,
    isLoading,
    error,
    refetch,
  } = useUserEnrollmentList(userId, { enabled: isAuthenticated });
  const { data: viewerSummaryRecords = [] } = useViewerSummary();

  useIonViewDidEnter(() => {
    refetch();
  });

  // A Learning Path enrolment fans out one record per inner course under a
  // composite "<lpBatchId>:<courseId>" batchId (see services/viewer/summaryMapper.ts) —
  // those must be excluded here or they'd surface as phantom enrolled courses.
  const allEnrolledItems: TrackableCollection[] = _.filter(
    _.get(enrollmentData, 'data.courses', []),
    (c: TrackableCollection) => !parseCourseContextId(c.batchId)
  );
  const enrolledCourseIds = _.compact(_.map(allEnrolledItems, c => c.collectionId || c.courseId));

  // Partition by content type for the Courses | Learning Paths switcher.
  const enrolledCourses: TrackableCollection[] = _.filter(
    allEnrolledItems,
    (c) => !isLearningPathCategory(c.content?.primaryCategory)
  );
  const enrolledLearningPaths: TrackableCollection[] = applyLearningPathProgress(
    _.filter(allEnrolledItems, (c) => isLearningPathCategory(c.content?.primaryCategory)),
    viewerSummaryRecords
  );
  const itemsForActiveType = contentType === 'courses' ? enrolledCourses : enrolledLearningPaths;

  // Tab filtering
  const now = new Date();
  const activeCourses = _.filter(itemsForActiveType, c => {
    if ((c.completionPercentage ?? 0) >= 100) return false;
    const startDate = _.get(c, 'batch.startDate');
    return !startDate || new Date(startDate) <= now;
  });
  const completedCourses = _.filter(itemsForActiveType, c => c.completionPercentage === 100);
  const upcomingCourses = _.filter(itemsForActiveType, c => {
    if ((c.completionPercentage ?? 0) > 0) return false;
    const startDate = _.get(c, 'batch.startDate');
    return startDate && new Date(startDate) > now;
  });

  // Progress metrics — reflect whichever type (Courses | Learning Paths) is currently selected.
  // c.progress is a raw server counter that can exceed leafNodesCount (counts interactions,
  // not unique content items). Derive visited count from completionPercentage × leafNodesCount
  // so it is always consistent and never exceeds the total.
  const lessonsVisited = _.sumBy(itemsForActiveType, c => {
    const pct = _.clamp(c.completionPercentage ?? 0, 0, 100) / 100;
    return Math.round((c.leafNodesCount ?? 0) * pct);
  });
  const totalLessons = _.sumBy(itemsForActiveType, c => c.leafNodesCount ?? 0);
  const coursesCompleted = _.filter(itemsForActiveType, c => c.completionPercentage === 100).length;
  const totalCourses = _.size(itemsForActiveType);

  // Learning Paths get their own pair of metrics: skills gained and paths
  // completed. Skills live only in each path's hierarchy, so this is gated to
  // the Learning Paths tab — see the `enabled` note in `useMySkills`.
  const isLearningPathType = contentType === 'learningPaths';
  const mySkills = useMySkills({ enabled: isLearningPathType });
  const pathsCompleted = mySkills.aggregate.pathsCompleted;
  const totalPaths = mySkills.totalCount;
  const skillsGained = mySkills.aggregate.gainedSkills;
  const totalSkills = mySkills.aggregate.totalSkills;

  // Tab content
  const getTabCourses = (): TrackableCollection[] => {
    switch (activeTab) {
      case 'activeCourses': return activeCourses;
      case 'completed': return completedCourses;
      case 'upcoming': return upcomingCourses;
      default: return [];
    }
  };

  const getEmptyMessage = (): string => {
    switch (activeTab) {
      case 'activeCourses': return t(isLearningPathType ? 'noActiveLearningPaths' : 'noActiveCourses');
      case 'completed': return t(isLearningPathType ? 'noCompletedLearningPaths' : 'noCompletedCourses');
      case 'upcoming': return t(isLearningPathType ? 'noUpcomingLearningPaths' : 'noUpcomingCourses');
      default: return '';
    }
  };

  const tabs: Tab[] = ['activeCourses', 'completed', 'upcoming'];
  const tabCourses = getTabCourses();

  // Unauthenticated guard
  if (!isAuthenticated) {
    return (
      <IonPage className="my-learning-page">
        <IonHeader className="ion-no-border">
          <div className="my-learning__header">
            <span className="my-learning__header-title">{t('myLearning')}</span>
            <div className="my-learning__header-actions">
              <QRScanButton />
              <LanguageSelector />
            </div>
          </div>
        </IonHeader>
        <IonContent className="my-learning__content" style={{ '--background': 'var(--ion-color-step-50, var(--color-f4f4f4, #f4f4f4))' } as React.CSSProperties}>
          <main id="main-content">
          <div className="my-learning__sign-in">
            <p className="my-learning__sign-in-message">{t('signInToAccess')}</p>
            <button
              className="my-learning__sign-in-button"
              onClick={() => { saveReturnTo(location.pathname + location.search); router.push('/sign-in', 'forward', 'push'); }}
            >
              {t('signIn')}
            </button>
          </div>
          </main>
        </IonContent>
        <BottomNavigation />
      </IonPage>
    );
  }

  return (
    <IonPage className="my-learning-page">
      <IonHeader className="ion-no-border">
        <div className="my-learning__header">
          <span className="my-learning__header-title">{t('myLearning')}</span>
          <div className="my-learning__header-actions">
            <QRScanButton />
            <LanguageSelector />
          </div>
        </div>

        {/* Courses heading */}
        <div className="my-learning__heading-wrapper">
          <div className="my-learning__heading-btn" role="heading" aria-level={2}>
            <span className="my-learning__heading-text">{t(contentType === 'courses' ? 'courses' : 'learningPaths')}</span>
            <ChevronDownIcon />
          </div>
        </div>

        {/* Content type switcher — only shown once the learner has at least one enrolled Learning Path */}
        {enrolledLearningPaths.length > 0 && (
          <div className="my-learning__tab-bar" role="tablist" aria-label={t('learningPaths')}>
            {(['courses', 'learningPaths'] as ContentType[]).map((type) => (
              <button
                key={type}
                onClick={() => { setContentType(type); setActiveTab('activeCourses'); }}
                className={`my-learning__tab ${contentType === type ? 'my-learning__tab--active' : ''}`}
                role="tab"
                aria-selected={contentType === type}
              >
                {t(type === 'courses' ? 'courses' : 'learningPaths')}
              </button>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="my-learning__tab-bar" role="tablist" aria-label={t(isLearningPathType ? 'learningPaths' : 'courses')}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`my-learning__tab ${activeTab === tab ? 'my-learning__tab--active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab}
            >
              {/* Only the first tab names the content type ("Active Courses" vs
                  "Active Learning Paths"); Completed/Upcoming read the same for both. */}
              {t(tab === 'activeCourses' && isLearningPathType ? 'activeLearningPaths' : tab)}
            </button>
          ))}
        </div>
      </IonHeader>

      <IonContent className="my-learning__content" style={{ '--background': 'var(--ion-color-step-50, var(--color-f4f4f4, #f4f4f4))' } as React.CSSProperties}>
        <main id="main-content">
        {isLoading ? (
          <PageLoader message={t('loading')} />
        ) : error ? (
          <PageLoader error={error.message} onRetry={() => refetch()} />
        ) : (
          <>

            {/* Tab content */}
            {_.isEmpty(tabCourses) ? (
              <p className="my-learning__empty">{getEmptyMessage()}</p>
            ) : (
              <div className="my-learning__course-list">
                {tabCourses.map((course) => (
                  <CourseCardItem
                    key={course.batchId ? `${course.courseId}-${course.batchId}` : course.courseId}
                    course={course}
                  />
                ))}
              </div>
            )}

            {/* View more link */}
            {activeTab === 'activeCourses' && !_.isEmpty(tabCourses) && (
              <div className="my-learning__view-more">
                <button
                  className="my-learning__view-more-link"
                  onClick={() => router.push('/explore', 'forward', 'push')}
                >
                  {t(isLearningPathType ? 'viewMoreLearningPaths' : 'viewMoreCourses')}
                </button>
              </div>
            )}

            {/* Learning Progress */}
            <div className="my-learning__progress-section">
              <div className="my-learning__progress-card">
                <h3 className="my-learning__progress-title">{t('learningProgress')}</h3>
                <div className="my-learning__progress-body">
                  <DonutChart
                    outerValue={isLearningPathType ? pathsCompleted : lessonsVisited}
                    outerTotal={isLearningPathType ? totalPaths : totalLessons}
                    innerValue={isLearningPathType ? skillsGained : coursesCompleted}
                    innerTotal={isLearningPathType ? totalSkills : totalCourses}
                    centerValue={isLearningPathType ? skillsGained : lessonsVisited}
                    innerColor={isLearningPathType ? 'var(--color-gold)' : 'var(--ion-color-primary-tint)'}
                    ariaLabel={
                      isLearningPathType
                        ? t('skillsRingLabel', {
                            gained: skillsGained,
                            total: totalSkills,
                            completed: pathsCompleted,
                            totalPaths,
                          })
                        : t('donutChartLabel', { visited: lessonsVisited, total: totalLessons })
                    }
                  />
                  <div className="my-learning__progress-metrics">
                    {isLearningPathType ? (
                      <>
                        <div className="my-learning__metric-row">
                          <div className="my-learning__metric-indicator" style={{ backgroundColor: 'var(--color-gold)' }} />
                          <span className="my-learning__metric-value">{skillsGained}/{totalSkills}</span>
                          <span className="my-learning__metric-label">{t('skillsGained')}</span>
                        </div>
                        <div className="my-learning__metric-row">
                          <div className="my-learning__metric-indicator" style={{ backgroundColor: 'var(--ion-color-primary)' }} />
                          <span className="my-learning__metric-value">{pathsCompleted}/{totalPaths}</span>
                          <span className="my-learning__metric-label">{t('learningPathsCompleted')}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="my-learning__metric-row">
                          <div className="my-learning__metric-indicator" style={{ backgroundColor: 'var(--ion-color-primary)' }} />
                          <span className="my-learning__metric-value">{lessonsVisited}/{totalLessons}</span>
                          <span className="my-learning__metric-label">{t('lessonsVisited')}</span>
                        </div>
                        <div className="my-learning__metric-row">
                          <div className="my-learning__metric-indicator" style={{ backgroundColor: 'var(--ion-color-primary-tint)' }} />
                          <span className="my-learning__metric-value">{coursesCompleted}/{totalCourses}</span>
                          <span className="my-learning__metric-label">{t('coursesCompleted')}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Content */}
            <RecommendedSection enrolledCourseIds={enrolledCourseIds} />
          </>
        )}

        <div className="my-learning__bottom-spacer" />
        </main>
      </IonContent>

      <BottomNavigation />
    </IonPage>
  );
};

export default MyLearningPage;
