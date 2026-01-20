import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonHeader: ({ children }: any) => <header data-testid="ion-header">{children}</header>,
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
  IonButton: ({ children, color, expand, className }: any) => (
    <button data-testid="ion-button" data-color={color} data-expand={expand} className={className}>
      {children}
    </button>
  ),
  IonButtons: ({ children, slot }: any) => (
    <div data-testid="ion-buttons" data-slot={slot}>
      {children}
    </div>
  ),
}));

// Mock CSS
vi.mock('./Home.css', () => ({}));

describe('Home Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Home />);
    expect(screen.getByTestId('ion-page'));
  });

  it('renders the page title', () => {
    render(<Home />);
    expect(screen.getByText('homeTitle'));
  });

  it('renders the condensed header title', () => {
    render(<Home />);
    expect(screen.getByText('home'));
  });

  it('renders language switcher', () => {
    render(<Home />);
    expect(screen.getByTestId('language-switcher'));
  });

  it('renders welcome card with title', () => {
    render(<Home />);
    expect(screen.getByText('welcomeToSunbird'));
  });

  it('renders welcome message', () => {
    render(<Home />);
    expect(screen.getByText('homeDescription'));
  });

  it('renders Quick Actions card', () => {
    render(<Home />);
    expect(screen.getByText('quickActions'));
  });

  it('renders View Students button', () => {
    render(<Home />);
    expect(screen.getByText('viewStudents'));
  });

  it('renders Track Progress button', () => {
    render(<Home />);
    expect(screen.getByText('trackProgress'));
  });

  it('View Students button has correct props', () => {
    render(<Home />);
    const buttons = screen.getAllByTestId('ion-button');
    const viewStudentsButton = buttons.find((btn) => btn.textContent === 'viewStudents');
    expect(viewStudentsButton).toBeDefined();
    expect(viewStudentsButton?.getAttribute('data-color')).toBe('primary');
    expect(viewStudentsButton?.getAttribute('data-expand')).toBe('block');
  });

  it('Track Progress button has correct props', () => {
    render(<Home />);
    const buttons = screen.getAllByTestId('ion-button');
    const trackProgressButton = buttons.find((btn) => btn.textContent === 'trackProgress');
    expect(trackProgressButton).toBeDefined();
    expect(trackProgressButton?.getAttribute('data-color')).toBe('secondary');
    expect(trackProgressButton?.getAttribute('data-expand')).toBe('block');
    expect(trackProgressButton?.className).toContain('ion-margin-top');
  });

  it('renders fullscreen content', () => {
    render(<Home />);
    const content = screen.getByTestId('ion-content');
    expect(content).toBeDefined();
    expect(content.getAttribute('data-fullscreen')).toBe('true');
  });
});
