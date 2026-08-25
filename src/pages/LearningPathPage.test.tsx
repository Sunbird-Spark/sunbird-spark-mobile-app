import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import LearningPathPage from './LearningPathPage';

const mockRouterPush = vi.fn();
const mockRouterGoBack = vi.fn();
vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  IonModal: ({ isOpen, children }: any) => (isOpen ? <div data-testid="ion-modal">{children}</div> : null),
  IonSpinner: () => <div data-testid="ion-spinner" />,
  useIonRouter: () => ({ push: mockRouterPush, goBack: mockRouterGoBack }),
  useIonViewDidEnter: vi.fn(),
}));

vi.mock('./LearningPathPage.css', () => ({}));

vi.mock('../components/icons/CollectionIcons', () => ({
  BackIcon: () => <span data-testid="back-icon" />,
}));

vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error }: any) => (
    <div data-testid="page-loader">
      {message && <span>{message}</span>}
      {error && <span>{error}</span>}
    </div>
  ),
}));

vi.mock('../components/learningPath/LPProgressCard', () => ({
  default: ({ progressPct }: any) => <div data-testid="lp-progress-card">{progressPct}%</div>,
}));
vi.mock('../components/learningPath/LPLedger', () => ({
  default: ({ onOpenPrior, onOpenOutcome, onOpenLevel, onOpenCourse }: any) => (
    <div data-testid="lp-ledger">
      <button onClick={onOpenPrior}>ledger-open-prior</button>
      <button onClick={onOpenOutcome}>ledger-open-outcome</button>
      <button onClick={() => onOpenLevel('l1')}>ledger-open-level</button>
      <button onClick={() => onOpenCourse('c1', 'leaf1')}>ledger-open-course</button>
    </div>
  ),
}));
vi.mock('../components/learningPath/LPCertificateCard', () => ({
  default: ({ unlocked, onViewSummary }: any) => (
    <div data-testid="lp-cert-card" data-unlocked={unlocked}>
      {onViewSummary && <button onClick={onViewSummary}>cert-view-summary</button>}
    </div>
  ),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ pathId: 'lp1', contextId: undefined }),
  useLocation: () => ({ pathname: '/learning-path/lp1', state: undefined }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

const { mockUseAuth, mockUseLearningPath } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLearningPath: vi.fn(),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../hooks/useLearningPath', () => ({ useLearningPath: mockUseLearningPath }));

function baseLp(overrides: Record<string, unknown> = {}) {
  return {
    model: { name: 'Path A', description: 'desc', levels: [], allSkills: [], courseTotal: 0 },
    policy: 'Fixed',
    progress: { pct: 0, completed: 0, total: 0, doneLevels: 0, levelCount: 0 },
    levelProgress: [],
    levelStatuses: [],
    priorState: { progress: null, done: true },
    outcomeState: { progress: null, unlocked: false, done: false },
    certificateUnlocked: false,
    enrollment: {
      isEnrolled: false,
      effectiveContextId: undefined,
      enrollableBatches: [],
      batchListLoading: false,
      batchListError: undefined,
      isBatchEnded: false,
      isBatchUpcoming: false,
      batchEndDate: undefined,
      certPreviewUrl: undefined,
      enrol: { mutateAsync: vi.fn(), isPending: false, error: undefined },
      unenrol: { mutateAsync: vi.fn(), isPending: false, error: undefined },
    },
    resumeTarget: null,
    isTrackable: true,
    isCreatorViewingOwnPath: false,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

describe('LearningPathPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, userId: 'u1' });
  });

  it('shows the loading state', () => {
    mockUseLearningPath.mockReturnValue(baseLp({ isLoading: true }));
    render(<LearningPathPage />);
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows the error state', () => {
    mockUseLearningPath.mockReturnValue(baseLp({ isError: true }));
    render(<LearningPathPage />);
    expect(screen.getByText('learningPath.errorLoading')).toBeInTheDocument();
  });

  it('shows the not-found state when there is no model data at all', () => {
    mockUseLearningPath.mockReturnValue(
      baseLp({ model: { name: '', description: '', levels: [], allSkills: [], courseTotal: 0 } })
    );
    render(<LearningPathPage />);
    expect(screen.getByText('learningPath.notFound')).toBeInTheDocument();
  });

  it('renders the enrolled view with progress card, ledger and certificate card', () => {
    mockUseLearningPath.mockReturnValue(
      baseLp({
        model: { name: 'Path A', description: '', levels: [{ identifier: 'l1', name: 'L1', index: 0, skills: [], courses: [] }], allSkills: [], courseTotal: 1 },
        enrollment: { ...baseLp().enrollment, isEnrolled: true },
      })
    );
    render(<LearningPathPage />);
    expect(screen.getByTestId('lp-progress-card')).toBeInTheDocument();
    expect(screen.getByTestId('lp-ledger')).toBeInTheDocument();
    expect(screen.getByTestId('lp-cert-card')).toBeInTheDocument();
  });

  it('shows the join-the-path CTA when authenticated but not enrolled', () => {
    mockUseLearningPath.mockReturnValue(
      baseLp({ model: { name: 'Path A', description: '', levels: [{ identifier: 'l1', name: 'L1', index: 0, skills: [], courses: [] }], allSkills: [], courseTotal: 1 } })
    );
    render(<LearningPathPage />);
    expect(screen.getByText('learningPath.joinThePath')).toBeInTheDocument();
  });

  it('shows the sign-in CTA when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, userId: null });
    mockUseLearningPath.mockReturnValue(
      baseLp({ model: { name: 'Path A', description: '', levels: [{ identifier: 'l1', name: 'L1', index: 0, skills: [], courses: [] }], allSkills: [], courseTotal: 1 } })
    );
    render(<LearningPathPage />);
    expect(screen.getByText('collection.loginToBeginJourney')).toBeInTheDocument();
    expect(screen.queryByText('learningPath.joinThePath')).not.toBeInTheDocument();
  });

  it('shows the creator note instead of the enrol CTA for the path\'s own creator', () => {
    mockUseLearningPath.mockReturnValue(
      baseLp({
        model: { name: 'Path A', description: '', levels: [{ identifier: 'l1', name: 'L1', index: 0, skills: [], courses: [] }], allSkills: [], courseTotal: 1 },
        isCreatorViewingOwnPath: true,
      })
    );
    render(<LearningPathPage />);
    expect(screen.getByText('learningPath.creatorCannotEnrol')).toBeInTheDocument();
    expect(screen.queryByTestId('lp-progress-card')).not.toBeInTheDocument();
  });

  it('opens the batch picker modal when the join CTA is clicked', () => {
    mockUseLearningPath.mockReturnValue(
      baseLp({
        model: { name: 'Path A', description: '', levels: [{ identifier: 'l1', name: 'L1', index: 0, skills: [], courses: [] }], allSkills: [], courseTotal: 1 },
        enrollment: {
          ...baseLp().enrollment,
          enrollableBatches: [{ identifier: 'b1', name: 'Batch 1' }],
        },
      })
    );
    render(<LearningPathPage />);
    fireEvent.click(screen.getByText('learningPath.joinThePath'));
    expect(screen.getByTestId('ion-modal')).toBeInTheDocument();
    expect(screen.getByText('Batch 1')).toBeInTheDocument();
    // The confirm CTA must be present — it was rendered off-screen before.
    expect(screen.getByRole('button', { name: 'learningPath.joinTheBatch' })).toBeInTheDocument();
  });

  it('enrols into the batch the learner picks in the sheet', () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    mockUseLearningPath.mockReturnValue(
      baseLp({
        model: { name: 'Path A', description: '', levels: [{ identifier: 'l1', name: 'L1', index: 0, skills: [], courses: [] }], allSkills: [], courseTotal: 1 },
        enrollment: {
          ...baseLp().enrollment,
          enrollableBatches: [
            { identifier: 'b1', name: 'Batch 1' },
            { identifier: 'b2', name: 'Batch 2' },
          ],
          enrol: { mutateAsync, isPending: false },
        },
      })
    );
    render(<LearningPathPage />);
    fireEvent.click(screen.getByText('learningPath.joinThePath'));

    expect(screen.getByRole('button', { name: 'learningPath.joinTheBatch' })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b2' } });
    fireEvent.click(screen.getByRole('button', { name: 'learningPath.joinTheBatch' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      courseId: 'lp1',
      userId: 'u1',
      batchId: 'b2',
    });
  });

  it('navigates back via the parent route stored in location.state, or goBack otherwise', () => {
    mockUseLearningPath.mockReturnValue(baseLp());
    render(<LearningPathPage />);
    fireEvent.click(screen.getByTestId('back-icon').closest('button')!);
    expect(mockRouterGoBack).toHaveBeenCalled();
  });

  const enrolledLp = () =>
    baseLp({
      model: {
        name: 'Path A',
        description: '',
        priorAssessment: undefined,
        outcomeAssessment: undefined,
        levels: [{ identifier: 'l1', name: 'L1', index: 0, skills: [], courses: [] }],
        allSkills: [],
        courseTotal: 1,
      },
      enrollment: { ...baseLp().enrollment, isEnrolled: true },
    });

  describe('ledger navigation wiring', () => {
    it('pushes the prior assessment route when the ledger fires onOpenPrior', () => {
      mockUseLearningPath.mockReturnValue(enrolledLp());
      render(<LearningPathPage />);
      fireEvent.click(screen.getByText('ledger-open-prior'));
      expect(mockRouterPush).toHaveBeenCalledWith('/learning-path/lp1/prior', 'forward', 'push');
    });

    it('pushes the outcome assessment route when the ledger fires onOpenOutcome', () => {
      const lp = enrolledLp();
      mockUseLearningPath.mockReturnValue({
        ...lp,
        model: {
          ...lp.model,
          outcomeAssessment: { identifier: 'outcome1', name: 'Outcome', leafNodesCount: 1, leafIds: ['q2'], skills: [], isAssessmentCourse: true },
        },
      });
      render(<LearningPathPage />);
      fireEvent.click(screen.getByText('ledger-open-outcome'));
      expect(mockRouterPush).toHaveBeenCalledWith('/learning-path/lp1/outcome', 'forward', 'push');
    });

    it('pushes the level detail route when the ledger fires onOpenLevel', () => {
      mockUseLearningPath.mockReturnValue(enrolledLp());
      render(<LearningPathPage />);
      fireEvent.click(screen.getByText('ledger-open-level'));
      expect(mockRouterPush).toHaveBeenCalledWith('/learning-path/lp1/level/l1', 'forward', 'push');
    });

    it('pushes the player route when the ledger fires onOpenCourse', () => {
      mockUseLearningPath.mockReturnValue(enrolledLp());
      render(<LearningPathPage />);
      fireEvent.click(screen.getByText('ledger-open-course'));
      expect(mockRouterPush).toHaveBeenCalledWith('/learning-path/lp1/course/c1/content/leaf1', 'forward', 'push');
    });

  });

  describe('certificate completion summary', () => {
    it('lets the certificate card open the completion summary', () => {
      mockUseLearningPath.mockReturnValue(enrolledLp());
      render(<LearningPathPage />);
      fireEvent.click(screen.getByText('cert-view-summary'));
      expect(mockRouterPush).toHaveBeenCalledWith('/learning-path/lp1/complete', 'forward', 'push');
    });
  });

  describe('primary Start/Resume CTA', () => {
    it('shows "Resume" and opens the player at the resumeTarget when one exists', () => {
      mockUseLearningPath.mockReturnValue({
        ...enrolledLp(),
        progress: { pct: 40, completed: 0, total: 0, doneLevels: 0, levelCount: 1 },
        resumeTarget: { collectionId: 'course1', contentId: 'leafX', contextId: 'ctx1' },
      });
      render(<LearningPathPage />);
      fireEvent.click(screen.getByText('learningPath.resume'));
      expect(mockRouterPush).toHaveBeenCalledWith('/learning-path/lp1/course/course1/content/leafX', 'forward', 'push');
    });

    it('shows "Start" (not "Resume") when resumeTarget exists but progress is 0%', () => {
      mockUseLearningPath.mockReturnValue({
        ...enrolledLp(),
        progress: { pct: 0, completed: 0, total: 0, doneLevels: 0, levelCount: 1 },
        resumeTarget: { collectionId: 'course1', contentId: 'leafX', contextId: 'ctx1' },
      });
      render(<LearningPathPage />);
      expect(screen.getByText('learningPath.start')).toBeInTheDocument();
    });

    it('falls back to the prior assessment gate when there is no resumeTarget yet and prior is pending', () => {
      mockUseLearningPath.mockReturnValue({
        ...enrolledLp(),
        model: {
          ...enrolledLp().model,
          priorAssessment: { identifier: 'prior1', name: 'Prior', leafNodesCount: 1, leafIds: ['q1'], skills: [], isAssessmentCourse: true },
        },
        priorState: { progress: null, done: false },
        resumeTarget: null,
      });
      render(<LearningPathPage />);
      fireEvent.click(screen.getByText('learningPath.startAssessment'));
      expect(mockRouterPush).toHaveBeenCalledWith('/learning-path/lp1/prior', 'forward', 'push');
    });

    it('falls back to the first unlocked level when there is no resumeTarget and no pending prior', () => {
      mockUseLearningPath.mockReturnValue({
        ...enrolledLp(),
        levelStatuses: ['active'],
        resumeTarget: null,
      });
      render(<LearningPathPage />);
      fireEvent.click(screen.getByText('learningPath.start'));
      expect(mockRouterPush).toHaveBeenCalledWith('/learning-path/lp1/level/l1', 'forward', 'push');
    });

    it('falls back to the outcome gate once every level is complete and outcome is pending', () => {
      mockUseLearningPath.mockReturnValue({
        ...enrolledLp(),
        model: {
          ...enrolledLp().model,
          outcomeAssessment: { identifier: 'outcome1', name: 'Outcome', leafNodesCount: 1, leafIds: ['q2'], skills: [], isAssessmentCourse: true },
        },
        levelStatuses: ['completed'],
        outcomeState: { progress: null, unlocked: true, done: false },
        resumeTarget: null,
      });
      render(<LearningPathPage />);
      fireEvent.click(screen.getByText('learningPath.startAssessment'));
      expect(mockRouterPush).toHaveBeenCalledWith('/learning-path/lp1/outcome', 'forward', 'push');
    });

    it('renders no CTA once the path is fully complete', () => {
      mockUseLearningPath.mockReturnValue({
        ...enrolledLp(),
        levelStatuses: ['completed'],
        resumeTarget: null,
      });
      render(<LearningPathPage />);
      expect(screen.queryByText('learningPath.start')).not.toBeInTheDocument();
      expect(screen.queryByText('learningPath.resume')).not.toBeInTheDocument();
      expect(screen.queryByText('learningPath.startAssessment')).not.toBeInTheDocument();
    });
  });
});
