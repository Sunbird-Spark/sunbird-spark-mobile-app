import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonApp: ({ children }: any) => <div>{children}</div>,
  IonRouterOutlet: ({ children }: any) => <div>{children}</div>,
  IonPage: ({ children }: any) => <div>{children}</div>,
  IonHeader: ({ children }: any) => <header>{children}</header>,
  IonToolbar: ({ children }: any) => <div>{children}</div>,
  IonTitle: ({ children }: any) => <div>{children}</div>,
  IonContent: ({ children }: any) => <div>{children}</div>,
  IonButton: ({ children }: any) => <button>{children}</button>,
  IonIcon: () => <span />,
  IonSpinner: () => <span />,
  IonCard: ({ children }: any) => <div>{children}</div>,
  IonCardHeader: ({ children }: any) => <div>{children}</div>,
  IonCardTitle: ({ children }: any) => <div>{children}</div>,
  IonCardContent: ({ children }: any) => <div>{children}</div>,
  IonText: ({ children }: any) => <span>{children}</span>,
  IonGrid: ({ children }: any) => <div>{children}</div>,
  IonRow: ({ children }: any) => <div>{children}</div>,
  IonCol: ({ children }: any) => <div>{children}</div>,
  IonBadge: ({ children }: any) => <span>{children}</span>,
  IonPopover: ({ children, isOpen }: any) => (isOpen ? <div>{children}</div> : null),
  IonImg: ({ src, alt }: any) => <img src={src} alt={alt} />,
  IonProgressBar: () => <span />,
  IonPopover: ({ children }: any) => <div>{children}</div>,
  IonImg: ({ src, alt }: any) => <img src={src} alt={alt} />,
  useIonRouter: () => ({ push: vi.fn() }),
  IonIcon: ({ icon }: unknown) => <span data-testid="ion-icon" data-icon={icon} />,
  IonLabel: ({ children }: unknown) => <span data-testid="ion-label">{children}</span>,
  IonRouterOutlet: ({ children }: unknown) => <div data-testid="ion-router-outlet">{children}</div>,
  IonTabBar: ({ children, slot }: unknown) => (
    <div data-testid="ion-tab-bar" data-slot={slot}>
      {children}
    </div>
  ),
  IonTabButton: ({ children, tab, href }: unknown) => (
    <button data-testid={`tab-button-${tab}`} data-href={href}>
      {children}
    </button>
  ),
  IonTabs: ({ children }: unknown) => <div data-testid="ion-tabs">{children}</div>,
  IonPage: ({ children }: unknown) => <div data-testid="ion-page">{children}</div>,
  IonHeader: ({ children }: unknown) => <div data-testid="ion-header">{children}</div>,
  IonToolbar: ({ children }: unknown) => <div data-testid="ion-toolbar">{children}</div>,
  IonTitle: ({ children }: unknown) => <div data-testid="ion-title">{children}</div>,
  IonContent: ({ children }: unknown) => <div data-testid="ion-content">{children}</div>,
  IonButtons: ({ children }: unknown) => <div data-testid="ion-buttons">{children}</div>,
  IonButton: ({ children }: unknown) => <button data-testid="ion-button">{children}</button>,
  IonAvatar: ({ children }: unknown) => <div data-testid="ion-avatar">{children}</div>,
  setupIonicReact: vi.fn(),
}));

// Mock Ionic React Router
vi.mock('@ionic/react-router', () => ({
  IonReactRouter: ({ children }: unknown) => <div data-testid="ion-react-router">{children}</div>,
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Route: ({ path, component: Component, children }: unknown) => (
    <div data-testid={`route-${path}`}>{children ?? (Component && <Component />)}</div>
  ),
  Redirect: ({ from, to, exact }: unknown) => <div data-testid={`redirect-${to}`}>Redirect</div>,
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
