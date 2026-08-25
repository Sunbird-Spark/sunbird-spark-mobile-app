import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyLearningPage from './MyLearningPage';

// Mock router
const mockPush = vi.fn();

// Mock Ionic
vi.mock('@ionic/react', () => ({
  IonContent: ({ children, fullscreen }: any) => (
    <div data-testid="ion-content" data-fullscreen={fullscreen}>{children}</div>
  ),
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonSpinner: () => <div data-testid="ion-spinner">Loading...</div>,
  IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonTitle: ({ children }: any) => <h1 data-testid="ion-title">{children}</h1>,
  IonButtons: ({ children }: any) => <div>{children}</div>,
  useIonRouter: () => ({ push: mockPush, goBack: vi.fn(), canGoBack: () => true }),
  useIonViewDidEnter: (cb: () => void) => {},
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/profile/my-learning', search: '' }),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      const map: Record<string, string> = {
        myLearning: 'My Learning',
        courses: 'Courses',
        activeCourses: 'Active Courses',
        completed: 'Completed',
        upcoming: 'Upcoming',
        signInToAccess: 'Sign in to access your learning journey',
        signIn: 'Sign In',
        noActiveCourses: 'No active courses',
        noCompletedCourses: 'No completed courses yet.',
        noUpcomingCourses: 'No upcoming courses yet.',
        learningProgress: 'Learning Progress',
        lessonsVisited: 'Lessons visited',
        coursesCompleted: 'Courses completed',
        recommendedContent: 'Recommended Content',
        viewAll: 'View All',
        viewMoreCourses: 'View More Courses',
        activeLearningPaths: 'Active Learning Paths',
        noActiveLearningPaths: 'No active learning paths',
        noCompletedLearningPaths: 'No completed learning paths yet.',
        noUpcomingLearningPaths: 'No upcoming learning paths yet.',
        viewMoreLearningPaths: 'View More Learning Paths',
        skillsGained: 'Skills gained',
        learningPathsCompleted: 'Learning Paths completed',
        completedPercent: `Completed: ${opts?.percent ?? 0}%`,
        error: 'Error',
      };
      return map[key] || key;
    },
  }),
}));

// Mock QRScanButton to prevent Capacitor calls during tests
vi.mock('../components/common/QRScanButton', () => ({
  QRScanButton: () => null,
}));

// Mock components
vi.mock('../components/common/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector" />,
}));
vi.mock('../components/layout/BottomNavigation', () => ({
  BottomNavigation: () => <div data-testid="bottom-navigation" />,
}));
vi.mock('../components/content/CollectionCard', () => ({
  default: ({ item }: any) => <div data-testid="collection-card">{item.name}</div>,
}));
vi.mock('../components/content/ResourceCard', () => ({
  default: ({ item }: any) => <div data-testid="resource-card">{item.name}</div>,
}));
vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error, onRetry }: any) => (
    <div data-testid="page-loader" data-error={error || undefined}>
      {error ? <span>Something went wrong</span> : <span>{message || 'Loading...'}</span>}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

// Mock hooks — configurable
let mockEnrollmentData: any = { data: undefined, isLoading: false, error: null, refetch: vi.fn() };

vi.mock('../hooks/useUserEnrollment', () => ({
  useUserEnrollmentList: () => mockEnrollmentData,
}));

vi.mock('../hooks/useContentSearch', () => ({
  useContentSearch: () => ({ data: undefined, isLoading: false }),
}));

let mockMySkills: any = {
  entries: [],
  summaries: [],
  aggregate: { totalSkills: 0, gainedSkills: 0, pendingSkills: 0, pathsCompleted: 0, pathsOngoing: 0 },
  analyzedCount: 0,
  totalCount: 0,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};
const mockUseMySkills = vi.fn(() => mockMySkills);
vi.mock('../hooks/useMySkills', () => ({ useMySkills: (o?: any) => mockUseMySkills(o) }));

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

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderPage = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <MyLearningPage />
    </QueryClientProvider>
  );

const makeCourse = (overrides: any = {}) => ({
  batchId: 'batch-1',
  userId: 'user-1',
  courseId: 'course-1',
  collectionId: 'col-1',
  courseName: 'Test Course',
  completionPercentage: 50,
  progress: 10,
  leafNodesCount: 20,
  status: 1,
  batch: { startDate: '2024-01-01' },
  ...overrides,
});

