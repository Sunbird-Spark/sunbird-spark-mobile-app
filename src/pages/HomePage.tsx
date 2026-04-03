import React, { useMemo } from 'react';
import _ from 'lodash';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  useIonViewDidEnter,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useIonRouter } from '@ionic/react';
import { resolveLabel } from '../utils/formLocaleResolver';
import { FaArrowRightLong } from 'react-icons/fa6';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { PublicWelcomeHeader } from '../components/home/PublicWelcomeHeader';
import { HeroSection } from '../components/home/HeroSection';
import { StatsBar } from '../components/home/StatsBar';
import { CategoriesGrid } from '../components/home/CategoriesGrid';
import { FAQSection } from '../components/home/FAQSection';
import { useAuth } from '../contexts/AuthContext';
import { LearningGreeting } from '../components/home/learning-started/LearningGreeting';
import { LearningStatsGrid } from '../components/home/learning-started/LearningStatsGrid';
import { ContinueLearningCard } from '../components/home/learning-started/ContinueLearningCard';
import { InProgressContents } from '../components/home/learning-started/InProgressContents';
import { useFormRead } from '../hooks/useFormRead';
import { useUserEnrollmentList } from '../hooks/useUserEnrollment';
import { useUserCertificates } from '../hooks/useUserCertificates';
import { useContentSearch } from '../hooks/useContentSearch';
import { useLandingPageConfig } from '../hooks/useLandingPageConfig';
import { ContentSectionWrapper } from '../components/landing/ContentSectionWrapper';
import { ResourcesSectionWrapper } from '../components/landing/ResourcesSectionWrapper';
import type { FormReadRequest } from '../types/formTypes';
import type { ContentSearchItem } from '../types/contentTypes';
import CollectionCard from '../components/content/CollectionCard';
import ResourceCard from '../components/content/ResourceCard';
import useImpression from '../hooks/useImpression';

const COLLECTION_MIME_TYPE = 'application/vnd.ekstep.content-collection';

const HOME_PAGE_FORM_REQUEST: FormReadRequest = {
  type: 'page',
  subType: 'home',
  action: 'sections',
  component: 'app',
  framework: '*',
  rootOrgId: '*',
};

const CATEGORY_GRADIENTS = [
  'var(--category-gradient-1)',
  'var(--category-gradient-2)',
  'var(--category-gradient-3)',
  'var(--category-gradient-4)',
];

const renderSection = (section: any) => {
  const key = section.id || section.index?.toString() || Math.random().toString();

  switch (section.type) {
    case 'content':
      return <ContentSectionWrapper key={key} section={section} />;
    case 'categories':
      return (
        <CategoriesGrid
          key={key}
          categories={(section.list || []).map((item: any, i: number) => ({
            name: item.name || item.title || '',
            gradient: item.gradient || CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length],
          }))}
          title={section.title || section.name}
        />
      );
    case 'resources':
      return <ResourcesSectionWrapper key={key} section={section} />;
    default:
      return null;
  }
};

const RecommendedContentSection: React.FC<{ enrolledCourseIds: string[] }> = ({ enrolledCourseIds }) => {
  const { t } = useTranslation();
  const router = useIonRouter();
  const { data, isLoading } = useContentSearch({
    request: {
      filters: {
        status: ['Live'],
        objectType: ['Content'],
      },
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
    return (
      <section style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <IonSpinner name="crescent" color="primary" />
        </div>
      </section>
    );
  }

  if (recommended.length === 0) return null;

  return (
    <section className="content-carousel-section">
      <div className="content-carousel-header">
        <h2 className="content-carousel-title">
          {t('recommendedContent')}
          <button
            className="content-carousel-arrow-inline"
            onClick={() => router.push('/explore', 'root', 'replace')}
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

const HomePage: React.FC = () => {
  useImpression({ pageid: 'HomePage', env: 'home' });
  const { isAuthenticated, userId } = useAuth();
  const { t, i18n } = useTranslation();

  // Form-driven sections for pre-enrollment view
  const { data: formData, isLoading: homeFormLoading } = useFormRead({
    request: HOME_PAGE_FORM_REQUEST,
  });
  const homeSections = useMemo(() => {
    const raw = _.get(formData, 'data.form.data.sections', []);
    if (!_.isArray(raw)) return [];
    return _.sortBy(raw, (s: any) => s.index ?? 0).map((section: any) => {
      const resolved: any = {
        ...section,
        title: resolveLabel(section.title, i18n.language),
      };
      if (section.type === 'categories' && _.isArray(section.list)) {
        resolved.list = section.list.map((item: any) => ({
          ...item,
          title: resolveLabel(item.title, i18n.language),
        }));
      }
      return resolved;
    });
  }, [formData, i18n.language]);

  // Landing page sections for public view
  const { sections: landingSections, isLoading: landingLoading } = useLandingPageConfig();

  // Enrollment data
  const {
    data: enrollmentData,
    isLoading: enrollmentsLoading,
    error: enrollmentsError,
    refetch,
  } = useUserEnrollmentList(userId, { enabled: isAuthenticated });

  useIonViewDidEnter(() => {
    refetch();
  });

  const enrolledCourses = _.get(enrollmentData, 'data.courses', []);
  const enrolledCount = _.size(enrolledCourses);

  // Certificate count
  const { data: certData } = useUserCertificates(isAuthenticated ? userId : null);
  const certificationsEarned = _.size(_.get(certData, 'data', []));

  // Stats computation
  const coursesInProgress = _.filter(enrolledCourses, c => (c.completionPercentage ?? 0) < 100).length;
  const coursesCompleted = _.filter(enrolledCourses, { status: 2 }).length;
  const enrolledCourseIds = _.compact(_.map(enrolledCourses, c => c.collectionId || c.courseId));

  return (
    <IonPage className="home-page">
      <IonHeader className="ion-no-border">
        <PublicWelcomeHeader />
      </IonHeader>

      <IonContent fullscreen>
        {isAuthenticated ? (
          <>
            <LearningGreeting enrolledCount={enrolledCount} />

            {enrollmentsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <IonSpinner name="crescent" />
              </div>
            ) : enrollmentsError ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>{t('error')}</p>
                <button onClick={() => refetch()}>{t('retry') || 'Retry'}</button>
              </div>
            ) : enrolledCount === 0 ? (
              /* Pre-Enrollment: form-driven discovery */
              <>
                {homeFormLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <IonSpinner name="crescent" />
                  </div>
                ) : (
                  homeSections.map(renderSection)
                )}
                <FAQSection />
              </>
            ) : (
              /* Post-Enrollment: learning dashboard */
              <>
                <LearningStatsGrid
                  totalCourses={enrolledCount}
                  coursesInProgress={coursesInProgress}
                  coursesCompleted={coursesCompleted}
                  certificationsEarned={certificationsEarned}
                />
                <ContinueLearningCard courses={enrolledCourses} />
                {coursesInProgress !== 1 && (
                  <InProgressContents courses={enrolledCourses} />
                )}
                <RecommendedContentSection enrolledCourseIds={enrolledCourseIds} />
              </>
            )}
          </>
        ) : (
          /* Public Home View */
          <>
            <HeroSection />
            <StatsBar />
            {landingLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <IonSpinner name="crescent" />
              </div>
            ) : (
              landingSections.map(renderSection)
            )}
            <FAQSection />
          </>
        )}

        <div style={{ height: '100px' }} />
      </IonContent>

      <BottomNavigation />
    </IonPage>
  );
};

export default HomePage;
