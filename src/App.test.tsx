import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonApp: ({ children }: any) => <div data-testid="ion-app">{children}</div>,
  IonIcon: ({ icon }: any) => <span data-testid="ion-icon" data-icon={icon} />,
  IonLabel: ({ children }: any) => <span data-testid="ion-label">{children}</span>,
  IonRouterOutlet: ({ children }: any) => <div data-testid="ion-router-outlet">{children}</div>,
  IonTabBar: ({ children, slot }: any) => (
    <div data-testid="ion-tab-bar" data-slot={slot}>
      {children}
    </div>
  ),
  IonTabButton: ({ children, tab, href }: any) => (
    <button data-testid={`tab-button-${tab}`} data-href={href}>
      {children}
    </button>
  ),
  IonTabs: ({ children }: any) => <div data-testid="ion-tabs">{children}</div>,
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonTitle: ({ children }: any) => <div data-testid="ion-title">{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  IonButtons: ({ children }: any) => <div data-testid="ion-buttons">{children}</div>,
  IonButton: ({ children }: any) => <button data-testid="ion-button">{children}</button>,
  IonAvatar: ({ children }: any) => <div data-testid="ion-avatar">{children}</div>,
  IonBackButton: ({ defaultHref }: any) => <button data-testid="ion-back-button" data-href={defaultHref}>Back</button>,
  IonSpinner: ({ name }: any) => <span data-testid="ion-spinner" data-name={name} />,
  IonImg: ({ src, alt }: any) => <img data-testid="ion-img" src={src} alt={alt} />,
  IonBadge: ({ children }: any) => <span data-testid="ion-badge">{children}</span>,
  IonToast: () => null,
  IonActionSheet: ({ isOpen, header }: any) =>
    isOpen ? <div data-testid="app-update-sheet">{header}</div> : null,
  setupIonicReact: vi.fn(),
  useIonRouter: () => ({ push: vi.fn(), goBack: vi.fn() }),
}));

// Mock Ionic React Router
vi.mock('@ionic/react-router', () => ({
  IonReactRouter: ({ children }: any) => <div data-testid="ion-react-router">{children}</div>,
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Route: ({ path, component: Component, children }: any) => (
    <div data-testid={`route-${path}`}>{children ?? (Component && <Component />)}</div>
  ),
  Redirect: ({ from, to, exact }: any) => <div data-testid={`redirect-${to}`}>Redirect</div>,
  useLocation: () => ({ pathname: '/' }),
  useHistory: () => ({ push: vi.fn(), goBack: vi.fn() }),
  useParams: () => ({ contentId: 'do_mock_001' }),
}));

// Mock ionicons with all required icons
vi.mock('ionicons/icons', () => ({
  home: 'home-icon',
  homeOutline: 'home-outline-icon',
  person: 'person-icon',
  personOutline: 'person-outline-icon',
  statsChart: 'stats-chart-icon',
  bookOutline: 'book-outline-icon',
  qrCodeOutline: 'qr-code-outline-icon',
  downloadOutline: 'download-outline-icon',
  chevronForward: 'chevron-forward-icon',
  chevronBack: 'chevron-back-icon',
  logIn: 'log-in-icon',
  notifications: 'notifications-icon',
  notificationsOutline: 'notifications-outline-icon',
  searchOutline: 'search-outline-icon',
  helpCircleOutline: 'help-circle-outline-icon',
  chevronBackOutline: 'chevron-back-outline-icon',
  syncOutline: 'sync-outline-icon',
}));

