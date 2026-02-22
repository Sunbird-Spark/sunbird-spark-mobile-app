import React from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { PublicWelcomeHeader } from '../components/home/PublicWelcomeHeader';
import { WelcomeHeader } from '../components/home/WelcomeHeader';
import { HeroSection } from '../components/home/HeroSection';
import { StatsBar } from '../components/home/StatsBar';
import { ContentCardCarousel, ContentCardItem } from '../components/home/ContentCardCarousel';
import { CategoriesGrid } from '../components/home/CategoriesGrid';
import { ResourceCenter } from '../components/home/ResourceCenter';
import { FAQSection } from '../components/home/FAQSection';
import QuickActions from '../components/home/QuickActions';
import { useAuth } from '../contexts/AuthContext';
import { getInProgressCourses, courses } from '../data/mockData';
import CourseCard from '../components/courses/CourseCard';

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

const HomePage: React.FC = () => {
  const { i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const dir = i18n.dir();
  const inProgressCourses = getInProgressCourses();

  return (
    <IonPage>
      <IonHeader>
        {isAuthenticated ? <WelcomeHeader /> : <PublicWelcomeHeader />}
      </IonHeader>

      <IonContent fullscreen>
        {/* Authenticated: Quick Actions */}
        {isAuthenticated && (
          <div className="ion-padding ion-margin-bottom">
            <h2 className="ion-padding-start">Quick Actions</h2>
            <QuickActions />
          </div>
        )}

        {/* Authenticated: Continue Learning */}
        {isAuthenticated && inProgressCourses.length > 0 && (
          <div className="ion-padding ion-margin-bottom">
            <h2>Continue Learning</h2>
            {inProgressCourses.slice(0, 2).map((course) => (
              <CourseCard key={course.id} course={course} variant="horizontal" />
            ))}
          </div>
        )}

        {/* Public Homepage Sections */}
        <HeroSection />
        <StatsBar />
        <ContentCardCarousel title="Most Popular Content" items={mostPopularItems} />
        <CategoriesGrid />
        <ResourceCenter />
        <ContentCardCarousel title="Most Viewed Content" items={mostViewedItems} />
        <ContentCardCarousel title="Trending Content" items={trendingItems} />
        <FAQSection />

        {/* Bottom spacing for navigation */}
        <div style={{ height: '100px' }} />
      </IonContent>

      <BottomNavigation />
    </IonPage>
  );
};

export default HomePage;
