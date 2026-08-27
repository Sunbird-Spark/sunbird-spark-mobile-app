import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import LearningPathLevelPage from './LearningPathLevelPage';

const mockRouterPush = vi.fn();
const mockRouterGoBack = vi.fn();
vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  useIonRouter: () => ({ push: mockRouterPush, goBack: mockRouterGoBack }),
}));

vi.mock('./LearningPathLevelPage.css', () => ({}));
vi.mock('../components/icons/CollectionIcons', () => ({ BackIcon: () => <span data-testid="back-icon" /> }));
vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error }: any) => (
    <div data-testid="page-loader">{message && <span>{message}</span>}{error && <span>{error}</span>}</div>
  ),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ pathId: 'lp1', contextId: undefined, levelId: 'l1' }),
  useLocation: () => ({ pathname: '/learning-path/lp1/level/l1', state: undefined }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
  }),
}));

const { mockUseLearningPath } = vi.hoisted(() => ({ mockUseLearningPath: vi.fn() }));
vi.mock('../hooks/useLearningPath', () => ({ useLearningPath: mockUseLearningPath }));
vi.mock('../services/learningPath/learningPathProgress', () => ({
  computeCourseProgress: vi.fn(() => ({ pct: 40, completed: 0, total: 2, status: 'active' })),
}));

function baseLp(overrides: Record<string, unknown> = {}) {
  return {
    model: {
      name: 'Path A',
      levels: [
        {
          identifier: 'l1',
          name: 'Foundations',
          description: 'Learn the basics',
          skills: ['Skill A'],
          courses: [
            { identifier: 'c1', name: 'Course 1', leafNodesCount: 2, leafIds: ['r1', 'r2'], skills: ['Skill A'], isAssessmentCourse: false },
          ],
        },
      ],
      allSkills: ['Skill A'],
      courseTotal: 1,
    },
    levelStatuses: ['active'],
    levelProgress: [{ pct: 40, completed: 0, total: 1, doneCourses: 0 }],
    summaryByCollectionId: new Map(),
    pathSummary: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

describe('LearningPathLevelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the loading state', () => {
    mockUseLearningPath.mockReturnValue(baseLp({ isLoading: true }));
    render(<LearningPathLevelPage />);
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows not-found when the levelId does not match any level in the model', () => {
    mockUseLearningPath.mockReturnValue(baseLp({ model: { ...baseLp().model, levels: [] } }));
    render(<LearningPathLevelPage />);
    expect(screen.getByText('learningPath.notFound')).toBeInTheDocument();
  });

  it('renders the level title, status, stat strip and course rows', () => {
    mockUseLearningPath.mockReturnValue(baseLp());
    render(<LearningPathLevelPage />);
    expect(screen.getByText(/Foundations/)).toBeInTheDocument();
    expect(screen.getByText('Course 1')).toBeInTheDocument();
    expect(screen.getByText('Learn the basics')).toBeInTheDocument();
    expect(screen.getByText('Skill A')).toBeInTheDocument();
  });

  it('navigates to the player when an unlocked course row is clicked', () => {
    mockUseLearningPath.mockReturnValue(baseLp());
    render(<LearningPathLevelPage />);
    fireEvent.click(screen.getByText('Course 1'));
    expect(mockRouterPush).toHaveBeenCalledWith(
      '/learning-path/lp1/course/c1/content/r1',
      'forward',
      'push'
    );
  });

  it('does not navigate when the level is locked', () => {
    mockUseLearningPath.mockReturnValue(baseLp({ levelStatuses: ['locked'] }));
    render(<LearningPathLevelPage />);
    fireEvent.click(screen.getByText('Course 1'));
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
