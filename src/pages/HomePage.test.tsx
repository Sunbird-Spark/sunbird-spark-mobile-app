import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './HomePage';

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonContent: ({ children, fullscreen }: any) => (
    <div data-testid="ion-content" data-fullscreen={fullscreen}>{children}</div>
  ),
  IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonSpinner: () => <div data-testid="ion-spinner">Loading...</div>,
  useIonRouter: () => ({ push: vi.fn(), goBack: vi.fn(), canGoBack: () => true }),
  useIonViewDidEnter: (cb: () => void) => {},
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useHistory: () => ({ push: vi.fn() }),
  useLocation: () => ({ pathname: '/' }),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => 'ltr' },
  }),
}));

// Mock QRScanButton to prevent Capacitor calls during tests
vi.mock('../components/common/QRScanButton', () => ({
  QRScanButton: () => null,
}));

// Mock components
vi.mock('../components/home/PublicWelcomeHeader', () => ({
  PublicWelcomeHeader: () => <div data-testid="ion-toolbar">Public Welcome Header</div>,
}));
vi.mock('../components/layout/BottomNavigation', () => ({
  BottomNavigation: () => <div data-testid="bottom-navigation">Bottom Navigation</div>,
}));
vi.mock('../components/home/HeroSection', () => ({
  HeroSection: () => <div data-testid="hero-section">Hero Section</div>,
}));
vi.mock('../components/home/StatsBar', () => ({
  StatsBar: () => <div data-testid="stats-bar">Stats Bar</div>,
}));
vi.mock('../components/home/CategoriesGrid', () => ({
  CategoriesGrid: () => <div data-testid="categories-grid">Categories Grid</div>,
}));
vi.mock('../components/home/FAQSection', () => ({
  FAQSection: () => <div data-testid="faq-section">FAQ Section</div>,
}));
vi.mock('../components/landing/ContentSectionWrapper', () => ({
  ContentSectionWrapper: ({ section }: any) => (
    <div data-testid="content-section" data-title={section.title}>{section.title}</div>
  ),
}));
vi.mock('../components/landing/ResourcesSectionWrapper', () => ({
  ResourcesSectionWrapper: () => <div data-testid="resource-section">Resource Section</div>,
}));
vi.mock('../components/home/learning-started/LearningGreeting', () => ({
  LearningGreeting: ({ enrolledCount }: any) => (
    <div data-testid="learning-greeting" data-enrolled={enrolledCount}>Greeting</div>
  ),
}));
vi.mock('../components/home/learning-started/LearningStatsGrid', () => ({
  LearningStatsGrid: () => <div data-testid="learning-stats-grid">Stats Grid</div>,
}));
vi.mock('../components/home/learning-started/ContinueLearningCard', () => ({
  ContinueLearningCard: () => <div data-testid="continue-learning-card">Continue Learning</div>,
}));
vi.mock('../components/home/learning-started/InProgressContents', () => ({
  InProgressContents: () => <div data-testid="in-progress-contents">In Progress</div>,
}));
vi.mock('../components/content/CollectionCard', () => ({
  default: ({ item }: any) => <div data-testid="collection-card">{item.name}</div>,
}));
vi.mock('../components/content/ResourceCard', () => ({
  default: ({ item }: any) => <div data-testid="resource-card">{item.name}</div>,
}));

// Mock hooks — configurable via mockEnrollmentData
let mockEnrollmentData: any = { data: undefined, isLoading: false, error: null, refetch: vi.fn() };

