import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  setupIonicReact: vi.fn(),
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
  useHistory: () => ({ push: vi.fn() }),
}));

// Mock ionicons with all required icons
vi.mock('ionicons/icons', () => ({
  home: 'home-icon',
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
}));

// Mock pages
vi.mock('./pages/HomePage', () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('./pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}));

vi.mock('./pages/Profile', () => ({
  default: () => <div data-testid="profile-page">Profile Page</div>,
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

describe('App', () => {
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
    expect(screen.getByTestId('route-/dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('route-/profile')).toBeInTheDocument();
    expect(screen.getByTestId('route-/')).toBeInTheDocument();
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
});
