import React from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
} from '@ionic/react';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { PublicWelcomeHeader } from '../components/home/PublicWelcomeHeader';
import { HeroSection } from '../components/home/HeroSection';
import { StatsBar } from '../components/home/StatsBar';
import { ContentCardCarousel, ContentCardItem } from '../components/home/ContentCardCarousel';
import { CategoriesGrid } from '../components/home/CategoriesGrid';
import { ResourceCenter } from '../components/home/ResourceCenter';
import { FAQSection } from '../components/home/FAQSection';
import { useAuth } from '../hooks/useAuth';
import { courses } from '../data/mockData';
import { LearningGreeting } from '../components/home/learning-started/LearningGreeting';
import { LearningStatsGrid } from '../components/home/learning-started/LearningStatsGrid';
import { ContinueLearningCard } from '../components/home/learning-started/ContinueLearningCard';
import { PerformanceChart } from '../components/home/learning-started/PerformanceChart';
import { InProgressContents } from '../components/home/learning-started/InProgressContents';

// Transform mock data into ContentCardItem format
const toContentCardItems = (start: number, count: number): ContentCardItem[] => {
  return courses.slice(start, start + count).map((c) => ({
    id: c.id,
    title: c.title,
    thumbnail: c.thumbnail,
    tag: 'Course',
    rating: c.rating,
    lessons: c.lessons,
  }));
};

const mostPopularItems = toContentCardItems(0, 3);
const mostViewedItems = toContentCardItems(1, 3);
const trendingItems = toContentCardItems(2, 3);
const recommendedItems = toContentCardItems(0, 4);

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

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
            <ContentCardCarousel title="Recommended Content" items={recommendedItems} />
          </>
        ) : (
          /* ── Public Home View ── */
          <>
            <HeroSection />
            <StatsBar />
            <ContentCardCarousel title="Most Popular Content" items={mostPopularItems} />
            <CategoriesGrid />
            <ResourceCenter />
            <ContentCardCarousel title="Most Viewed Content" items={mostViewedItems} />
            <ContentCardCarousel title="Trending Content" items={trendingItems} />
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
