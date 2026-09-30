import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import LearningPathAssessmentPage from './LearningPathAssessmentPage';

const mockRouterPush = vi.fn();
const mockRouterGoBack = vi.fn();
vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  useIonRouter: () => ({ push: mockRouterPush, goBack: mockRouterGoBack }),
}));

vi.mock('./LearningPathAssessmentPage.css', () => ({}));
vi.mock('../components/icons/CollectionIcons', () => ({ BackIcon: () => <span data-testid="back-icon" /> }));
vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error }: any) => (
    <div data-testid="page-loader">{message && <span>{message}</span>}{error && <span>{error}</span>}</div>
  ),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ pathId: 'lp1', contextId: undefined }),
  useLocation: () => ({ pathname: '/learning-path/lp1/prior', state: undefined }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { mockUseLearningPath, mockUseAssessmentReadMap, mockUseStoredAssessmentScores } = vi.hoisted(() => ({
  mockUseLearningPath: vi.fn(),
  mockUseAssessmentReadMap: vi.fn(() => ({})),
  mockUseStoredAssessmentScores: vi.fn(() => ({})),
}));
vi.mock('../hooks/useLearningPath', () => ({ useLearningPath: mockUseLearningPath }));
vi.mock('../hooks/useAssessmentScores', () => ({
  useAssessmentReadMap: mockUseAssessmentReadMap,
  useStoredAssessmentScores: mockUseStoredAssessmentScores,
}));

const priorCourse = {
  identifier: 'prior1',
  name: 'Data readiness check',
  leafNodesCount: 1,
  leafIds: ['q1'],
  skills: ['SQL basics'],
  isAssessmentCourse: true,
  questionCount: 1,
};

function baseLp(overrides: Record<string, unknown> = {}) {
  return {
    model: { priorAssessment: priorCourse, outcomeAssessment: undefined, levels: [{ identifier: 'l1', name: 'L1' }] },
    policy: 'Diagnostic',
    outcomeState: { unlocked: false },
    enrollment: { effectiveContextId: 'ctx1' },
    pathSummary: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

describe('LearningPathAssessmentPage (prior variant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAssessmentReadMap.mockReturnValue({});
    mockUseStoredAssessmentScores.mockReturnValue({});
  });

  it('shows the loading state', () => {
    mockUseLearningPath.mockReturnValue(baseLp({ isLoading: true }));
    render(<LearningPathAssessmentPage variant="prior" />);
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows not-found when the model has no matching assessment course', () => {
    mockUseLearningPath.mockReturnValue(baseLp({ model: { priorAssessment: undefined, outcomeAssessment: undefined, levels: [] } }));
    render(<LearningPathAssessmentPage variant="prior" />);
    expect(screen.getByText('learningPath.notFound')).toBeInTheDocument();
  });

  it('renders the assessment title, question count and skills', () => {
    mockUseLearningPath.mockReturnValue(baseLp());
    render(<LearningPathAssessmentPage variant="prior" />);
    expect(screen.getByText('Data readiness check')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // question count
    expect(screen.getByText('SQL basics')).toBeInTheDocument();
  });

  it('is always unlocked for the prior variant, showing Start assessment', () => {
    mockUseLearningPath.mockReturnValue(baseLp());
    render(<LearningPathAssessmentPage variant="prior" />);
    expect(screen.getByText('learningPath.startAssessment')).toBeInTheDocument();
  });

  it('shows the "skip to level 1" link only for Fixed policy', () => {
    mockUseLearningPath.mockReturnValue(baseLp({ policy: 'Fixed' }));
    render(<LearningPathAssessmentPage variant="prior" />);
    expect(screen.getByText('learningPath.skipToLevel1')).toBeInTheDocument();
  });

  it('does not show the skip link for Diagnostic policy', () => {
    mockUseLearningPath.mockReturnValue(baseLp({ policy: 'Diagnostic' }));
    render(<LearningPathAssessmentPage variant="prior" />);
    expect(screen.queryByText('learningPath.skipToLevel1')).not.toBeInTheDocument();
  });

  it('navigates to the player on Start assessment', () => {
    mockUseLearningPath.mockReturnValue(baseLp());
    render(<LearningPathAssessmentPage variant="prior" />);
    fireEvent.click(screen.getByText('learningPath.startAssessment'));
    expect(mockRouterPush).toHaveBeenCalledWith(
      '/learning-path/lp1/course/prior1/content/q1',
      'forward',
      'push'
    );
  });
});

describe('LearningPathAssessmentPage (outcome variant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAssessmentReadMap.mockReturnValue({});
    mockUseStoredAssessmentScores.mockReturnValue({});
  });

  it('shows a locked note when the outcome is not yet unlocked', () => {
    mockUseLearningPath.mockReturnValue(
      baseLp({ model: { priorAssessment: undefined, outcomeAssessment: priorCourse, levels: [] }, outcomeState: { unlocked: false } })
    );
    render(<LearningPathAssessmentPage variant="outcome" />);
    expect(screen.getByText('learningPath.outcomeLocked')).toBeInTheDocument();
    expect(screen.queryByText('learningPath.startAssessment')).not.toBeInTheDocument();
  });

  it('shows Start assessment once the outcome is unlocked', () => {
    mockUseLearningPath.mockReturnValue(
      baseLp({ model: { priorAssessment: undefined, outcomeAssessment: priorCourse, levels: [] }, outcomeState: { unlocked: true } })
    );
    render(<LearningPathAssessmentPage variant="outcome" />);
    expect(screen.getByText('learningPath.startAssessment')).toBeInTheDocument();
  });
});
