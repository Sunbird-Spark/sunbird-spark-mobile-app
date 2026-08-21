import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLearningPath } from './useLearningPath';
import { LP_HIERARCHY_NO_ASSESSMENTS } from '../services/learningPath/__fixtures__/lpHierarchyNoAssessments.fixture';

const { mockUseAuth, mockUseCollection, mockUseViewerSummary, mockUseLearningPathEnrollment, mockUseLevelWaivers } =
  vi.hoisted(() => ({
    mockUseAuth: vi.fn(),
    mockUseCollection: vi.fn(),
    mockUseViewerSummary: vi.fn(),
    mockUseLearningPathEnrollment: vi.fn(),
    mockUseLevelWaivers: vi.fn(),
  }));

vi.mock('../contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('./useCollection', () => ({ useCollection: mockUseCollection }));
vi.mock('./useViewerSummary', () => ({ useViewerSummary: mockUseViewerSummary }));
vi.mock('./useLearningPathEnrollment', () => ({ useLearningPathEnrollment: mockUseLearningPathEnrollment }));
vi.mock('./useLevelWaivers', () => ({ useLevelWaivers: mockUseLevelWaivers }));

function record(overrides: Record<string, unknown>) {
  return { userId: 'u1', active: true, status: 1, progress: 0, contentStatus: {}, ...overrides };
}

describe('useLearningPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, userId: 'u1' });
    mockUseLevelWaivers.mockReturnValue({});
    mockUseLearningPathEnrollment.mockReturnValue({ effectiveContextId: 'ctx1' });
  });

  it('is loading while the hierarchy is fetching', () => {
    mockUseCollection.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    mockUseViewerSummary.mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useLearningPath('lp1', undefined));
    expect(result.current.isLoading).toBe(true);
  });

  it('derives a not-enrolled, all-zero model when there is no hierarchy data yet', () => {
    mockUseCollection.mockReturnValue({ data: null, isLoading: false, isError: false });
    mockUseViewerSummary.mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useLearningPath('lp1', undefined));
    expect(result.current.model.levels).toEqual([]);
    expect(result.current.progress.pct).toBe(0);
    expect(result.current.certificateUnlocked).toBe(false);
  });

  it('composes hierarchy + Viewer Service summary into progress/status/certificate state', () => {
    mockUseCollection.mockReturnValue({
      data: { hierarchyRoot: LP_HIERARCHY_NO_ASSESSMENTS, createdBy: 'other-user', trackable: { enabled: 'Yes' } },
      isLoading: false,
      isError: false,
    });
    const pathSummary = record({
      collectionId: 'do_2146317230884208641312',
      contextId: 'ctx1',
      completionPercentage: 50,
    });
    mockUseViewerSummary.mockReturnValue({ data: [pathSummary], isLoading: false });

    const { result } = renderHook(() => useLearningPath('do_2146317230884208641312', 'ctx1'));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.policy).toBe('Fixed');
    expect(result.current.progress.pct).toBe(50);
    expect(result.current.levelStatuses).toHaveLength(2);
    // Fixed policy: level 0 unlocked, level 1 locked (level 0 not yet 100%)
    expect(result.current.levelStatuses[0]).not.toBe('locked');
    expect(result.current.levelStatuses[1]).toBe('locked');
    expect(result.current.isTrackable).toBe(true);
    expect(result.current.isCreatorViewingOwnPath).toBe(false);
  });

  it('marks isCreatorViewingOwnPath when the current user authored the path', () => {
    mockUseCollection.mockReturnValue({
      data: { hierarchyRoot: LP_HIERARCHY_NO_ASSESSMENTS, createdBy: 'u1' },
      isLoading: false,
      isError: false,
    });
    mockUseViewerSummary.mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useLearningPath('lp1', undefined));
    expect(result.current.isCreatorViewingOwnPath).toBe(true);
  });

  it('unlocks the certificate once every level and the outcome assessment are complete', () => {
    mockUseCollection.mockReturnValue({
      data: { hierarchyRoot: LP_HIERARCHY_NO_ASSESSMENTS },
      isLoading: false,
      isError: false,
    });
    const pathSummary = record({
      collectionId: 'do_2146317230884208641312',
      contextId: 'ctx1',
      completionPercentage: 100,
      contentStatus: {
        do_21463158442296934411: 2,
        do_214631592231313408130: 2,
        do_214631615408873472110: 2,
      },
    });
    mockUseViewerSummary.mockReturnValue({ data: [pathSummary], isLoading: false });

    const { result } = renderHook(() => useLearningPath('do_2146317230884208641312', 'ctx1'));
    expect(result.current.levelStatuses).toEqual(['completed', 'completed']);
    // No outcomeAssessment in this fixture, so the certificate unlocks on levels alone.
    expect(result.current.certificateUnlocked).toBe(true);
  });
});
