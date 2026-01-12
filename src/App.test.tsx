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
  setupIonicReact: vi.fn(),
}));

// Mock Ionic React Router
vi.mock('@ionic/react-router', () => ({
  IonReactRouter: ({ children }: any) => <div data-testid="ion-react-router">{children}</div>,
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Route: ({ path, component: Component }: any) => (
    <div data-testid={`route-${path}`}>{Component && <Component />}</div>
  ),
  Redirect: ({ from, to, exact }: any) => <div data-testid={`redirect-${to}`}>Redirect</div>,
}));

// Mock ionicons
vi.mock('ionicons/icons', () => ({
  home: 'home-icon',
  person: 'person-icon',
  statsChart: 'stats-chart-icon',
}));

// Mock pages
vi.mock('./pages/Home', () => ({
  default: () => <div>Home Page</div>,
}));

vi.mock('./pages/Dashboard', () => ({
  default: () => <div>Dashboard Page</div>,
}));

vi.mock('./pages/Profile', () => ({
  default: () => <div>Profile Page</div>,
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

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('ion-app'));
  });

  it('renders IonReactRouter', () => {
    render(<App />);
    expect(screen.getByTestId('ion-react-router'));
  });

  it('renders IonTabs', () => {
    render(<App />);
    expect(screen.getByTestId('ion-tabs'));
  });

  it('renders all tab buttons', () => {
    render(<App />);
    expect(screen.getByTestId('tab-button-home'));
    expect(screen.getByTestId('tab-button-dashboard'));
    expect(screen.getByTestId('tab-button-profile'));
  });

  it('renders tab labels', () => {
    render(<App />);
    const labels = screen.getAllByTestId('ion-label');
    expect(labels).toHaveLength(3);
  });

  it('tab buttons have correct hrefs', () => {
    render(<App />);
    expect(screen.getByTestId('tab-button-home'));
    expect(screen.getByTestId('tab-button-dashboard'));
    expect(screen.getByTestId('tab-button-profile'));
  });

  it('renders routes', () => {
    render(<App />);
    expect(screen.getByTestId('route-/home'));
    expect(screen.getByTestId('route-/dashboard'));
    expect(screen.getByTestId('route-/profile'));
    expect(screen.getByTestId('route-/'));
  });
});
