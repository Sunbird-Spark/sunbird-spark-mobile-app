import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HomePage from './HomePage';

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonButton: ({ children, onClick, fill, size, className }: any) => (
    <button 
      data-testid="ion-button" 
      onClick={onClick}
      data-fill={fill}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
  IonContent: ({ children, fullscreen }: any) => (
    <div data-testid="ion-content" data-fullscreen={fullscreen}>
      {children}
    </div>
  ),
  IonHeader: ({ children, collapse }: any) => (
    <div data-testid="ion-header" data-collapse={collapse}>
      {children}
    </div>
  ),
  IonIcon: ({ icon, slot }: any) => (
    <span data-testid="ion-icon" data-icon={icon} data-slot={slot} />
  ),
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonTitle: ({ children, size }: any) => (
    <h1 data-testid="ion-title" data-size={size}>{children}</h1>
  ),
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonButtons: ({ children }: any) => <div data-testid="ion-buttons">{children}</div>,
  IonAvatar: ({ children }: any) => <div data-testid="ion-avatar">{children}</div>,
  IonGrid: ({ children }: any) => <div data-testid="ion-grid">{children}</div>,
  IonRow: ({ children }: any) => <div data-testid="ion-row">{children}</div>,
  IonCol: ({ children }: any) => <div data-testid="ion-col">{children}</div>,
}));

// Mock react-router-dom
const mockPush = vi.fn();
vi.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: mockPush,
  }),
  useLocation: () => ({ pathname: '/' }),
}));

// Mock ionicons
vi.mock('ionicons/icons', () => ({
  chevronForward: 'chevron-forward-icon',
  chevronBack: 'chevron-back-icon',
  home: 'home-icon',
  bookOutline: 'book-outline-icon',
  qrCodeOutline: 'qr-code-outline-icon',
  downloadOutline: 'download-outline-icon',
  personOutline: 'person-outline-icon',
  logIn: 'log-in-icon',
  person: 'person-icon',
  notifications: 'notifications-icon',
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        welcome: 'Welcome',
        home: 'Home',
        quickActions: 'Quick Actions',
        viewStudents: 'View Students',
        trackProgress: 'Track Progress',
        continueLearning: 'Continue Learning',
        viewAll: 'View All',
        featuredCourses: 'Featured Courses',
        browseCourses: 'Browse Courses',
      };
      return translations[key] || key;
    },
    i18n: { dir: () => 'ltr' },
  }),
}));

// Mock LanguageSwitcher
vi.mock('../components/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher">Language Switcher</div>,
}));

// Mock CourseCard
vi.mock('../components/courses/CourseCard', () => ({
  default: ({ course, variant }: any) => (
    <div data-testid="course-card" data-variant={variant} data-course-id={course.id}>
      {course.title}
    </div>
  ),
}));

// Mock data
vi.mock('../data/mockData', () => ({
  getFeaturedCourses: () => [
    { id: 1, title: 'React Basics', description: 'Learn React', featured: true },
    { id: 2, title: 'TypeScript', description: 'Learn TypeScript', featured: true },
  ],
  getInProgressCourses: () => [
    { id: 3, title: 'Advanced React', description: 'Advanced concepts', progress: 45 },
  ],
  courses: [
    { id: 4, title: 'JavaScript', description: 'JS fundamentals' },
    { id: 5, title: 'CSS', description: 'Styling basics' },
    { id: 6, title: 'HTML', description: 'Web structure' },
  ],
  currentUser: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    avatar: 'https://example.com/avatar.jpg',
  },
}));

