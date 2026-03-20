import React, { useMemo } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
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
import { useUserEnrollmenList } from '../hooks/useUserEnrollment';
import { useUserCertificates } from '../hooks/useUserCertificates';
import { useContentSearch } from '../hooks/useContentSearch';
import { useLandingPageConfig } from '../hooks/useLandingPageConfig';
import { ContentSectionWrapper } from '../components/landing/ContentSectionWrapper';
import { ResourcesSectionWrapper } from '../components/landing/ResourcesSectionWrapper';
import type { FormReadRequest } from '../types/formTypes';
import type { ContentSearchItem } from '../types/contentTypes';
import CollectionCard from '../components/content/CollectionCard';
import ResourceCard from '../components/content/ResourceCard';

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
  const history = useHistory();
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
    const content: ContentSearchItem[] = (data?.data as any)?.content || [];
    return content
      .filter(item => !enrolledCourseIds.includes(item.identifier))
      .slice(0, 3);
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
        <h2 className="content-carousel-title">{t('recommendedContent')}</h2>
        <button
          className="content-carousel-arrow"
          onClick={() => history.push('/explore')}
          aria-label={t('viewAll')}
        >
          <svg width="13" height="9" viewBox="0 0 13 9" fill="var(--ion-color-primary)" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.5 0L7.09 1.41L9.67 4H0V6H9.67L7.09 8.59L8.5 10L13 5L8.5 0Z" transform="translate(0, -0.5)" />
          </svg>
        </button>
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
  const { isAuthenticated, userId } = useAuth();
  const { t } = useTranslation();

  // Form-driven sections for pre-enrollment view
  const { data: formData, isLoading: homeFormLoading } = useFormRead({
    request: HOME_PAGE_FORM_REQUEST,
  });
  const homeSections = useMemo(() => {
    const raw = (formData?.data as any)?.form?.data?.sections;
    if (!Array.isArray(raw)) return [];
    return [...raw].sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));
  }, [formData]);

  // Landing page sections for public view
  const { sections: landingSections, isLoading: landingLoading } = useLandingPageConfig();

  // Enrollment data
  const {
    data: enrollmentData,
    isLoading: enrollmentsLoading,
    error: enrollmentsError,
    refetch,
  } = useUserEnrollmenList(userId, { enabled: isAuthenticated });

  const enrolledCourses = enrollmentData?.data?.courses ?? [];
  const enrolledCount = enrolledCourses.length;

  // Certificate count
  const { data: certData } = useUserCertificates(isAuthenticated ? userId : null);
  const certificationsEarned = Array.isArray((certData?.data as any)) ? (certData?.data as any).length : 0;

  // Stats computation
  const coursesInProgress = enrolledCourses.filter(c => c.status === 1).length;
  const coursesCompleted = enrolledCourses.filter(c => c.status === 2).length;
  const enrolledCourseIds = enrolledCourses.map(c => c.collectionId || c.courseId || '').filter(Boolean);

  return (
    <IonPage>
      <IonHeader>
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
                <InProgressContents courses={enrolledCourses} />
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
