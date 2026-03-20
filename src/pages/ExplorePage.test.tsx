import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ExplorePage from './ExplorePage';

// ── Mock react-i18next ──
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        exploreTitle: 'Start Exploring',
        filters: 'Filters',
        clearFilters: 'Clear Filters',
        close: 'Close',
        sortBy: 'Sort By',
        newestFirst: 'Newest First',
        oldestFirst: 'Oldest First',
        noResults: 'No results found',
        failedToLoad: 'Failed to load content',
        retry: 'Retry',
        noContentFound: 'No content found',
        searchContentPlaceholder: 'Search content...',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

// ── Mock LanguageSelector ──
vi.mock('../components/common/LanguageSelector', () => ({
  LanguageSelector: () => null,
}));

// ── Mock react-router-dom ──
let mockLocationSearch = '';
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ search: mockLocationSearch }),
}));

// ── Mock Ionic components ──
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonContent: ({ children, fullscreen }: any) => (
    <div data-testid="ion-content" data-fullscreen={fullscreen}>{children}</div>
  ),
  IonModal: ({ isOpen, children, onDidDismiss }: any) => (
    isOpen ? <div data-testid="ion-modal">{children}</div> : null
  ),
  IonInfiniteScroll: ({ children, onIonInfinite, disabled }: any) => (
    <div data-testid="ion-infinite-scroll" data-disabled={disabled}>{children}</div>
  ),
  IonInfiniteScrollContent: () => <div data-testid="ion-infinite-scroll-content" />,
  IonRefresher: ({ children }: any) => <div data-testid="ion-refresher">{children}</div>,
  IonRefresherContent: () => <div data-testid="ion-refresher-content" />,
  IonSpinner: () => <div data-testid="ion-spinner" />,
}));

// ── Mock BottomNavigation ──
vi.mock('../components/layout/BottomNavigation', () => ({
  BottomNavigation: () => <div data-testid="bottom-navigation">Bottom Navigation</div>,
}));

// ── Mock CSS ──
vi.mock('./ExplorePage.css', () => ({}));

// ── Mock PageLoader ──
vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error, onRetry }: any) => (
    <div data-testid="page-loader">
      {message && <><div data-testid="ion-spinner" /><span>{message}</span></>}
      {error && <><span>{error}</span>{onRetry && <button onClick={onRetry}>Retry</button>}</>}
    </div>
  ),
}));

// ── Mock child cards ──
vi.mock('../components/content/CollectionCard', () => ({
  default: ({ item }: any) => <div data-testid="collection-card">{item.name}</div>,
}));
vi.mock('../components/content/ResourceCard', () => ({
  default: ({ item }: any) => <div data-testid="resource-card">{item.name}</div>,
}));

// ── Hook mocks ──
const mockRefetch = vi.fn().mockResolvedValue(undefined);

const defaultSearchReturn = {
  data: undefined as any,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
};

const defaultFormReturn = {
  data: undefined as any,
  isLoading: false,
};

vi.mock('../hooks/useContentSearch', () => ({
  useContentSearch: vi.fn(() => defaultSearchReturn),
}));

vi.mock('../hooks/useFormRead', () => ({
  useFormRead: vi.fn(() => defaultFormReturn),
}));

vi.mock('../hooks/useDebounce', () => ({
  default: (value: string) => value,
}));

// Import after mocks
import { useContentSearch } from '../hooks/useContentSearch';
import { useFormRead } from '../hooks/useFormRead';

const COLLECTION_MIME = 'application/vnd.ekstep.content-collection';

const makeItems = (count: number, startIdx = 0) =>
  Array.from({ length: count }, (_, i) => ({
    identifier: `do_${startIdx + i}`,
    name: `Item ${startIdx + i}`,
    mimeType: i % 3 === 0 ? COLLECTION_MIME : 'application/pdf',
  }));

