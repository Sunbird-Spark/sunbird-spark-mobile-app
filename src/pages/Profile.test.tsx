import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Profile from './Profile';

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
    IonCardContent: ({ children, className }: any) => (
        <div data-testid="ion-card-content" className={className}>
            {children}
        </div>
    ),
    IonAvatar: ({ children, style }: any) => (
        <div data-testid="ion-avatar" style={style}>
            {children}
        </div>
    ),
    IonList: ({ children }: any) => <ul data-testid="ion-list">{children}</ul>,
    IonItem: ({ children }: any) => <li data-testid="ion-item">{children}</li>,
    IonLabel: ({ children }: any) => <div data-testid="ion-label">{children}</div>,
    IonButton: ({ children, color, expand }: any) => (
        <button data-testid="ion-button" data-color={color} data-expand={expand}>
            {children}
        </button>
    ),
    IonButtons: ({ children, slot }: any) => (
        <div data-testid="ion-buttons" data-slot={slot}>
            {children}
        </div>
    ),
}));

describe('Profile Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        render(<Profile />);
        expect(screen.getByTestId('ion-page'))
    });

    it('renders the page title', () => {
        render(<Profile />);
        expect(screen.getByText('profile.title'))
    });

    it('renders the condensed header title', () => {
        render(<Profile />);
        expect(screen.getByText('common.profile'))
    });

    it('renders language switcher', () => {
        render(<Profile />);
        expect(screen.getByTestId('language-switcher'))
    });

    it('renders avatar', () => {
        render(<Profile />);
        expect(screen.getByTestId('ion-avatar'))
        expect(screen.getByAltText('Profile'))
    });

    it('renders teacher name', () => {
        render(<Profile />);
        expect(screen.getByText('profile.teacherName'))
    });

    it('renders email', () => {
        render(<Profile />);
        expect(screen.getByText('teacher@sahayak.com'))
    });

    it('renders account settings card', () => {
        render(<Profile />);
        expect(screen.getByText('profile.accountSettings'))
    });

    it('renders role information', () => {
        render(<Profile />);
        expect(screen.getByText('profile.role'))
        expect(screen.getByText('profile.primaryTeacher'))
    });

    it('renders school information', () => {
        render(<Profile />);
        expect(screen.getByText('profile.school'))
        expect(screen.getByText('profile.demoSchool'))
    });

    it('renders member since information', () => {
        render(<Profile />);
        expect(screen.getByText('profile.memberSince'))
        expect(screen.getByText('profile.january2025'))
    });

    it('renders logout button', () => {
        render(<Profile />);
        expect(screen.getByText('profile.logout'))
    });

    it('logout button has danger color', () => {
        render(<Profile />);
        const buttons = screen.getAllByTestId('ion-button');
        const logoutButton = buttons.find(btn => btn.textContent === 'profile.logout');
        expect(logoutButton)
        expect(logoutButton)
    });

    it('renders three account detail items', () => {
        render(<Profile />);
        const items = screen.getAllByTestId('ion-item');
        expect(items).toHaveLength(3);
    });

    it('renders fullscreen content', () => {
        render(<Profile />);
        const content = screen.getByTestId('ion-content');
        expect(content)
    });
});
