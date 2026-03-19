import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CollectionPage from './CollectionPage';

// ── Mock Ionic components ──
const mockRouterPush = vi.fn();
const mockRouterGoBack = vi.fn();
vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  IonModal: ({ isOpen, children }: any) => (isOpen ? <div data-testid="ion-modal">{children}</div> : null),
  useIonRouter: () => ({ push: mockRouterPush, goBack: mockRouterGoBack }),
}));

// ── Mock CSS ──
vi.mock('./CollectionPage.css', () => ({}));

// ── Mock icons ──
vi.mock('../components/icons/CollectionIcons', () => ({
  BackIcon: () => <span data-testid="back-icon" />,
  SearchIcon: () => <span data-testid="search-icon" />,
  RightArrowIcon: () => <span data-testid="right-arrow-icon" />,
}));

// ── Mock child components ──
vi.mock('../components/collection/CollectionOverview', () => ({
  default: ({ collectionData, isCourse }: any) => (
    <div data-testid="collection-overview" data-is-course={isCourse}>{collectionData.title}</div>
  ),
}));
vi.mock('../components/collection/CollectionAccordion', () => ({
  default: ({ collectionId, viewState }: any) => (
    <div data-testid="collection-accordion" data-view-state={viewState}>{collectionId}</div>
  ),
}));
vi.mock('../components/collection/RelatedContent', () => ({
  default: ({ items }: any) => (
    <div data-testid="related-content">{items.length} items</div>
  ),
}));
vi.mock('../components/home/FAQSection', () => ({
  default: () => <div data-testid="faq-section" />,
  FAQSection: () => <div data-testid="faq-section" />,
}));
vi.mock('../components/collection/CollectionContentPlayer', () => ({
  default: ({ contentId, onClose }: any) => (
    <div data-testid="collection-content-player">{contentId}</div>
  ),
}));
vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error, onRetry }: any) => (
    <div data-testid="page-loader">
      {message && <><div data-testid="ion-spinner" /><span>{message}</span></>}
      {error && <><span>{error}</span>{onRetry && <button onClick={onRetry}>Retry</button>}</>}
    </div>
  ),
}));

// ── Mock hooks ──
vi.mock('react-router-dom', () => ({
  useParams: () => ({ collectionId: 'do_test_123' }),
  useLocation: () => ({ pathname: '/collection/do_test_123', state: undefined }),
}));

const mockCollectionReturn = {
  data: undefined as any,
  isLoading: false,
  isError: false,
  fetchStatus: 'idle' as string,
};

vi.mock('../hooks/useCollection', () => ({
  useCollection: vi.fn(() => mockCollectionReturn),
}));

vi.mock('../hooks/useContentSearch', () => ({
  useContentSearch: vi.fn(() => ({ data: undefined })),
}));

vi.mock('../services/relatedContentMapper', () => ({
  mapSearchContentToRelatedContentItems: vi.fn(() => []),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: false })),
}));

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

import { useCollection } from '../hooks/useCollection';
import { useContentSearch } from '../hooks/useContentSearch';
import { useAuth } from '../contexts/AuthContext';
import { mapSearchContentToRelatedContentItems } from '../services/relatedContentMapper';

const mockCollectionData = {
  id: 'do_test_123',
  title: 'Test Course',
  description: 'A description',
  lessons: 5,
  units: 2,
  audience: ['Teachers'],
  primaryCategory: 'Course',
  trackable: { enabled: 'No' },
  children: [],
};

