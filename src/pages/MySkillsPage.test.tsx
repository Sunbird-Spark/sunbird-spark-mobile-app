import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import MySkillsPage from './MySkillsPage';

const mockRouterPush = vi.fn();
const mockRouterGoBack = vi.fn();
vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  useIonRouter: () => ({ push: mockRouterPush, goBack: mockRouterGoBack }),
}));

vi.mock('./MySkillsPage.css', () => ({}));
vi.mock('../components/icons/CollectionIcons', () => ({ BackIcon: () => <span data-testid="back-icon" /> }));
vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error }: any) => (
    <div data-testid="page-loader">{message && <span>{message}</span>}{error && <span>{error}</span>}</div>
  ),
}));
vi.mock('../components/mySkills/MySkillsHero', () => ({ default: () => <div data-testid="ms-hero" /> }));
vi.mock('../components/mySkills/SkillSuggestionRow', () => ({
  default: ({ onSelect }: any) => (
    <button data-testid="ms-suggestion-row" onClick={() => onSelect({ pathId: 'lp2', contextId: undefined })}>
      suggestion
    </button>
  ),
}));
vi.mock('../components/mySkills/SkillPathAccordion', () => ({
  default: ({ onOpenPath }: any) => (
    <button data-testid="ms-path-accordion" onClick={() => onOpenPath({ pathId: 'lp1', contextId: 'ctx1' })}>
      accordion
    </button>
  ),
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/profile/skills', state: undefined }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { mockUseMySkills, mockUseSkillSuggestions } = vi.hoisted(() => ({
  mockUseMySkills: vi.fn(),
  mockUseSkillSuggestions: vi.fn(() => ({ suggestions: [] })),
}));
vi.mock('../hooks/useMySkills', () => ({ useMySkills: mockUseMySkills }));
vi.mock('../hooks/useSkillSuggestions', () => ({ useSkillSuggestions: mockUseSkillSuggestions }));

function baseMySkills(overrides: Record<string, unknown> = {}) {
  return {
    entries: [{ path: { pathId: 'lp1' }, isLoading: false, isError: false }],
    summaries: [],
    aggregate: { totalSkills: 0, gainedSkills: 0, pendingSkills: 0, pathsCompleted: 0, pathsOngoing: 0 },
    analyzedCount: 0,
    totalCount: 1,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('MySkillsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSkillSuggestions.mockReturnValue({ suggestions: [] });
  });

  it('shows the loading state', () => {
    mockUseMySkills.mockReturnValue(baseMySkills({ isLoading: true }));
    render(<MySkillsPage />);
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows the empty state when the learner has no enrolled paths', () => {
    mockUseMySkills.mockReturnValue(baseMySkills({ entries: [] }));
    render(<MySkillsPage />);
    expect(screen.getByText('mySkills.noEnrolledPaths')).toBeInTheDocument();
  });

  it('renders the hero, suggestions and path accordion once loaded', () => {
    mockUseMySkills.mockReturnValue(baseMySkills());
    render(<MySkillsPage />);
    expect(screen.getByTestId('ms-hero')).toBeInTheDocument();
    expect(screen.getByTestId('ms-suggestion-row')).toBeInTheDocument();
    expect(screen.getByTestId('ms-path-accordion')).toBeInTheDocument();
  });

  it('navigates to the suggested path on suggestion select', () => {
    mockUseMySkills.mockReturnValue(baseMySkills());
    render(<MySkillsPage />);
    fireEvent.click(screen.getByTestId('ms-suggestion-row'));
    expect(mockRouterPush).toHaveBeenCalledWith('/learning-path/lp2', 'forward', 'push');
  });

  it('navigates to the path status page on "view path"', () => {
    mockUseMySkills.mockReturnValue(baseMySkills());
    render(<MySkillsPage />);
    fireEvent.click(screen.getByTestId('ms-path-accordion'));
    expect(mockRouterPush).toHaveBeenCalledWith('/learning-path/lp1/batch/ctx1/status', 'forward', 'push');
  });
});