describe('MyLearningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.userId = null;
    mockEnrollmentData = { data: undefined, isLoading: false, error: null, refetch: vi.fn() };
  });

  // --- Unauthenticated guard ---

  it('shows sign-in prompt when not authenticated', () => {
    renderPage();
    expect(screen.getByText('Sign in to access your learning journey')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('navigates to /sign-in when sign-in button clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('Sign In'));
    expect(mockPush).toHaveBeenCalledWith('/sign-in', 'forward', 'push');
    expect(sessionStorage.getItem('auth_return_to')).toBe('/profile/my-learning');
  });

  // --- Loading/error ---

  it('shows page loader when loading', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = { data: undefined, isLoading: true, error: null, refetch: vi.fn() };
    renderPage();
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows error with retry', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    const mockRefetch = vi.fn();
    mockEnrollmentData = { data: undefined, isLoading: false, error: new Error('fail'), refetch: mockRefetch };
    renderPage();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls refetch when retry button is clicked on error', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    const mockRefetch = vi.fn();
    mockEnrollmentData = { data: undefined, isLoading: false, error: new Error('fail'), refetch: mockRefetch };
    renderPage();
    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows upcoming courses with future batch start dates', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    const futureCourse = makeCourse({
      courseName: 'Future Course',
      completionPercentage: 0,
      batch: { startDate: '2099-01-01' },
    });
    mockEnrollmentData = {
      data: { data: { courses: [futureCourse] } },
      isLoading: false, error: null, refetch: vi.fn(),
    };
    renderPage();
    fireEvent.click(screen.getByText('Upcoming'));
    expect(screen.getByText('Future Course')).toBeInTheDocument();
  });

  // --- Tabs ---

  it('renders three tabs', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    renderPage();
    expect(screen.getByText('Active Courses')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('shows active courses by default', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = {
      data: { data: { courses: [makeCourse({ courseName: 'Active Course', completionPercentage: 30 })] } },
      isLoading: false, error: null, refetch: vi.fn(),
    };
    renderPage();
    expect(screen.getByText('Active Course')).toBeInTheDocument();
  });

  it('shows empty state for active tab when no courses', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    renderPage();
    expect(screen.getByText('No active courses')).toBeInTheDocument();
  });

  it('switches to completed tab', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = {
      data: { data: { courses: [makeCourse({ courseName: 'Done Course', completionPercentage: 100 })] } },
      isLoading: false, error: null, refetch: vi.fn(),
    };
    renderPage();
    fireEvent.click(screen.getByText('Completed'));
    expect(screen.getByText('Done Course')).toBeInTheDocument();
  });

  it('shows empty state for completed tab', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = {
      data: { data: { courses: [makeCourse({ completionPercentage: 50 })] } },
      isLoading: false, error: null, refetch: vi.fn(),
    };
    renderPage();
    fireEvent.click(screen.getByText('Completed'));
    expect(screen.getByText('No completed courses yet.')).toBeInTheDocument();
  });

  it('shows empty state for upcoming tab', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    renderPage();
    fireEvent.click(screen.getByText('Upcoming'));
    expect(screen.getByText('No upcoming courses yet.')).toBeInTheDocument();
  });

  // --- Learning Progress ---

  it('renders learning progress section', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    // lessonsVisited = Math.round(leafNodesCount * completionPercentage/100)
    // = Math.round(30 * 50/100) = Math.round(15) = 15 → renders "15/30"
    mockEnrollmentData = {
      data: { data: { courses: [makeCourse({ leafNodesCount: 30, completionPercentage: 50 })] } },
      isLoading: false, error: null, refetch: vi.fn(),
    };
    renderPage();
    expect(screen.getByText('Learning Progress')).toBeInTheDocument();
    expect(screen.getByText('15/30')).toBeInTheDocument();
    expect(screen.getByText('Lessons visited')).toBeInTheDocument();
  });

  // --- View More ---

  it('shows view more link on active tab', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = {
      data: { data: { courses: [makeCourse()] } },
      isLoading: false, error: null, refetch: vi.fn(),
    };
    renderPage();
    expect(screen.getByText('View More Courses')).toBeInTheDocument();
  });

  it('navigates to explore on view more click', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.userId = 'user-1';
    mockEnrollmentData = {
      data: { data: { courses: [makeCourse()] } },
      isLoading: false, error: null, refetch: vi.fn(),
    };
    renderPage();
    fireEvent.click(screen.getByText('View More Courses'));
    expect(mockPush).toHaveBeenCalledWith('/explore', 'forward', 'push');
  });

  // ── Accessibility Tests ──

  describe('accessibility', () => {
    it('tab bar has role="tablist"', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
      renderPage();
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
    });

    it('tabs have role="tab" and aria-selected', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
      renderPage();
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);

      // Active Courses tab is selected by default
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
    });

    it('switching tabs updates aria-selected', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
      renderPage();
      const tabs = screen.getAllByRole('tab');

      fireEvent.click(tabs[1]); // Click Completed tab
      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('does not render notification bell button', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
      renderPage();
      expect(screen.queryByLabelText('notifications')).not.toBeInTheDocument();
    });

    it('renders main landmark in authenticated view', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
      renderPage();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    });

    it('renders main landmark in unauthenticated view', () => {
      renderPage();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Courses | Learning Paths type switcher', () => {
    beforeEach(() => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.userId = 'user-1';
    });

    it('does not render the switcher when the learner has no enrolled Learning Paths', () => {
      mockEnrollmentData = {
        data: { data: { courses: [makeCourse({ content: { primaryCategory: 'Course' } })] } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      renderPage();
      expect(screen.queryByText('learningPaths')).not.toBeInTheDocument();
    });

    it('renders the switcher and routes a Learning Path card to /learning-path/:id once one is enrolled', () => {
      mockEnrollmentData = {
        data: {
          data: {
            courses: [
              makeCourse({ courseId: 'course-1', collectionId: 'col-1', content: { primaryCategory: 'Course' } }),
              makeCourse({ courseId: 'lp-1', collectionId: 'lp-1', courseName: 'Test Path', content: { primaryCategory: 'Learning Path' } }),
            ],
          },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      renderPage();
      expect(screen.getByText('learningPaths')).toBeInTheDocument();

      // Default tab is Courses — the LP card is not shown yet.
      expect(screen.queryByText('Test Path')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('learningPaths'));
      expect(screen.getByText('Test Path')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Test Path'));
      expect(mockPush).toHaveBeenCalledWith('/learning-path/lp-1');
    });

    it('swaps the Learning Progress metrics to skills / paths completed on the Learning Paths tab', () => {
      mockMySkills = {
        ...mockMySkills,
        aggregate: { totalSkills: 3, gainedSkills: 3, pendingSkills: 0, pathsCompleted: 5, pathsOngoing: 0 },
        totalCount: 5,
      };
      mockEnrollmentData = {
        data: {
          data: {
            courses: [
              makeCourse({ leafNodesCount: 30, completionPercentage: 50, content: { primaryCategory: 'Course' } }),
              makeCourse({ courseId: 'lp-1', collectionId: 'lp-1', courseName: 'Test Path', content: { primaryCategory: 'Learning Path' } }),
            ],
          },
        },
        isLoading: false, error: null, refetch: vi.fn(),
      };
      renderPage();

      // Courses tab: course-shaped metrics, and the skills fan-out stays off.
      expect(screen.getByText('Lessons visited')).toBeInTheDocument();
      expect(mockUseMySkills).toHaveBeenCalledWith({ enabled: false });

      fireEvent.click(screen.getByText('learningPaths'));

      expect(screen.getByText('Skills gained')).toBeInTheDocument();
      expect(screen.getByText('3/3')).toBeInTheDocument();
      expect(screen.getByText('Learning Paths completed')).toBeInTheDocument();
      expect(screen.getByText('5/5')).toBeInTheDocument();
      expect(screen.queryByText('Lessons visited')).not.toBeInTheDocument();
      expect(screen.queryByText('Courses completed')).not.toBeInTheDocument();
      expect(mockUseMySkills).toHaveBeenCalledWith({ enabled: true });
    });

    it('uses Learning Path wording for the empty-state placeholders', () => {
      // A future batch start date puts the only LP on the Upcoming tab, leaving
      // Active and Completed empty. Note `applyLearningPathProgress` recomputes
      // completionPercentage from the viewer summaries, so seeding a "100%" LP
      // here would NOT land it on the Completed tab.
      mockEnrollmentData = {
        data: {
          data: {
            courses: [
              makeCourse({
                courseId: 'lp-1', collectionId: 'lp-1', courseName: 'Test Path',
                completionPercentage: 0,
                batch: { startDate: '2099-01-01' },
                content: { primaryCategory: 'Learning Path' },
              }),
            ],
          },
        },
        isLoading: false, error: null, refetch: vi.fn(),
      };
      renderPage();
      fireEvent.click(screen.getByText('learningPaths'));

      expect(screen.getByText('Active Learning Paths')).toBeInTheDocument();
      expect(screen.getByText('No active learning paths')).toBeInTheDocument();
      expect(screen.queryByText('No active courses')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Completed'));
      expect(screen.getByText('No completed learning paths yet.')).toBeInTheDocument();
    });

    it('uses Learning Path wording for the view-more link', () => {
      mockEnrollmentData = {
        data: {
          data: {
            courses: [
              makeCourse({ courseId: 'lp-1', collectionId: 'lp-1', courseName: 'Test Path', content: { primaryCategory: 'Learning Path' } }),
            ],
          },
        },
        isLoading: false, error: null, refetch: vi.fn(),
      };
      renderPage();
      fireEvent.click(screen.getByText('learningPaths'));

      expect(screen.getByText('View More Learning Paths')).toBeInTheDocument();
      expect(screen.queryByText('View More Courses')).not.toBeInTheDocument();
    });

    it('filters phantom Learning Path fan-out rows out of both lists', () => {
      mockEnrollmentData = {
        data: {
          data: {
            courses: [
              makeCourse({ courseId: 'lp-1', collectionId: 'lp-1', courseName: 'Test Path', content: { primaryCategory: 'Learning Path' } }),
              // Composite fan-out record for an inner course — must not show up anywhere.
              makeCourse({ courseId: 'inner-1', collectionId: 'inner-1', courseName: 'Inner Course', batchId: 'lp-1-ctx:inner-1', content: { primaryCategory: 'Course' } }),
            ],
          },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      renderPage();
      expect(screen.queryByText('Inner Course')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('learningPaths'));
      expect(screen.getByText('Test Path')).toBeInTheDocument();
    });
  });
});
