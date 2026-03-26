import React, { useState, useMemo } from 'react';
import _ from 'lodash';
import {
  IonContent,
  IonHeader,
  IonPage,
} from '@ionic/react';
import PageLoader from '../components/common/PageLoader';
import { useTranslation } from 'react-i18next';
import { useIonRouter } from '@ionic/react';
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

const COLLECTION_MIME_TYPE = 'application/vnd.ekstep.content-collection';

// ── SVG icons ──
const ChevronDownIcon = () => (
  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1L6 6L11 1" stroke="var(--ion-color-dark, #222222)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Donut chart ──
interface DonutChartProps {
  lessonsVisited: number;
  totalLessons: number;
  coursesCompleted: number;
  totalCourses: number;
}

const DonutChart: React.FC<DonutChartProps> = ({ lessonsVisited, totalLessons, coursesCompleted, totalCourses }) => {
  const size = 133;
  const cx = size / 2;
  const cy = size / 2;

  // Outer ring — lessons visited
  const outerR = 52;
  const outerStroke = 10;
  const outerCirc = 2 * Math.PI * outerR;
  const outerRatio = _.clamp(totalLessons > 0 ? lessonsVisited / totalLessons : 0, 0, 1);
  const outerOffset = outerCirc * (1 - outerRatio);

  // Inner ring — courses completed
  const innerR = 32;
  const innerStroke = 10;
  const innerCirc = 2 * Math.PI * innerR;
  const innerRatio = _.clamp(totalCourses > 0 ? coursesCompleted / totalCourses : 0, 0, 1);
  const innerOffset = innerCirc * (1 - innerRatio);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* Outer track */}
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={outerStroke} />
      {/* Outer fill — lessons */}
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
      {/* Inner fill — courses completed */}
      <circle
        cx={cx} cy={cy} r={innerR}
        fill="none" stroke="var(--ion-color-primary-tint)" strokeWidth={innerStroke}
        strokeDasharray={innerCirc}
        strokeDashoffset={innerOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Center text */}
      <text x={cx} y={cx + 5} textAnchor="middle" fill="var(--ion-color-dark, #222222)"
        style={{ fontFamily: 'var(--ion-font-family)' }} fontSize="20" fontWeight="700">
        {lessonsVisited}
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

  const handleNavigate = () => collectionId && router.push(`/collection/${collectionId}`);

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

// ── Page ──
const MyLearningPage: React.FC = () => {
  useImpression({ pageid: 'MyLearningPage', env: 'profile' });
  const [activeTab, setActiveTab] = useState<Tab>('activeCourses');
  const { t } = useTranslation();
  const { isAuthenticated, userId } = useAuth();
  const router = useIonRouter();

  const {
    data: enrollmentData,
    isLoading,
    error,
    refetch,
  } = useUserEnrollmentList(userId, { enabled: isAuthenticated });

  const enrolledCourses: TrackableCollection[] = _.get(enrollmentData, 'data.courses', []);
  const enrolledCourseIds = _.compact(_.map(enrolledCourses, c => c.collectionId || c.courseId));

  // Tab filtering
  const now = new Date();
  const activeCourses = _.filter(enrolledCourses, c => {
    if ((c.completionPercentage ?? 0) >= 100) return false;
    const startDate = _.get(c, 'batch.startDate');
    return !startDate || new Date(startDate) <= now;
  });
  const completedCourses = _.filter(enrolledCourses, c => c.completionPercentage === 100);
  const upcomingCourses = _.filter(enrolledCourses, c => {
    if ((c.completionPercentage ?? 0) > 0) return false;
    const startDate = _.get(c, 'batch.startDate');
    return startDate && new Date(startDate) > now;
  });

  // Progress metrics
  const lessonsVisited = _.sumBy(enrolledCourses, c => c.progress || 0);
  const totalLessons = _.sumBy(enrolledCourses, c => c.leafNodesCount || 0);
  const coursesCompleted = _.filter(enrolledCourses, c => c.completionPercentage === 100).length;
  const totalCourses = _.size(enrolledCourses);

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
      case 'activeCourses': return t('noActiveCourses');
      case 'completed': return t('noCompletedCourses');
      case 'upcoming': return t('noUpcomingCourses');
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
          <div className="my-learning__sign-in">
            <p className="my-learning__sign-in-message">{t('signInToAccess')}</p>
            <button
              className="my-learning__sign-in-button"
              onClick={() => router.push('/sign-in', 'forward', 'push')}
            >
              {t('signIn')}
            </button>
          </div>
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
            <button className="my-learning__icon-btn" aria-label={t('notifications')} disabled>
              <svg width="16" height="16" viewBox="0 0 16 20" fill="none" stroke="var(--ion-color-primary)" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 20C9.1 20 10 19.1 10 18H6C6 19.1 6.9 20 8 20ZM14 14V9C14 5.93 12.37 3.36 9.5 2.68V2C9.5 1.17 8.83 0.5 8 0.5C7.17 0.5 6.5 1.17 6.5 2V2.68C3.64 3.36 2 5.92 2 9V14L0 16V17H16V16L14 14Z" />
              </svg>
            </button>
            <QRScanButton />
            <LanguageSelector />
          </div>
        </div>

        {/* Courses heading */}
        <div className="my-learning__heading-wrapper">
          <div className="my-learning__heading-btn" role="heading" aria-level={2}>
            <span className="my-learning__heading-text">{t('courses')}</span>
            <ChevronDownIcon />
          </div>
        </div>

        {/* Tab bar */}
        <div className="my-learning__tab-bar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`my-learning__tab ${activeTab === tab ? 'my-learning__tab--active' : ''}`}
            >
              {t(tab)}
            </button>
          ))}
        </div>
      </IonHeader>

      <IonContent className="my-learning__content" style={{ '--background': 'var(--ion-color-step-50, var(--color-f4f4f4, #f4f4f4))' } as React.CSSProperties}>
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
                    key={course.collectionId || course.courseId || course.batchId}
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
                  {t('viewMoreCourses')}
                </button>
              </div>
            )}

            {/* Learning Progress */}
            <div className="my-learning__progress-section">
              <div className="my-learning__progress-card">
                <h3 className="my-learning__progress-title">{t('learningProgress')}</h3>
                <div className="my-learning__progress-body">
                  <DonutChart
                    lessonsVisited={lessonsVisited}
                    totalLessons={totalLessons}
                    coursesCompleted={coursesCompleted}
                    totalCourses={totalCourses}
                  />
                  <div className="my-learning__progress-metrics">
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
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Content */}
            <RecommendedSection enrolledCourseIds={enrolledCourseIds} />
          </>
        )}

        <div className="my-learning__bottom-spacer" />
      </IonContent>

      <BottomNavigation />
    </IonPage>
  );
};

export default MyLearningPage;