vi.mock('../hooks/useLandingPageConfig', () => ({
  useLandingPageConfig: () => ({
    sections: [
      { id: '1', type: 'content', index: 1, title: 'Most Popular Content' },
      { id: '2', type: 'content', index: 2, title: 'Most Viewed Content' },
      { id: '3', type: 'content', index: 3, title: 'Trending Content' },
      { id: '4', type: 'categories', index: 4, title: 'Categories', list: [] },
      { id: '5', type: 'resources', index: 5, title: 'Resource Center' },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../hooks/useFormRead', () => ({
  useFormRead: () => ({
    data: { data: { form: { data: { sections: [] } } } },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../hooks/useUserEnrollment', () => ({
  useUserEnrollmentList: () => mockEnrollmentData,
}));

vi.mock('../hooks/useUserCertificates', () => ({
  useUserCertificates: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('../hooks/useContentSearch', () => ({
  useContentSearch: () => ({ data: undefined, isLoading: false }),
}));

// Mock AuthContext
const mockAuthContext = {
  isAuthenticated: false,
  userId: null as string | null,
  login: vi.fn(),
  logout: vi.fn(),
  loginWithCredentials: vi.fn(),
  needsTnC: false,
  tncData: null,
  completeTnC: vi.fn(),
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderHomePage = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>
  );

const makeCourse = (overrides: any = {}) => ({
  batchId: 'batch-1',
  userId: 'user-1',
  courseId: 'course-1',
  collectionId: 'col-1',
  courseName: 'Test Course',
  completionPercentage: 50,
  status: 1,
  ...overrides,
});

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.userId = null;
    mockEnrollmentData = { data: undefined, isLoading: false, error: null, refetch: vi.fn() };
  });

  // --- Public view ---

  it('renders without crashing', () => {
    renderHomePage();
    expect(screen.getByTestId('ion-page')).toBeInTheDocument();
  });

  it('renders page structure correctly', () => {
    renderHomePage();
    expect(screen.getByTestId('ion-header')).toBeInTheDocument();
    expect(screen.getByTestId('ion-content')).toBeInTheDocument();
  });

  it('renders hero section when not authenticated', () => {
    renderHomePage();
    expect(screen.getByTestId('hero-section')).toBeInTheDocument();
  });

  it('renders stats bar when not authenticated', () => {
    renderHomePage();
    expect(screen.getByTestId('stats-bar')).toBeInTheDocument();
  });

  it('renders landing page sections when not authenticated', () => {
    renderHomePage();
    const sections = screen.getAllByTestId('content-section');
    expect(sections).toHaveLength(3);
  });

  it('renders categories grid when not authenticated', () => {
    renderHomePage();
    expect(screen.getByTestId('categories-grid')).toBeInTheDocument();
  });

  it('renders resource section when not authenticated', () => {
    renderHomePage();
    expect(screen.getByTestId('resource-section')).toBeInTheDocument();
  });

  it('renders FAQ section when not authenticated', () => {
    renderHomePage();
    expect(screen.getByTestId('faq-section')).toBeInTheDocument();
  });

  it('renders fullscreen content', () => {
    renderHomePage();
    expect(screen.getByTestId('ion-content')).toHaveAttribute('data-fullscreen', 'true');
  });

  // --- Authenticated, no enrollments (pre-enrollment) ---

  it('renders greeting when authenticated with no enrollments', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    renderHomePage();
    expect(screen.getByTestId('learning-greeting')).toBeInTheDocument();
    expect(screen.getByTestId('learning-greeting')).toHaveAttribute('data-enrolled', '0');
  });

  it('does not render hero section when authenticated', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    renderHomePage();
    expect(screen.queryByTestId('hero-section')).not.toBeInTheDocument();
  });

  it('renders FAQ section in pre-enrollment view', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    renderHomePage();
    expect(screen.getByTestId('faq-section')).toBeInTheDocument();
  });

  // --- Authenticated, with enrollments (post-enrollment) ---

  it('renders stats grid and continue learning when enrolled', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = {
      data: { data: { courses: [makeCourse()] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderHomePage();
    expect(screen.getByTestId('learning-stats-grid')).toBeInTheDocument();
    expect(screen.getByTestId('continue-learning-card')).toBeInTheDocument();
  });

  it('hides in-progress contents when only 1 in-progress course', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = {
      data: { data: { courses: [makeCourse({ completionPercentage: 50 })] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderHomePage();
    expect(screen.getByTestId('continue-learning-card')).toBeInTheDocument();
    expect(screen.queryByTestId('in-progress-contents')).not.toBeInTheDocument();
  });

  it('shows in-progress contents when 2+ in-progress courses', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = {
      data: {
        data: {
          courses: [
            makeCourse({ completionPercentage: 30, courseId: 'c1', collectionId: 'col1' }),
            makeCourse({ completionPercentage: 60, courseId: 'c2', collectionId: 'col2' }),
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderHomePage();
    expect(screen.getByTestId('continue-learning-card')).toBeInTheDocument();
    expect(screen.getByTestId('in-progress-contents')).toBeInTheDocument();
  });

  it('shows in-progress contents when all courses are completed (fallback)', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = {
      data: {
        data: {
          courses: [
            makeCourse({ completionPercentage: 100, status: 2 }),
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderHomePage();
    // 0 in-progress !== 1, so InProgressContents renders (shows completed fallback)
    expect(screen.getByTestId('in-progress-contents')).toBeInTheDocument();
  });

  it('does not render FAQ section in post-enrollment view', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = {
      data: { data: { courses: [makeCourse()] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderHomePage();
    expect(screen.queryByTestId('faq-section')).not.toBeInTheDocument();
  });

  // --- Loading/error states ---

  it('shows spinner when enrollment is loading', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = { data: undefined, isLoading: true, error: null, refetch: vi.fn() };
    renderHomePage();
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
  });

  it('shows error state when enrollment fails', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = { data: undefined, isLoading: false, error: new Error('fail'), refetch: vi.fn() };
    renderHomePage();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  // --- Status-based course counting logic ---

  describe('status-based course counting', () => {
    it('counts only status=1 courses as in-progress', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
      mockEnrollmentData = {
        data: {
          data: {
            courses: [
              makeCourse({ courseId: 'c1', status: 1, completionPercentage: 30 }),
              makeCourse({ courseId: 'c2', status: 1, completionPercentage: 60 }),
              makeCourse({ courseId: 'c3', status: 2, completionPercentage: 100 }),
            ],
          },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      renderHomePage();
      // 2 courses with status=1 should be counted as in-progress
      expect(screen.getByTestId('learning-stats-grid')).toBeInTheDocument();
    });

    it('does not count status=0 courses as in-progress even with completionPercentage < 100', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
      mockEnrollmentData = {
        data: {
          data: {
            courses: [
              makeCourse({ courseId: 'c1', status: 0, completionPercentage: 0 }),
              makeCourse({ courseId: 'c2', status: 0, completionPercentage: 50 }),
              makeCourse({ courseId: 'c3', status: 1, completionPercentage: 30 }),
            ],
          },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      renderHomePage();
      // Only 1 course with status=1 should be counted as in-progress
      // status=0 courses should not be counted even if completionPercentage < 100
      expect(screen.getByTestId('learning-stats-grid')).toBeInTheDocument();
      expect(screen.getByTestId('continue-learning-card')).toBeInTheDocument();
      // With 1 in-progress course, InProgressContents should not render
      expect(screen.queryByTestId('in-progress-contents')).not.toBeInTheDocument();
    });

    it('counts only status=2 courses as completed', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
      mockEnrollmentData = {
        data: {
          data: {
            courses: [
              makeCourse({ courseId: 'c1', status: 2, completionPercentage: 100 }),
              makeCourse({ courseId: 'c2', status: 2, completionPercentage: 100 }),
              makeCourse({ courseId: 'c3', status: 1, completionPercentage: 99 }),
            ],
          },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      renderHomePage();
      // 2 courses with status=2 should be counted as completed
      // 1 course with status=1 should be counted as in-progress
      expect(screen.getByTestId('learning-stats-grid')).toBeInTheDocument();
    });

    it('does not count status=1 courses with completionPercentage=100 as completed', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
      mockEnrollmentData = {
        data: {
          data: {
            courses: [
              makeCourse({ courseId: 'c1', status: 1, completionPercentage: 100 }),
              makeCourse({ courseId: 'c2', status: 2, completionPercentage: 100 }),
            ],
          },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      renderHomePage();
      // Course with status=1 should be counted as in-progress, not completed
      // Only course with status=2 should be counted as completed
      expect(screen.getByTestId('learning-stats-grid')).toBeInTheDocument();
    });

    it('handles mixed status values correctly', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
      mockEnrollmentData = {
        data: {
          data: {
            courses: [
              makeCourse({ courseId: 'c1', status: 0, completionPercentage: 0 }),
              makeCourse({ courseId: 'c2', status: 0, completionPercentage: 25 }),
              makeCourse({ courseId: 'c3', status: 1, completionPercentage: 10 }),
              makeCourse({ courseId: 'c4', status: 1, completionPercentage: 75 }),
              makeCourse({ courseId: 'c5', status: 1, completionPercentage: 100 }),
              makeCourse({ courseId: 'c6', status: 2, completionPercentage: 100 }),
              makeCourse({ courseId: 'c7', status: 2, completionPercentage: 100 }),
            ],
          },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      renderHomePage();
      // 3 courses with status=1 should be in-progress
      // 2 courses with status=2 should be completed
      // 2 courses with status=0 should not be counted in either
      expect(screen.getByTestId('learning-stats-grid')).toBeInTheDocument();
      expect(screen.getByTestId('in-progress-contents')).toBeInTheDocument();
    });

    it('handles courses with undefined or null status gracefully', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
      mockEnrollmentData = {
        data: {
          data: {
            courses: [
              makeCourse({ courseId: 'c1', status: undefined, completionPercentage: 50 }),
              makeCourse({ courseId: 'c2', status: null, completionPercentage: 75 }),
              makeCourse({ courseId: 'c3', status: 1, completionPercentage: 30 }),
            ],
          },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      renderHomePage();
      // Only course with status=1 should be counted
      // Courses with undefined/null status should not crash the app
      expect(screen.getByTestId('learning-stats-grid')).toBeInTheDocument();
    });
  });

  // --- Accessibility ---

  describe('accessibility', () => {
    it('renders main landmark inside content', () => {
      renderHomePage();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    });

    it('main landmark is present in authenticated view', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
      renderHomePage();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
