import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import LearningPathPlayerPage from './LearningPathPlayerPage';

const mockRouterPush = vi.fn();
vi.mock('@ionic/react', () => ({
  IonAlert: ({ isOpen, header, message, buttons }: any) =>
    isOpen ? (
      <div data-testid="ion-alert">
        <span>{header}</span>
        <span>{message}</span>
        <button onClick={() => buttons[0].handler()}>ok</button>
      </div>
    ) : null,
  IonFooter: ({ children }: any) => <div data-testid="ion-footer">{children}</div>,
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonModal: ({ isOpen, children }: any) => (isOpen ? <div data-testid="ion-modal">{children}</div> : null),
  useIonRouter: () => ({ push: mockRouterPush, goBack: vi.fn() }),
}));

vi.mock('./LearningPathPlayerPage.css', () => ({}));

vi.mock('../components/collection/CollectionContentPlayer', () => ({
  default: ({ contentId, lpContext, onClose }: any) => (
    <div data-testid="content-player" data-content-id={contentId} data-lp-context={JSON.stringify(lpContext)}>
      <button onClick={onClose}>close</button>
    </div>
  ),
}));
vi.mock('../components/learningPath/LPCourseUnitTree', () => ({
  default: () => <div data-testid="lp-unit-tree" />,
}));
vi.mock('../components/learningPath/LPCertificateCard', () => ({
  default: () => <div data-testid="lp-cert-card" />,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ pathId: 'lp1', contextId: undefined, courseId: 'c1', contentId: 'leaf2' }),
  useLocation: () => ({ pathname: '/learning-path/lp1/course/c1/content/leaf2', state: undefined }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
  }),
}));

const { mockUseLearningPath } = vi.hoisted(() => ({ mockUseLearningPath: vi.fn() }));
vi.mock('../hooks/useLearningPath', () => ({ useLearningPath: mockUseLearningPath }));

const course = {
  identifier: 'c1',
  name: 'Course 1',
  leafNodesCount: 3,
  leafIds: ['leaf1', 'leaf2', 'leaf3'],
  skills: [],
  isAssessmentCourse: false,
  units: [{ identifier: 'leaf1', name: 'Lesson 1', isUnit: false, leafIds: ['leaf1'], children: [] }],
};

function baseLp(overrides: Record<string, unknown> = {}) {
  return {
    model: {
      priorAssessment: undefined,
      outcomeAssessment: undefined,
      levels: [{ identifier: 'l1', name: 'Foundations', index: 0, skills: [], courses: [course] }],
    },
    progress: { pct: 30, doneLevels: 0 },
    certificateUnlocked: false,
    pathSummary: { contentStatus: {} },
    hierarchyRoot: undefined,
    enrollment: { isEnrolled: true, isBatchEnded: false, effectiveContextId: 'ctx1', certPreviewUrl: undefined },
    isLoading: false,
    ...overrides,
  };
}

describe('LearningPathPlayerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a join-required alert and does not mount the player when not enrolled', () => {
    mockUseLearningPath.mockReturnValue(baseLp({ enrollment: { ...baseLp().enrollment, isEnrolled: false } }));
    render(<LearningPathPlayerPage />);
    expect(screen.getByTestId('ion-alert')).toBeInTheDocument();
    expect(screen.queryByTestId('content-player')).not.toBeInTheDocument();
  });

  it('renders the player with lpContext scoped to the LP root + plain contextId', () => {
    mockUseLearningPath.mockReturnValue(baseLp());
    render(<LearningPathPlayerPage />);
    const player = screen.getByTestId('content-player');
    expect(player).toHaveAttribute('data-content-id', 'leaf2');
    expect(JSON.parse(player.getAttribute('data-lp-context')!)).toEqual({ pathId: 'lp1', contextId: 'ctx1' });
  });

  it('enables Previous/Next based on position within the course leafIds', () => {
    mockUseLearningPath.mockReturnValue(baseLp());
    render(<LearningPathPlayerPage />);
    const prevBtn = screen.getByText('learningPath.previous');
    const nextBtn = screen.getByText('learningPath.next');
    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).not.toBeDisabled();
  });

  it('navigates to the next leaf in the course when Next is clicked', () => {
    mockUseLearningPath.mockReturnValue(baseLp());
    render(<LearningPathPlayerPage />);
    fireEvent.click(screen.getByText('learningPath.next'));
    expect(mockRouterPush).toHaveBeenCalledWith(
      '/learning-path/lp1/course/c1/content/leaf3',
      'forward',
      'push'
    );
  });

  it('navigates to the previous leaf in the course when Previous is clicked', () => {
    mockUseLearningPath.mockReturnValue(baseLp());
    render(<LearningPathPlayerPage />);
    fireEvent.click(screen.getByText('learningPath.previous'));
    expect(mockRouterPush).toHaveBeenCalledWith(
      '/learning-path/lp1/course/c1/content/leaf1',
      'forward',
      'push'
    );
  });

  it('opens the "Path contents" bottom sheet on crumb click', () => {
    mockUseLearningPath.mockReturnValue(baseLp());
    render(<LearningPathPlayerPage />);
    expect(screen.queryByTestId('ion-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/learningPath.playerCrumb/));
    expect(screen.getByTestId('ion-modal')).toBeInTheDocument();
    expect(screen.getByTestId('lp-cert-card')).toBeInTheDocument();
  });
});
