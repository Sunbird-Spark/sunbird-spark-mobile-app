import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

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
    IonHeader: ({ children, collapse }: any) => (
        <header data-testid="ion-header" data-collapse={collapse}>
            {children}
        </header>
    ),
    IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
    IonTitle: ({ children, size }: any) => <h1 data-testid="ion-title" data-size={size}>{children}</h1>,
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
}));

describe('Dashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        render(<Dashboard />);
        expect(screen.getByTestId('ion-page'))
    });

    it('renders the page title', () => {
        render(<Dashboard />);
        expect(screen.getByText('dashboard.title'))
    });

    it('renders the condensed header title', () => {
        render(<Dashboard />);
        expect(screen.getByText('common.dashboard'))
    });

    it('renders language switcher', () => {
        render(<Dashboard />);
        expect(screen.getByTestId('language-switcher'))
    });

    it('renders welcome card', () => {
        render(<Dashboard />);
        expect(screen.getByText('dashboard.welcome'))
    });

    it('renders description', () => {
        render(<Dashboard />);
        expect(screen.getByText('dashboard.description'))
    });

    it('renders statistics list', () => {
        render(<Dashboard />);
        expect(screen.getByTestId('ion-list'))
    });

    it('renders Total Students stat', () => {
        render(<Dashboard />);
        expect(screen.getByText('dashboard.totalStudents'))
        expect(screen.getByText(/125/))
    });

    it('renders Active Sessions stat', () => {
        render(<Dashboard />);
        expect(screen.getByText('dashboard.activeSessions'))
        const sessionText = screen.getByText((content, element) => {
            return element?.textContent === '12 dashboard.ongoingSessions';
        });
        expect(sessionText)
    });

    it('renders Completion Rate stat', () => {
        render(<Dashboard />);
        expect(screen.getByText('dashboard.completionRate'))
        expect(screen.getByText(/87%/))
    });

    it('renders three statistics items', () => {
        render(<Dashboard />);
        const items = screen.getAllByTestId('ion-item');
        expect(items).toHaveLength(3);
    });

    it('renders fullscreen content', () => {
        render(<Dashboard />);
        const content = screen.getByTestId('ion-content');
        expect(content)
    });
});