const mockFormData = {
  data: {
    form: {
      data: {
        filters: [
          {
            id: 'primaryCategory',
            index: 1,
            label: 'Category',
            options: [
              { id: 'opt1', index: 1, label: 'Course', code: 'primaryCategory', value: 'Course' },
              { id: 'opt2', index: 2, label: 'Textbook', code: 'primaryCategory', value: 'Digital Textbook' },
            ],
          },
          {
            id: 'medium',
            index: 2,
            label: 'Medium',
            options: [
              { id: 'med1', index: 1, label: 'English', code: 'medium', value: 'English' },
            ],
          },
        ],
      },
    },
  },
};

describe('ExplorePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationSearch = '';
    (useContentSearch as any).mockReturnValue({ ...defaultSearchReturn });
    (useFormRead as any).mockReturnValue({ ...defaultFormReturn });
  });

  it('renders page structure', () => {
    render(<ExplorePage />);
    expect(screen.getByTestId('ion-page')).toBeInTheDocument();
    expect(screen.getByTestId('ion-header')).toBeInTheDocument();
    expect(screen.getByTestId('ion-content')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-navigation')).toBeInTheDocument();
  });

  it('renders the page title', () => {
    render(<ExplorePage />);
    expect(screen.getByText('Start Exploring')).toBeInTheDocument();
  });

  it('shows loading spinner during initial load', () => {
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      isLoading: true,
    });

    render(<ExplorePage />);
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
  });

  it('shows "No content found" when results are empty', () => {
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      data: { data: { content: [], QuestionSet: [] } },
    });

    render(<ExplorePage />);
    expect(screen.getByText('No content found')).toBeInTheDocument();
  });

  it('shows error state with retry button', () => {
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      error: new Error('fail'),
    });

    render(<ExplorePage />);
    expect(screen.getByText('Failed to load content')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calls refetch when retry is clicked', () => {
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      error: new Error('fail'),
      refetch: mockRefetch,
    });

    render(<ExplorePage />);
    fireEvent.click(screen.getByText('Retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders collection and resource cards from search results', () => {
    const items = makeItems(4);
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      data: { data: { content: items, QuestionSet: [] } },
    });

    render(<ExplorePage />);
    // items 0, 3 are collections (i % 3 === 0)
    expect(screen.getAllByTestId('collection-card')).toHaveLength(2);
    expect(screen.getAllByTestId('resource-card')).toHaveLength(2);
  });

  describe('search', () => {
    it('toggles search input on search icon click', () => {
      render(<ExplorePage />);

      // Search input not visible initially
      expect(screen.queryByPlaceholderText('Search content...')).not.toBeInTheDocument();

      // Click the search button (first button in the header actions)
      const buttons = screen.getAllByRole('button');
      // The search button is the one before the filter button
      const searchBtn = buttons.find(
        (b) => !b.textContent?.includes('Bottom')
      )!;
      fireEvent.click(searchBtn);

      expect(screen.getByPlaceholderText('Search content...')).toBeInTheDocument();
    });

    it('updates search query on input change', () => {
      render(<ExplorePage />);

      // Open search
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);

      const input = screen.getByPlaceholderText('Search content...');
      fireEvent.change(input, { target: { value: 'math' } });
      expect(input).toHaveValue('math');
    });
  });

  describe('filters', () => {
    it('opens filter modal when filter icon is clicked', () => {
      (useFormRead as any).mockReturnValue({
        ...defaultFormReturn,
        data: mockFormData,
      });

      render(<ExplorePage />);

      // No modal initially
      expect(screen.queryByTestId('ion-modal')).not.toBeInTheDocument();

      // The filter button is the second action button
      fireEvent.click(screen.getByLabelText('Filters'));

      expect(screen.getByTestId('ion-modal')).toBeInTheDocument();
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('renders filter sidebar tabs from form data', () => {
      (useFormRead as any).mockReturnValue({
        ...defaultFormReturn,
        data: mockFormData,
      });

      render(<ExplorePage />);

      // Open filter
      fireEvent.click(screen.getByLabelText('Filters'));

      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Sort By')).toBeInTheDocument();
    });

    it('renders filter options for active tab', () => {
      (useFormRead as any).mockReturnValue({
        ...defaultFormReturn,
        data: mockFormData,
      });

      render(<ExplorePage />);

      // Open filter
      fireEvent.click(screen.getByLabelText('Filters'));

      // Default active tab is first group (Category)
      expect(screen.getByText('Course')).toBeInTheDocument();
      expect(screen.getByText('Textbook')).toBeInTheDocument();
    });

    it('switches tabs when sidebar tab is clicked', () => {
      (useFormRead as any).mockReturnValue({
        ...defaultFormReturn,
        data: mockFormData,
      });

      render(<ExplorePage />);

      // Open filter
      fireEvent.click(screen.getByLabelText('Filters'));

      // Click Medium tab
      fireEvent.click(screen.getByText('Medium'));
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('shows sort options on Sort By tab', () => {
      (useFormRead as any).mockReturnValue({
        ...defaultFormReturn,
        data: mockFormData,
      });

      render(<ExplorePage />);

      // Open filter
      fireEvent.click(screen.getByLabelText('Filters'));

      // Click Sort By
      fireEvent.click(screen.getByText('Sort By'));
      expect(screen.getByText('Newest First')).toBeInTheDocument();
      expect(screen.getByText('Oldest First')).toBeInTheDocument();
    });

    it('clears filters when Clear Filters is clicked', () => {
      (useFormRead as any).mockReturnValue({
        ...defaultFormReturn,
        data: mockFormData,
      });

      render(<ExplorePage />);

      // Open filter
      fireEvent.click(screen.getByLabelText('Filters'));

      // Select a checkbox
      const checkbox = screen.getByLabelText('Course');
      fireEvent.click(checkbox);

      // Clear filters
      fireEvent.click(screen.getByText('Clear Filters'));

      // Checkbox should be unchecked
      expect(checkbox).not.toBeChecked();
    });

    it('closes filter modal when Close is clicked', () => {
      (useFormRead as any).mockReturnValue({
        ...defaultFormReturn,
        data: mockFormData,
      });

      render(<ExplorePage />);

      // Open filter
      fireEvent.click(screen.getByLabelText('Filters'));
      expect(screen.getByTestId('ion-modal')).toBeInTheDocument();

      // Click Close button in footer
      fireEvent.click(screen.getByText('Close'));

      // Modal should be closed (our mock IonModal renders null when isOpen=false)
      expect(screen.queryByTestId('ion-modal')).not.toBeInTheDocument();
    });

    it('shows skeleton loaders in filter modal when form data is loading', () => {
      (useFormRead as any).mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<ExplorePage />);

      // Open filter modal
      fireEvent.click(screen.getByLabelText('Filters'));

      // Modal opens and shows skeleton placeholders instead of filter tabs
      expect(screen.getByTestId('ion-modal')).toBeInTheDocument();
      expect(screen.getByText('Filters')).toBeInTheDocument();
      // No filter tab labels should be rendered
      expect(screen.queryByText('Category')).not.toBeInTheDocument();
    });
  });

  describe('filter badge count', () => {
    it('shows active filter count badge', () => {
      (useFormRead as any).mockReturnValue({
        ...defaultFormReturn,
        data: mockFormData,
      });

      render(<ExplorePage />);

      // Open filter and select an option
      fireEvent.click(screen.getByLabelText('Filters'));

      const checkbox = screen.getByLabelText('Course');
      fireEvent.click(checkbox);

      // Close filter
      fireEvent.click(screen.getByText('Close'));

      // Badge should show count
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('URL query param', () => {
    it('initializes search from ?query= URL param', () => {
      mockLocationSearch = '?query=mathematics';

      render(<ExplorePage />);

      // Search input should be visible and populated
      const input = screen.getByPlaceholderText('Search content...');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('mathematics');
    });

    it('does not show search input when no query param', () => {
      mockLocationSearch = '';

      render(<ExplorePage />);

      expect(screen.queryByPlaceholderText('Search content...')).not.toBeInTheDocument();
    });
  });
});
