import React from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { PublicWelcomeHeader } from '../components/home/PublicWelcomeHeader';
import { HeroSection } from '../components/home/HeroSection';
import { StatsBar } from '../components/home/StatsBar';
import { ContentCardCarousel, ContentCardItem } from '../components/home/ContentCardCarousel';
import { CategoriesGrid } from '../components/home/CategoriesGrid';
import { FAQSection } from '../components/home/FAQSection';
import { useAuth } from '../contexts/AuthContext';
import { courses } from '../data/mockData';
import { LearningGreeting } from '../components/home/learning-started/LearningGreeting';
import { LearningStatsGrid } from '../components/home/learning-started/LearningStatsGrid';
import { ContinueLearningCard } from '../components/home/learning-started/ContinueLearningCard';
import { PerformanceChart } from '../components/home/learning-started/PerformanceChart';
import { InProgressContents } from '../components/home/learning-started/InProgressContents';
import { useLandingPageConfig } from '../hooks/useLandingPageConfig';
import { ContentSectionWrapper } from '../components/landing/ContentSectionWrapper';
import { ResourcesSectionWrapper } from '../components/landing/ResourcesSectionWrapper';

// Transform mock data for authenticated view
const recommendedItems: ContentCardItem[] = courses.slice(0, 4).map((c) => ({
  id: c.id,
  title: c.title,
  thumbnail: c.thumbnail,
  tag: 'Course',
  rating: c.rating,
  lessons: c.lessons,
}));

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

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { sections, isLoading } = useLandingPageConfig();
  const { t } = useTranslation();

  return (
    <IonPage>
      <IonHeader>
        <PublicWelcomeHeader />
      </IonHeader>

      <IonContent fullscreen>
        {isAuthenticated ? (
          /* ── Learning Started View ── */
          <>
            <LearningGreeting />
            <LearningStatsGrid />
            <ContinueLearningCard />
            <PerformanceChart />
            <InProgressContents />
            <ContentCardCarousel title={t('recommendedContent')} items={recommendedItems} />
          </>
        ) : (
          /* ── Public Home View ── */
          <>
            <HeroSection />
            <StatsBar />

            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <IonSpinner name="crescent" />
              </div>
            ) : (
              sections.map(renderSection)
            )}

            <FAQSection />
          </>
        )}

        {/* Bottom spacing for navigation */}
        <div style={{ height: '100px' }} />
      </IonContent>

      <BottomNavigation />
    </IonPage>
  );
};

export default HomePage;
