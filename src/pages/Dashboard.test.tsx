import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';

// Mock react-router-dom to avoid BottomNavigation issues
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/dashboard' }),
  useHistory: () => ({ push: vi.fn() }),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        dashboardTitle: 'Dashboard',
        dashboard: 'Dashboard',
        dashboardOverview: 'Dashboard Overview',
        dashboardDescription: 'Monitor your educational activities and performance.',
        statistics: 'Statistics',
        totalStudents: 'Total Students',
        studentsEnrolled: 'students enrolled',
        activeSessions: 'Active Sessions',
        ongoingSessions: 'ongoing sessions',
        completionRate: 'Completion Rate',
        averageCompletion: 'average completion',
        viewDetails: 'View Details',
        viewReports: 'View Reports',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock LanguageSwitcher
vi.mock('../components/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher">Language Switcher</div>,
}));

// Mock BottomNavigation
vi.mock('../components/layout/BottomNavigation', () => ({
  BottomNavigation: () => <div data-testid="bottom-navigation">Bottom Navigation</div>,
}));

// Mock ionicons
vi.mock('ionicons/icons', () => ({
  home: 'home-icon',
  bookOutline: 'book-outline-icon',
  qrCodeOutline: 'qr-code-outline-icon',
  downloadOutline: 'download-outline-icon',
  person: 'person-icon',
  personOutline: 'person-outline-icon',
}));

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonHeader: ({ children, collapse }: any) => (
    <header data-testid="ion-header" data-collapse={collapse}>
      {children}
    </header>
  ),
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonTitle: ({ children, size }: any) => (
    <h1 data-testid="ion-title" data-size={size}>
      {children}
    </h1>
  ),
  IonContent: ({ children, fullscreen }: any) => (
    <main data-testid="ion-content" data-fullscreen={fullscreen}>
      {children}
    </main>
  ),
  IonCard: ({ children }: any) => <div data-testid="ion-card">{children}</div>,
  IonCardHeader: ({ children }: any) => <div data-testid="ion-card-header">{children}</div>,
  IonCardTitle: ({ children }: any) => <h2 data-testid="ion-card-title">{children}</h2>,
  IonCardContent: ({ children }: any) => <div data-testid="ion-card-content">{children}</div>,
  IonList: ({ children }: any) => <ul data-testid="ion-list">{children}</ul>,
  IonItem: ({ children }: any) => <li data-testid="ion-item">{children}</li>,
  IonLabel: ({ children }: any) => <div data-testid="ion-label">{children}</div>,
  IonButtons: ({ children, slot }: any) => (
    <div data-testid="ion-buttons" data-slot={slot}>
      {children}
    </div>
  ),
  IonButton: ({ children, expand, color }: any) => (
    <button data-testid="ion-button" data-expand={expand} data-color={color}>
      {children}
    </button>
  ),
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('ion-page')).toBeInTheDocument();
  });

  it('renders the page title', () => {
    render(<Dashboard />);
    const dashboardTitles = screen.getAllByText('Dashboard');
    expect(dashboardTitles.length).toBeGreaterThan(0);
  });

  it('renders the condensed header title', () => {
    render(<Dashboard />);
    const dashboardTitles = screen.getAllByText('Dashboard');
    expect(dashboardTitles.length).toBe(2); // One in header, one in condensed header
  });

  it('renders language switcher', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
  });

  it('renders welcome card', () => {
    render(<Dashboard />);
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<Dashboard />);
    expect(screen.getByText('Monitor your educational activities and performance.')).toBeInTheDocument();
  });

  it('renders statistics list', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('ion-list')).toBeInTheDocument();
  });

  it('renders Total Students stat', () => {
    render(<Dashboard />);
    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText(/125/)).toBeInTheDocument();
  });

  it('renders Active Sessions stat', () => {
    render(<Dashboard />);
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    expect(screen.getByText('12 ongoing sessions')).toBeInTheDocument();
  });

  it('renders Completion Rate stat', () => {
    render(<Dashboard />);
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText(/87%/)).toBeInTheDocument();
  });

  it('renders three statistics items', () => {
    render(<Dashboard />);
    const items = screen.getAllByTestId('ion-item');
    expect(items).toHaveLength(3);
  });

  it('renders fullscreen content', () => {
    render(<Dashboard />);
    const content = screen.getByTestId('ion-content');
    expect(content).toBeInTheDocument();
  });
});
