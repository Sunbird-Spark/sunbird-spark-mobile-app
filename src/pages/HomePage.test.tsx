import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HomePage from './HomePage';

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
  IonContent: ({ children, fullscreen }: unknown) => (
    <div data-testid="ion-content" data-fullscreen={fullscreen}>
      {children}
    </div>
  ),
  IonHeader: ({ children, collapse }: unknown) => (
    <div data-testid="ion-header" data-collapse={collapse}>
      {children}
    </div>
  ),
  IonIcon: ({ icon, slot }: unknown) => (
    <span data-testid="ion-icon" data-icon={icon} data-slot={slot} />
  ),
  IonPage: ({ children }: unknown) => <div data-testid="ion-page">{children}</div>,
  IonTitle: ({ children, size }: unknown) => (
    <h1 data-testid="ion-title" data-size={size}>{children}</h1>
  ),
  IonToolbar: ({ children }: unknown) => <div data-testid="ion-toolbar">{children}</div>,
  IonButtons: ({ children }: unknown) => <div data-testid="ion-buttons">{children}</div>,
  IonAvatar: ({ children }: unknown) => <div data-testid="ion-avatar">{children}</div>,
  IonGrid: ({ children }: unknown) => <div data-testid="ion-grid">{children}</div>,
  IonRow: ({ children }: unknown) => <div data-testid="ion-row">{children}</div>,
  IonCol: ({ children }: unknown) => <div data-testid="ion-col">{children}</div>,
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
  homeOutline: 'home-outline-icon',
  bookOutline: 'book-outline-icon',
  qrCodeOutline: 'qr-code-outline-icon',
  downloadOutline: 'download-outline-icon',
  personOutline: 'person-outline-icon',
  searchOutline: 'search-outline-icon',
  helpCircleOutline: 'help-circle-outline-icon',
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
  default: ({ course, variant }: unknown) => (
    <div data-testid="course-card" data-variant={variant} data-course-id={course.id}>
      {course.title}
    </div>
  ),
}));

// Mock new section components
vi.mock('../components/home/HeroSection', () => ({
  HeroSection: () => <div data-testid="hero-section">Hero Section</div>,
}));
vi.mock('../components/home/StatsBar', () => ({
  StatsBar: () => <div data-testid="stats-bar">Stats Bar</div>,
}));
vi.mock('../components/home/ContentCardCarousel', () => ({
  ContentCardCarousel: ({ title }: unknown) => (
    <div data-testid="content-card-carousel" data-title={title}>{title}</div>
  ),
}));
vi.mock('../components/home/CategoriesGrid', () => ({
  CategoriesGrid: () => <div data-testid="categories-grid">Categories Grid</div>,
}));
vi.mock('../components/home/ResourceCenter', () => ({
  ResourceCenter: () => <div data-testid="resource-center">Resource Center</div>,
}));
vi.mock('../components/home/FAQSection', () => ({
  FAQSection: () => <div data-testid="faq-section">FAQ Section</div>,
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
    { id: '1', title: 'JavaScript', description: 'JS fundamentals', thumbnail: '', rating: 4.5, lessons: 20 },
    { id: '2', title: 'CSS', description: 'Styling basics', thumbnail: '', rating: 4.3, lessons: 15 },
    { id: '3', title: 'HTML', description: 'Web structure', thumbnail: '', rating: 4.7, lessons: 12 },
    { id: '4', title: 'React', description: 'React basics', thumbnail: '', rating: 4.8, lessons: 25 },
    { id: '5', title: 'Node', description: 'Node basics', thumbnail: '', rating: 4.6, lessons: 18 },
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

  it('renders hero section', () => {
    render(<HomePage />);
    expect(screen.getByTestId('hero-section')).toBeInTheDocument();
  });

  it('renders stats bar', () => {
    render(<HomePage />);
    expect(screen.getByTestId('stats-bar')).toBeInTheDocument();
  });

  it('renders content card carousels', () => {
    render(<HomePage />);
    const carousels = screen.getAllByTestId('content-card-carousel');
    expect(carousels).toHaveLength(3);
    expect(carousels[0]).toHaveAttribute('data-title', 'Most Popular Content');
    expect(carousels[1]).toHaveAttribute('data-title', 'Most Viewed Content');
    expect(carousels[2]).toHaveAttribute('data-title', 'Trending Content');
  });

  it('renders categories grid', () => {
    render(<HomePage />);
    expect(screen.getByTestId('categories-grid')).toBeInTheDocument();
  });

  it('renders resource center', () => {
    render(<HomePage />);
    expect(screen.getByTestId('resource-center')).toBeInTheDocument();
  });

  it('renders FAQ section', () => {
    render(<HomePage />);
    expect(screen.getByTestId('faq-section')).toBeInTheDocument();
  });

  it('shows quick actions when authenticated', () => {
    mockAuthContext.isAuthenticated = true;
    render(<HomePage />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByTestId('ion-grid')).toBeInTheDocument();
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

  it('renders fullscreen content', () => {
    render(<HomePage />);
    expect(screen.getByTestId('ion-content')).toHaveAttribute('data-fullscreen', 'true');
  });
});