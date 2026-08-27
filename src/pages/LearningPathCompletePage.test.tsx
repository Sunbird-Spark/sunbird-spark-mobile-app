import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import LearningPathCompletePage from './LearningPathCompletePage';

const mockRouterPush = vi.fn();
vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  IonModal: ({ isOpen, children }: any) => (isOpen ? <div data-testid="ion-modal">{children}</div> : null),
  useIonRouter: () => ({ push: mockRouterPush, goBack: vi.fn() }),
}));

vi.mock('./LearningPathCompletePage.css', () => ({}));
vi.mock('../components/icons/CollectionIcons', () => ({ BackIcon: () => <span data-testid="back-icon" /> }));
vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error }: any) => (
    <div data-testid="page-loader">{message && <span>{message}</span>}{error && <span>{error}</span>}</div>
  ),
}));
vi.mock('../components/common/ProgressRing', () => ({
  default: ({ children }: any) => <div data-testid="progress-ring">{children}</div>,
}));
vi.mock('../components/learningPath/LPScoreRows', () => ({
  default: ({ priorScore, outcomeScore }: any) => (
    <div data-testid="lp-score-rows" data-prior={JSON.stringify(priorScore)} data-outcome={JSON.stringify(outcomeScore)} />
  ),
}));
vi.mock('../components/learningPath/LPCertificateCard', () => ({
  default: ({ unlocked }: any) => <div data-testid="lp-cert-card" data-unlocked={unlocked} />,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ pathId: 'lp1', contextId: undefined }),
  useLocation: () => ({ pathname: '/learning-path/lp1/complete', state: undefined }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { mockUseLearningPath } = vi.hoisted(() => ({ mockUseLearningPath: vi.fn() }));
vi.mock('../hooks/useLearningPath', () => ({ useLearningPath: mockUseLearningPath }));

const priorCourse = { identifier: 'prior1', name: 'Prior', leafNodesCount: 1, leafIds: ['q1'], skills: [], isAssessmentCourse: true };
const outcomeCourse = { identifier: 'outcome1', name: 'Outcome', leafNodesCount: 1, leafIds: ['q2'], skills: [], isAssessmentCourse: true };

function baseLp(overrides: Record<string, unknown> = {}) {
  return {
    model: {
      name: 'Path A',
      levels: [{ identifier: 'l1', name: 'L1', index: 0, skills: [], courses: [] }],
      allSkills: ['Skill A'],
      priorAssessment: undefined,
      outcomeAssessment: undefined,
    },
    pathSummary: { assessmentStatus: { prior1: { score: 8, max_score: 10 }, outcome1: { score: 9, max_score: 10 } } },
    certificateUnlocked: true,
    enrollment: { certPreviewUrl: 'https://example.com/cert.png' },
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

describe('LearningPathCompletePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the loading state', () => {
    mockUseLearningPath.mockReturnValue(baseLp({ isLoading: true }));
    render(<LearningPathCompletePage />);
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows not-found when the path has no levels', () => {
    mockUseLearningPath.mockReturnValue(baseLp({ model: { ...baseLp().model, levels: [] } }));
    render(<LearningPathCompletePage />);
    expect(screen.getByText('learningPath.notFound')).toBeInTheDocument();
  });

  it('renders the completion hero, path name, certificate card and skills', () => {
    mockUseLearningPath.mockReturnValue(baseLp());
    render(<LearningPathCompletePage />);
    expect(screen.getByText('learningPath.pathComplete')).toBeInTheDocument();
    expect(screen.getByText('Path A')).toBeInTheDocument();
    expect(screen.getByTestId('lp-cert-card')).toHaveAttribute('data-unlocked', 'true');
    expect(screen.getByText('Skill A')).toBeInTheDocument();
  });

  it('resolves prior/outcome scores from the assessment courses and pathSummary', () => {
    mockUseLearningPath.mockReturnValue(
      baseLp({ model: { ...baseLp().model, priorAssessment: priorCourse, outcomeAssessment: outcomeCourse } })
    );
    render(<LearningPathCompletePage />);
    const scoreRows = screen.getByTestId('lp-score-rows');
    expect(JSON.parse(scoreRows.getAttribute('data-prior')!)).toEqual({ score: 8, maxScore: 10 });
    expect(JSON.parse(scoreRows.getAttribute('data-outcome')!)).toEqual({ score: 9, maxScore: 10 });
  });
});