describe('CollectionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCollection as any).mockReturnValue({ ...mockCollectionReturn });
    (useContentSearch as any).mockReturnValue({ data: undefined });
    (useAuth as any).mockReturnValue({ isAuthenticated: false });
  });

  it('renders page structure with header', () => {
    render(<CollectionPage />);
    expect(screen.getByTestId('ion-page')).toBeInTheDocument();
    expect(screen.getByTestId('ion-header')).toBeInTheDocument();
    expect(screen.getByTestId('back-icon')).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('shows initializing state when query is idle', () => {
    (useCollection as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      fetchStatus: 'idle',
    });

    render(<CollectionPage />);
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
    expect(screen.getByText('Initializing…')).toBeInTheDocument();
  });

  it('shows loading spinner during data fetch', () => {
    (useCollection as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      fetchStatus: 'fetching',
    });

    render(<CollectionPage />);
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('shows error state', () => {
    (useCollection as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      fetchStatus: 'idle',
    });

    render(<CollectionPage />);
    expect(screen.getByText('collection.errorLoading')).toBeInTheDocument();
  });

  it('shows not found state', () => {
    (useCollection as any).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      fetchStatus: 'fetching', // not 'idle' — idle + no data triggers "Initializing"
    });

    render(<CollectionPage />);
    expect(screen.getByText('collection.notFound')).toBeInTheDocument();
  });

  describe('with loaded data', () => {
    beforeEach(() => {
      (useCollection as any).mockReturnValue({
        data: mockCollectionData,
        isLoading: false,
        isError: false,
        fetchStatus: 'idle',
      });
    });

    it('renders all child components', () => {
      render(<CollectionPage />);
      expect(screen.getByTestId('collection-overview')).toBeInTheDocument();
      expect(screen.getByTestId('collection-accordion')).toBeInTheDocument();
      expect(screen.getByTestId('faq-section')).toBeInTheDocument();
    });

    it('passes isCourse=true for Course primaryCategory', () => {
      render(<CollectionPage />);
      expect(screen.getByTestId('collection-overview')).toHaveAttribute('data-is-course', 'true');
    });

    it('passes isCourse=false for non-Course primaryCategory', () => {
      (useCollection as any).mockReturnValue({
        data: { ...mockCollectionData, primaryCategory: 'Textbook' },
        isLoading: false,
        isError: false,
        fetchStatus: 'idle',
      });

      render(<CollectionPage />);
      expect(screen.getByTestId('collection-overview')).toHaveAttribute('data-is-course', 'false');
    });
  });

  describe('related content', () => {
    it('passes mapped related items from mapSearchContentToRelatedContentItems', () => {
      (useCollection as any).mockReturnValue({
        data: mockCollectionData,
        isLoading: false,
        isError: false,
        fetchStatus: 'idle',
      });
      (useContentSearch as any).mockReturnValue({
        data: {
          data: {
            content: [
              { identifier: 'do_other_1', name: 'Other 1', visibility: 'default' },
              { identifier: 'do_other_2', name: 'Other 2', visibility: 'default' },
            ],
          },
        },
      });
      // Mock the mapper to return 2 items
      (mapSearchContentToRelatedContentItems as any).mockReturnValue([
        { identifier: 'do_other_1', name: 'Other 1', cardType: 'collection' },
        { identifier: 'do_other_2', name: 'Other 2', cardType: 'resource' },
      ]);

      render(<CollectionPage />);
      expect(screen.getByTestId('related-content')).toHaveTextContent('2 items');
      expect(mapSearchContentToRelatedContentItems).toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('calls router.goBack on back button click', () => {
      render(<CollectionPage />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]); // Back button
      expect(mockRouterGoBack).toHaveBeenCalled();
    });

    it('navigates to search on search button click', () => {
      render(<CollectionPage />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]); // Search button
      expect(mockRouterPush).toHaveBeenCalledWith('/search', 'forward', 'push');
    });
  });

  describe('view state', () => {
    it('shows enrolled viewState for non-trackable collections', () => {
      (useCollection as any).mockReturnValue({
        data: { ...mockCollectionData, trackable: { enabled: 'No' } },
        isLoading: false,
        isError: false,
        fetchStatus: 'idle',
      });

      render(<CollectionPage />);
      expect(screen.getByTestId('collection-accordion')).toHaveAttribute('data-view-state', 'enrolled');
    });

    it('shows anonymous viewState for trackable collection when not authenticated', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });
      (useCollection as any).mockReturnValue({
        data: { ...mockCollectionData, trackable: { enabled: 'Yes' } },
        isLoading: false,
        isError: false,
        fetchStatus: 'idle',
      });

      render(<CollectionPage />);
      expect(screen.getByTestId('collection-accordion')).toHaveAttribute('data-view-state', 'anonymous');
      expect(screen.getByText('collection.letsGetStarted')).toBeInTheDocument();
    });

    it('navigates to sign-in on "Let\'s Get Started" click in anonymous viewState', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: false });
      (useCollection as any).mockReturnValue({
        data: { ...mockCollectionData, trackable: { enabled: 'Yes' } },
        isLoading: false,
        isError: false,
        fetchStatus: 'idle',
      });

      render(<CollectionPage />);
      fireEvent.click(screen.getByText('collection.letsGetStarted'));
      expect(mockRouterPush).toHaveBeenCalledWith('/sign-in', 'forward', 'push');
    });

    it('shows unenrolled viewState for trackable collection when authenticated', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: true });
      (useCollection as any).mockReturnValue({
        data: { ...mockCollectionData, trackable: { enabled: 'Yes' } },
        isLoading: false,
        isError: false,
        fetchStatus: 'idle',
      });

      render(<CollectionPage />);
      expect(screen.getByTestId('collection-accordion')).toHaveAttribute('data-view-state', 'unenrolled');
      expect(screen.getByText('collection.joinTheCourse')).toBeInTheDocument();
    });

    it('opens batch modal on "Join the Course" click', () => {
      (useAuth as any).mockReturnValue({ isAuthenticated: true });
      (useCollection as any).mockReturnValue({
        data: { ...mockCollectionData, trackable: { enabled: 'Yes' } },
        isLoading: false,
        isError: false,
        fetchStatus: 'idle',
      });

      render(<CollectionPage />);
      expect(screen.queryByTestId('ion-modal')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('collection.joinTheCourse'));
      expect(screen.getByTestId('ion-modal')).toBeInTheDocument();
      expect(screen.getByText('collection.availableBatches')).toBeInTheDocument();
    });
  });
});