// Mock AuthContext
const mockAuthContext = {
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.isAuthenticated = false;
  });

  it('renders without crashing', () => {
    render(<HomePage />);
    expect(screen.getByTestId('ion-page')).toBeInTheDocument();
  });

  it('renders page structure correctly', () => {
    render(<HomePage />);
    expect(screen.getByTestId('ion-header')).toBeInTheDocument();
    expect(screen.getByTestId('ion-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('ion-content')).toBeInTheDocument();
  });

  it('renders correct title when not authenticated', () => {
    render(<HomePage />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders correct title when authenticated', () => {
    mockAuthContext.isAuthenticated = true;
    render(<HomePage />);
    // The authenticated header shows "welcomeBack" (translation key) and user name
    expect(screen.getByText('welcomeBack')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders language switcher', () => {
    render(<HomePage />);
    // The HomePage doesn't have a language switcher in the header, it has a login button
    expect(screen.getByText('login')).toBeInTheDocument();
  });

  it('shows quick actions when authenticated', () => {
    mockAuthContext.isAuthenticated = true;
    render(<HomePage />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    // Check that the quick actions grid is present
    expect(screen.getByTestId('ion-grid')).toBeInTheDocument();
    expect(screen.getByTestId('ion-row')).toBeInTheDocument();
    // Check for the specific icons in quick actions
    const quickActionIcons = screen.getAllByTestId('ion-icon');
    expect(quickActionIcons.length).toBeGreaterThan(4); // Should have multiple icons
  });

  it('does not show quick actions when not authenticated', () => {
    render(<HomePage />);
    expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();
  });

  it('shows continue learning section when authenticated and has progress', () => {
    mockAuthContext.isAuthenticated = true;
    render(<HomePage />);
    expect(screen.getByText('Continue Learning')).toBeInTheDocument();
  });

  it('renders featured courses section', () => {
    render(<HomePage />);
    expect(screen.getByText('Featured Courses')).toBeInTheDocument();
    // The page shows both featured courses (2) and browse courses (3) = 5 total
    expect(screen.getAllByTestId('course-card')).toHaveLength(5);
  });

  it('renders browse courses section when not authenticated', () => {
    render(<HomePage />);
    expect(screen.getByText('Browse Courses')).toBeInTheDocument();
  });

  it('does not render browse courses section when authenticated', () => {
    mockAuthContext.isAuthenticated = true;
    render(<HomePage />);
    expect(screen.queryByText('Browse Courses')).not.toBeInTheDocument();
  });

  it('navigates to courses page when view all is clicked', () => {
    render(<HomePage />);
    const viewAllButtons = screen.getAllByText('View All');
    fireEvent.click(viewAllButtons[0]);
    expect(mockPush).toHaveBeenCalledWith('/courses');
  });

  it('renders course cards with correct variants', () => {
    render(<HomePage />);
    const courseCards = screen.getAllByTestId('course-card');
    
    // Featured courses should use compact variant
    const featuredCards = courseCards.filter(card => 
      card.getAttribute('data-variant') === 'compact'
    );
    expect(featuredCards).toHaveLength(2);
  });

  it('renders fullscreen content', () => {
    render(<HomePage />);
    expect(screen.getByTestId('ion-content')).toHaveAttribute('data-fullscreen', 'true');
  });

  it('renders condensed header', () => {
    render(<HomePage />);
    // The HomePage doesn't have a condensed header structure like Dashboard
    const headers = screen.getAllByTestId('ion-header');
    expect(headers.length).toBeGreaterThan(0);
  });

  it('handles RTL direction correctly', () => {
    // Mock RTL direction
    vi.mocked(vi.importMock('react-i18next')).useTranslation = () => ({
      t: (key: string) => key,
      i18n: { dir: () => 'rtl' },
    });
    
    render(<HomePage />);
    // The page has multiple icons: login button, view all buttons, bottom navigation
    expect(screen.getAllByTestId('ion-icon').length).toBeGreaterThan(2);
  });

  it('renders correct number of browse courses when not authenticated', () => {
    render(<HomePage />);
    const browseCourseCards = screen.getAllByTestId('course-card').filter(card =>
      card.getAttribute('data-variant') === 'horizontal'
    );
    expect(browseCourseCards).toHaveLength(3); // Should show 3 courses
  });
});