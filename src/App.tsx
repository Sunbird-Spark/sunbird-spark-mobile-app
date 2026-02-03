import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useEffect } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { AppInitializer } from './AppInitializer';
import CoursesPage from './pages/CoursesPage';
import Dashboard from './pages/Dashboard';
import DownloadsPage from './pages/DownloadsPage';
import Home from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ScanPage from './pages/ScanPage';

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

setupIonicReact();

const App: React.FC = () => {
  useEffect(() => {
    console.log('App: Component mounted, starting initialization...');
    // Initialize all application services on startup
    AppInitializer.init()
      .then(() => {
        console.log('App: Initialization completed successfully');
      })
      .catch((error) => {
        console.error('App: Failed to initialize application:', error);
      });
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
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
          <Route exact path="/dashboard">
            <Dashboard />
          </Route>
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
