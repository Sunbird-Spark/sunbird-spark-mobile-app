import React from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
} from '@ionic/react';
import { chevronForward, chevronBack } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { PublicWelcomeHeader } from '../components/home/PublicWelcomeHeader';
import { WelcomeHeader } from '../components/home/WelcomeHeader';
import CourseCard from '../components/courses/CourseCard';
import QuickActions from '../components/home/QuickActions';
import { getFeaturedCourses, getInProgressCourses, courses } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';
import { useOrganizationSearch } from '../hooks/useOrganizationSearch';
import { AppInitializer } from '../AppInitializer';

const HomePage: React.FC = () => {
  const history = useHistory();
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const dir = i18n.dir();

  const { mutate: searchOrganizations } = useOrganizationSearch();

  // Initialize channel ID by searching for the default organization
  React.useEffect(() => {
    const initializeChannelId = () => {
      if (AppInitializer.isInitialized()) {
        searchOrganizations({
          request: { 
            filters: { 
              slug: 'sunbird', 
              isTenant: true 
            } 
          }
        });
      } else {
        setTimeout(initializeChannelId, 500);
      }
    };

    initializeChannelId();
  }, [searchOrganizations]);

  const featuredCourses = getFeaturedCourses();
  const inProgressCourses = getInProgressCourses();
  const ChevronIcon = dir === 'rtl' ? chevronBack : chevronForward;

  return (
    <IonPage>
      <IonHeader>
        {isAuthenticated ? <WelcomeHeader /> : <PublicWelcomeHeader />}
      </IonHeader>

      <IonContent fullscreen>
        <div className="ion-padding">
          {/* Quick Actions */}
          {isAuthenticated && (
            <div className="ion-margin-bottom">
              <h2 className="ion-padding-start">{t('quickActions')}</h2>
              <QuickActions />
            </div>
          )}

          {/* Continue Learning */}
          {isAuthenticated && inProgressCourses.length > 0 && (
            <div className="ion-margin-bottom">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px' }}>
                <h2>{t('continueLearning')}</h2>
                <IonButton fill="clear" size="small" onClick={() => history.push('/courses')}>
                  {t('viewAll')}
                  <IonIcon slot="end" icon={ChevronIcon} />
                </IonButton>
              </div>
              {inProgressCourses.slice(0, 2).map((course) => (
                <CourseCard key={course.id} course={course} variant="horizontal" />
              ))}
            </div>
          )}

          {/* Featured Courses */}
          <div className="ion-margin-bottom">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px' }}>
              <h2>{t('featuredCourses')}</h2>
              <IonButton fill="clear" size="small" onClick={() => history.push('/courses')}>
                {t('viewAll')}
                <IonIcon slot="end" icon={ChevronIcon} />
              </IonButton>
            </div>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '0 1rem' }}>
              {featuredCourses.map((course) => (
                <CourseCard key={course.id} course={course} variant="compact" />
              ))}
            </div>
          </div>

          {/* Browse Courses */}
          {!isAuthenticated && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px' }}>
                <h2>{t('browseCourses')}</h2>
                <IonButton fill="clear" size="small" onClick={() => history.push('/courses')}>
                  {t('viewAll')}
                  <IonIcon slot="end" icon={ChevronIcon} />
                </IonButton>
              </div>
              {courses.slice(0, 3).map((course) => (
                <CourseCard key={course.id} course={course} variant="horizontal" />
              ))}
            </div>
          )}

          {/* Add padding at bottom for navigation */}
          <div style={{ height: '80px' }}></div>
        </div>
      </IonContent>

      <BottomNavigation />
    </IonPage>
  );
};

export default HomePage;