// Mock pages
vi.mock('./pages/HomePage', () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('./pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}));

vi.mock('./pages/ProfilePage', () => ({
  default: () => <div data-testid="profile-page">Profile Page</div>,
}));

vi.mock('./pages/ExplorePage', () => ({
  default: () => <div data-testid="explore-page">Explore Page</div>,
}));

vi.mock('./pages/CoursesPage', () => ({
  default: () => <div data-testid="courses-page">Courses Page</div>,
}));

vi.mock('./pages/ScanPage', () => ({
  default: () => <div data-testid="scan-page">Scan Page</div>,
}));

vi.mock('./pages/DownloadsPage', () => ({
  default: () => <div data-testid="downloads-page">Downloads Page</div>,
}));

vi.mock('./pages/PersonalDetailsPage', () => ({
  default: () => <div data-testid="personal-details-page">Personal Details Page</div>,
}));

vi.mock('./pages/MyLearningPage', () => ({
  default: () => <div data-testid="my-learning-page">My Learning Page</div>,
}));

vi.mock('./pages/DownloadedContentsPage', () => ({
  default: () => <div data-testid="downloaded-contents-page">Downloaded Contents Page</div>,
}));

vi.mock('./pages/HelpAndSupportPage', () => ({
  default: () => <div data-testid="help-page">Help Page</div>,
}));

vi.mock('./pages/FaqDetailPage', () => ({
  default: () => <div data-testid="faq-page">FAQ Page</div>,
}));

vi.mock('./pages/VideoContentPage', () => ({
  default: () => <div data-testid="video-page">Video Page</div>,
}));

vi.mock('./pages/SearchPage', () => ({
  default: () => <div data-testid="search-page">Search Page</div>,
}));

vi.mock('./pages/CourseDetailsPage', () => ({
  default: () => <div data-testid="course-details-page">Course Details Page</div>,
}));


vi.mock('./pages/ContentPlayerPage', () => ({
  default: () => <div data-testid="content-player-page">Content Player Page</div>,
}));

vi.mock('./pages/SignInPage', () => ({
  default: () => <div data-testid="sign-in-page">Sign In Page</div>,
}));

vi.mock('./pages/CollectionPage', () => ({
  default: () => <div data-testid="collection-page">Collection Page</div>,
}));

vi.mock('./pages/NotificationPage', () => ({
  default: () => <div data-testid="notification-page">Notification Page</div>,
}));

vi.mock('./pages/ProfileLearningPage', () => ({
  default: () => <div data-testid="profile-learning-page">Profile Learning Page</div>,
}));

vi.mock('./pages/SettingsPage', () => ({
  default: () => <div data-testid="settings-page">Settings Page</div>,
}));

vi.mock('./components/common/BackButtonHandler', () => ({
  default: () => null,
}));

// Mock CSS imports
vi.mock('@ionic/react/css/core.css', () => ({}));
vi.mock('@ionic/react/css/normalize.css', () => ({}));
vi.mock('@ionic/react/css/structure.css', () => ({}));
vi.mock('@ionic/react/css/typography.css', () => ({}));
vi.mock('@ionic/react/css/padding.css', () => ({}));
vi.mock('@ionic/react/css/float-elements.css', () => ({}));
vi.mock('@ionic/react/css/text-alignment.css', () => ({}));
vi.mock('@ionic/react/css/text-transformation.css', () => ({}));
vi.mock('@ionic/react/css/flex-utils.css', () => ({}));
vi.mock('@ionic/react/css/display.css', () => ({}));
vi.mock('./theme/variables.css', () => ({}));
vi.mock('./theme/overrides.css', () => ({}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => 'ltr' },
  }),
}));

// Mock NativeConfigService to avoid Capacitor plugin import issues
vi.mock('./services/NativeConfigService', () => ({
  NativeConfigServiceInstance: {
    load: vi.fn().mockResolvedValue({
      baseUrl: 'https://dev.sunbirded.org',
      mobileAppConsumer: 'test-consumer',
      mobileAppKey: 'test-key',
      mobileAppSecret: 'test-secret',
      producerId: 'test-producer',
    }),
  },
}));

// Mock API config initialization
vi.mock('./api/config', () => ({
  initializeApiClient: vi.fn().mockResolvedValue(undefined),
}));

// Mock AppInitializer
vi.mock('./AppInitializer', () => ({
  AppInitializer: {
    init: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
    subscribe: vi.fn().mockReturnValue(() => {}),
  },
}));

// Mock useAppInitialized to always return true so routes render
vi.mock('./hooks/useAppInitialized', () => ({
  useAppInitialized: () => true,
}));

