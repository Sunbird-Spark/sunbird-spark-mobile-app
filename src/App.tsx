import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useEffect } from 'react';
import { Redirect, Route, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppInitializer } from './AppInitializer';
import { useAppInitialized } from './hooks/useAppInitialized';
import PageLoader from './components/common/PageLoader';
import Dashboard from './pages/Dashboard';
import Home from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import CoursesPage from './pages/CoursesPage';
import DownloadsPage from './pages/DownloadsPage';
import ProfilePage from './pages/ProfilePage';
import ScanPage from './pages/ScanPage';
import PersonalDetailsPage from './pages/PersonalDetailsPage';
import MyLearningPage from './pages/MyLearningPage';
import DownloadedContentsPage from './pages/DownloadedContentsPage';
import HelpAndSupportPage from './pages/HelpAndSupportPage';
import FaqDetailPage from './pages/FaqDetailPage';
import SignInPage from './pages/SignInPage';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/display.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';

/* Theme variables */
import './theme/variables.css';
import './theme/overrides.css';
import VideoContentPage from './pages/VideoContentPage';
import SearchPage from './pages/SearchPage';
import CourseDetailsPage from './pages/CourseDetailsPage';
import CollectionPage from './pages/CollectionPage';
import ContentPlayerPage from './pages/ContentPlayerPage';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';
import ProfileLearningPage from './pages/ProfileLearningPage';
import SettingsPage from './pages/SettingsPage';
import BackButtonHandler from './components/common/BackButtonHandler';

setupIonicReact();

/** Redirects to /terms-and-conditions when TnC is pending after login */
const TnCGuard: React.FC = () => {
  const { needsTnC } = useAuth();
  const location = useLocation();

  if (needsTnC && location.pathname !== '/terms-and-conditions') {
    return <Redirect to="/terms-and-conditions" />;
  }
  return null;
};

const App: React.FC = () => {
  const isInitialized = useAppInitialized();

  useEffect(() => {
    AppInitializer.init().catch((error) => {
      console.error('App: Failed to initialize application:', error);
    });
  }, []);

  if (!isInitialized) {
    return (
      <IonApp>
        <PageLoader />
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter>
        <TnCGuard />
        <BackButtonHandler />
        <IonRouterOutlet>
          <Route exact path="/search">
            <SearchPage />
          </Route>
          <Route exact path="/explore">
            <ExplorePage />
          </Route>
          <Route exact path="/home">
            <Home />
          </Route>
          <Route exact path="/courses">
            <CoursesPage />
          </Route>
          <Route exact path="/scan">
            <ScanPage />
          </Route>
          <Route exact path="/downloads">
            <DownloadsPage />
          </Route>
          <Route exact path="/profile">
            <ProfilePage />
          </Route>
          <Route exact path="/profile/personal-details">
            <PersonalDetailsPage />
          </Route>
          <Route exact path="/profile/my-learning">
            <MyLearningPage />
          </Route>
          <Route exact path="/profile/learning">
            <ProfileLearningPage />
          </Route>
          <Route exact path="/profile/downloaded-contents">
            <DownloadedContentsPage />
          </Route>
          <Route exact path="/profile/settings">
            <SettingsPage />
          </Route>
          <Route exact path="/support">
            <HelpAndSupportPage />
          </Route>
          <Route exact path="/support/:category">
            <FaqDetailPage />
          </Route>
          <Route exact path="/dashboard">
            <Dashboard />
          </Route>
          <Route exact path="/video/:id">
            <VideoContentPage />
          </Route>
          <Route exact path="/course-details">
            <CourseDetailsPage />
          </Route>
          <Route exact path="/collection/:collectionId">
            <CollectionPage />
          </Route>
          <Route exact path="/content/:contentId">
            <ContentPlayerPage />
          </Route>
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
          <Route exact path="/sign-in">
            <SignInPage />
          </Route>
          <Route exact path="/terms-and-conditions">
            <TermsAndConditionsPage />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