// Mock PageLoader
vi.mock('./components/common/PageLoader', () => ({
  default: () => <div data-testid="page-loader">Loading...</div>,
}));

// Mock notification hooks (used by AppHeader)
vi.mock('./hooks/useNotifications', () => ({
  useNotificationRead: () => ({ notifications: [], isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationGrouping: () => ({ groupedNotifications: [], unreadCount: 0 }),
}));

// Mock React Query — PushNotificationGuard uses useQueryClient
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

// Mock push notification service
vi.mock('./services/push/notificationRouter', () => ({
  routeNotification: vi.fn(),
}));

// Mock AppUpdateService
const { mockIsUpdateAvailable, mockOpenAppStore } = vi.hoisted(() => ({
  mockIsUpdateAvailable: vi.fn().mockResolvedValue(false),
  mockOpenAppStore: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./services/AppUpdateService', () => ({
  appUpdateService: {
    isUpdateAvailable: mockIsUpdateAvailable,
    openAppStore: mockOpenAppStore,
  },
}));

// Mock AuthContext so TnCGuard doesn't crash
vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    userId: null,
    login: vi.fn(),
    loginWithCredentials: vi.fn(),
    logout: vi.fn(),
    needsTnC: false,
    tncData: null,
    completeTnC: vi.fn(),
    onboardingDismissed: false,
    completeOnboarding: vi.fn(),
  }),
}));

// Mock TermsAndConditionsPage
vi.mock('./pages/TermsAndConditionsPage', () => ({
  default: () => <div data-testid="tnc-page">TnC Page</div>,
}));

// Mock OnboardingPage
vi.mock('./pages/OnboardingPage', () => ({
  default: () => <div data-testid="onboarding-page">Onboarding Page</div>,
}));

// Mock useUser hook for OnboardingGuard
vi.mock('./hooks/useUser', () => ({
  useUser: () => ({ data: null, isLoading: false, error: null }),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsUpdateAvailable.mockResolvedValue(false);
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('ion-app')).toBeInTheDocument();
  });

  it('renders IonReactRouter', () => {
    render(<App />);
    expect(screen.getByTestId('ion-react-router')).toBeInTheDocument();
  });

  it('renders routes', () => {
    render(<App />);
    expect(screen.getByTestId('route-/home')).toBeInTheDocument();
    expect(screen.getByTestId('route-/courses')).toBeInTheDocument();
    expect(screen.getByTestId('route-/scan')).toBeInTheDocument();
    expect(screen.getByTestId('route-/downloads')).toBeInTheDocument();
    expect(screen.getByTestId('route-/profile')).toBeInTheDocument();
    expect(screen.getByTestId('route-/dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('route-/explore')).toBeInTheDocument();
    expect(screen.getByTestId('route-/search')).toBeInTheDocument();
    expect(screen.getByTestId('route-/content/:contentId')).toBeInTheDocument();
    expect(screen.getByTestId('route-/notifications')).toBeInTheDocument();
    expect(screen.getByTestId('route-/onboarding')).toBeInTheDocument();
  });

  it('renders redirect component', () => {
    render(<App />);
    expect(screen.getByTestId('redirect-/home')).toBeInTheDocument();
  });

  it('renders page content', () => {
    render(<App />);
    // The app renders the home page by default
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('checks for app update on startup', async () => {
    render(<App />);
    await waitFor(() => {
      expect(mockIsUpdateAvailable).toHaveBeenCalledTimes(1);
    });
  });

  it('does not open app store when no update is available', async () => {
    mockIsUpdateAvailable.mockResolvedValue(false);
    render(<App />);
    await waitFor(() => {
      expect(mockIsUpdateAvailable).toHaveBeenCalled();
    });
    expect(mockOpenAppStore).not.toHaveBeenCalled();
  });

  it('shows update action sheet when update is available', async () => {
    mockIsUpdateAvailable.mockResolvedValue(true);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('app-update-sheet')).toBeInTheDocument();
    });
  });
});
