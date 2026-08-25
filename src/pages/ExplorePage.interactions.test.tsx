import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

let mockIsOffline = false;
vi.mock('../providers/NetworkProvider', () => ({
  useNetwork: () => ({ connected: !mockIsOffline, isOffline: mockIsOffline }),
}));

vi.mock('../components/common/LanguageSelector', () => ({ LanguageSelector: () => null }));
vi.mock('../components/common/QRScanButton', () => ({ QRScanButton: () => null }));
vi.mock('../components/common/SemanticSuggestions', () => ({
  SemanticSuggestions: ({ onPick, offline }: any) => (
    <div data-testid="semantic-suggestions" data-offline={String(offline)}>
      <button onClick={() => onPick('space exploration')}>pick-suggestion</button>
    </div>
  ),
}));
vi.mock('../components/common/AiToggle', () => ({
  AiToggle: ({ active, onToggle, disabled }: any) => (
    <button data-testid="ai-toggle" data-active={String(active)} disabled={disabled} onClick={onToggle}>
      ai
    </button>
  ),
}));

let mockAiSearchEnabled = true;
vi.mock('../hooks/useAiSearchEnabled', () => ({
  useAiSearchEnabled: () => mockAiSearchEnabled,
}));

let mockLocationSearch = '';
const mockHistoryReplace = vi.fn();
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ search: mockLocationSearch, pathname: '/explore' }),
  useHistory: () => ({ replace: mockHistoryReplace, push: vi.fn() }),
}));

const mockRefresherComplete = vi.fn();
let capturedViewDidEnter: (() => void) | undefined;

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonHeader: ({ children }: any) => <div>{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  IonModal: ({ isOpen, children, onDidDismiss }: any) => (
    <>
      <button data-testid="modal-dismiss" onClick={onDidDismiss}>dismiss</button>
      {isOpen ? <div data-testid="ion-modal">{children}</div> : null}
    </>
  ),
  IonInfiniteScroll: ({ children, onIonInfinite, disabled }: any) => (
    <div data-testid="ion-infinite-scroll" data-disabled={String(disabled)}>
      <button data-testid="load-more" onClick={onIonInfinite}>more</button>
      {children}
    </div>
  ),
  IonInfiniteScrollContent: () => <div data-testid="ion-infinite-scroll-content" />,
  IonRefresher: ({ children, onIonRefresh }: any) => (
    <div data-testid="ion-refresher">
      <button
        data-testid="do-refresh"
        onClick={() => onIonRefresh({ target: { complete: mockRefresherComplete } })}
      >
        refresh
      </button>
      {children}
    </div>
  ),
  IonRefresherContent: () => <div data-testid="ion-refresher-content" />,
  IonSpinner: () => <div data-testid="ion-spinner" />,
  useIonViewDidEnter: (cb: () => void) => { capturedViewDidEnter = cb; },
}));

vi.mock('../components/layout/BottomNavigation', () => ({
  BottomNavigation: () => <div data-testid="bottom-navigation" />,
}));
vi.mock('./ExplorePage.css', () => ({}));
vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error, onRetry }: any) => (
    <div data-testid="page-loader">
      {message && <span>{message}</span>}
      {error && <><span>{error}</span>{onRetry && <button onClick={onRetry}>retry</button>}</>}
    </div>
  ),
}));
vi.mock('../components/content/CollectionCard', () => ({
  default: ({ item }: any) => <div data-testid="collection-card">{item.name}</div>,
}));
vi.mock('../components/content/ResourceCard', () => ({
  default: ({ item }: any) => <div data-testid="resource-card">{item.name}</div>,
}));

const mockRefetch = vi.fn().mockResolvedValue(undefined);
const mockRefetchForm = vi.fn().mockResolvedValue(undefined);

vi.mock('../hooks/useContentSearch', () => ({ useContentSearch: vi.fn() }));
vi.mock('../hooks/useFormRead', () => ({ useFormRead: vi.fn() }));
vi.mock('../hooks/useDebounce', () => ({ default: (value: string) => value }));
vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));

import ExplorePage from './ExplorePage';
import { useContentSearch } from '../hooks/useContentSearch';
import { useFormRead } from '../hooks/useFormRead';

const COLLECTION_MIME = 'application/vnd.ekstep.content-collection';

const makeItems = (count: number, startIdx = 0) =>
  Array.from({ length: count }, (_, i) => ({
    identifier: `do_${startIdx + i}`,
    name: `Item ${startIdx + i}`,
    mimeType: 'application/pdf',
  }));

const setSearch = (overrides: Record<string, unknown> = {}) => {
  (useContentSearch as any).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  });
};

const lastSearchOffset = () => {
  const calls = (useContentSearch as any).mock.calls;
  return calls[calls.length - 1][0].request.offset;
};

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
        ],
      },
    },
  },
};

describe('ExplorePage — interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockLocationSearch = '';
    mockIsOffline = false;
    mockAiSearchEnabled = true;
    capturedViewDidEnter = undefined;
    setSearch();
    (useFormRead as any).mockReturnValue({ data: undefined, isLoading: false, refetch: mockRefetchForm });
  });

  describe('pagination', () => {
    it('requests the next page when more results are available', () => {
      setSearch({ data: { data: { content: makeItems(9), QuestionSet: [] } } });
      render(<ExplorePage />);
      expect(lastSearchOffset()).toBe(0);
      fireEvent.click(screen.getByTestId('load-more'));
      expect(lastSearchOffset()).toBe(9);
    });

    it('does not advance the offset once a short page proves there is no more', () => {
      setSearch({ data: { data: { content: makeItems(3), QuestionSet: [] } } });
      render(<ExplorePage />);
      fireEvent.click(screen.getByTestId('load-more'));
      expect(lastSearchOffset()).toBe(0);
      expect(screen.getByTestId('ion-infinite-scroll')).toHaveAttribute('data-disabled', 'true');
    });

    it('does not advance the offset while a page is still loading', () => {
      setSearch({ data: { data: { content: makeItems(9), QuestionSet: [] } }, isLoading: true });
      render(<ExplorePage />);
      fireEvent.click(screen.getByTestId('load-more'));
      expect(lastSearchOffset()).toBe(0);
    });

    it('appends the next page and drops identifiers already on screen', () => {
      setSearch({ data: { data: { content: makeItems(9), QuestionSet: [] } } });
      const { rerender } = render(<ExplorePage />);
      expect(screen.getAllByTestId('resource-card')).toHaveLength(9);

      fireEvent.click(screen.getByTestId('load-more'));
      // Page two repeats do_8 and adds do_9 / do_10.
      setSearch({ data: { data: { content: makeItems(3, 8), QuestionSet: [] } } });
      rerender(<ExplorePage />);

      const names = screen.getAllByTestId('resource-card').map(el => el.textContent);
      expect(names).toHaveLength(11);
      expect(names.filter(n => n === 'Item 8')).toHaveLength(1);
      expect(names).toContain('Item 10');
    });

    it('merges QuestionSet results alongside content results', () => {
      setSearch({
        data: {
          data: {
            content: [{ identifier: 'c1', name: 'Book', mimeType: COLLECTION_MIME }],
            QuestionSet: [{ identifier: 'q1', name: 'Quiz', mimeType: 'application/vnd.sunbird.questionset' }],
          },
        },
      });
      render(<ExplorePage />);
      expect(screen.getByText('Book')).toBeInTheDocument();
      expect(screen.getByText('Quiz')).toBeInTheDocument();
    });
  });

  describe('pull to refresh and view lifecycle', () => {
    it('resets, refetches and completes the refresher', async () => {
      setSearch({ data: { data: { content: makeItems(9), QuestionSet: [] } } });
      render(<ExplorePage />);
      fireEvent.click(screen.getByTestId('load-more'));
      expect(lastSearchOffset()).toBe(9);

      fireEvent.click(screen.getByTestId('do-refresh'));
      await waitFor(() => expect(mockRefetch).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockRefresherComplete).toHaveBeenCalledTimes(1));
      expect(lastSearchOffset()).toBe(0);
    });

    it('refetches the filter form when the tab becomes active again', () => {
      render(<ExplorePage />);
      expect(mockRefetchForm).not.toHaveBeenCalled();
      capturedViewDidEnter?.();
      expect(mockRefetchForm).toHaveBeenCalledTimes(1);
    });
  });

  describe('search bar', () => {
    it('opens the search bar and focuses the input', async () => {
      render(<ExplorePage />);
      fireEvent.click(screen.getByRole('button', { name: 'search' }));
      const input = screen.getByRole('textbox', { name: 'searchContentPlaceholder' });
      await waitFor(() => expect(document.activeElement).toBe(input));
    });

    it('clears the query and reverts to keyword mode when the bar is closed', () => {
      mockLocationSearch = '?query=maths&mode=semantic';
      render(<ExplorePage />);
      expect(screen.getByRole('textbox', { name: 'searchContentPlaceholder' })).toHaveValue('maths');

      fireEvent.click(screen.getByRole('button', { name: 'back' }));
      expect(screen.queryByRole('textbox', { name: 'searchContentPlaceholder' })).toBeNull();
      expect(screen.getByText('exploreTitle')).toBeInTheDocument();
    });

    it('clears the query from the inline clear button without closing the bar', () => {
      mockLocationSearch = '?query=maths';
      render(<ExplorePage />);
      fireEvent.click(screen.getByRole('button', { name: 'close' }));
      expect(screen.getByRole('textbox', { name: 'searchContentPlaceholder' })).toHaveValue('');
    });
  });

  describe('AI search mode', () => {
    it('switches to semantic mode and records it in the URL', () => {
      render(<ExplorePage />);
      fireEvent.click(screen.getByRole('button', { name: 'search' }));
      fireEvent.click(screen.getByTestId('ai-toggle'));
      expect(mockHistoryReplace).toHaveBeenCalledWith({ search: '?mode=semantic' });
      expect(screen.getByTestId('ai-toggle')).toHaveAttribute('data-active', 'true');
    });

    it('drops the mode param when switching back to keyword', () => {
      mockLocationSearch = '?mode=semantic';
      render(<ExplorePage />);
      fireEvent.click(screen.getByTestId('ai-toggle'));
      expect(mockHistoryReplace).toHaveBeenCalledWith({ search: '' });
    });

    it('preserves other query params when toggling the mode', () => {
      mockLocationSearch = '?query=maths';
      render(<ExplorePage />);
      fireEvent.click(screen.getByTestId('ai-toggle'));
      expect(mockHistoryReplace).toHaveBeenCalledWith({ search: '?query=maths&mode=semantic' });
    });

    it('forces keyword mode when AI search is disabled by the build config', () => {
      mockAiSearchEnabled = false;
      mockLocationSearch = '?mode=semantic';
      const { container } = render(<ExplorePage />);
      expect(container.querySelector('.explore-search-bar--ai')).toBeNull();
      expect(screen.queryByTestId('ai-toggle')).toBeNull();
    });

    it('offers suggestions while the semantic query is empty and runs the picked one', () => {
      mockLocationSearch = '?mode=semantic';
      render(<ExplorePage />);
      expect(screen.getByTestId('semantic-suggestions')).toHaveAttribute('data-offline', 'false');
      fireEvent.click(screen.getByText('pick-suggestion'));
      expect(screen.getByRole('textbox', { name: 'searchContentPlaceholder' })).toHaveValue('space exploration');
      expect(screen.queryByTestId('semantic-suggestions')).toBeNull();
    });
  });

  describe('filter sheet', () => {
    beforeEach(() => {
      (useFormRead as any).mockReturnValue({ data: mockFormData, isLoading: false, refetch: mockRefetchForm });
    });

    it('adds and removes a filter value, updating the badge and the query', () => {
      render(<ExplorePage />);
      fireEvent.click(screen.getByRole('button', { name: 'filters' }));

      const courseBox = screen.getByLabelText('Course');
      fireEvent.click(courseBox);
      expect((useContentSearch as any).mock.calls.at(-1)[0].request.filters.primaryCategory).toEqual(['Course']);

      fireEvent.click(screen.getByLabelText('Course'));
      expect((useContentSearch as any).mock.calls.at(-1)[0].request.filters.primaryCategory).toBeUndefined();
    });

    it('changes the sort order from the sort tab', () => {
      render(<ExplorePage />);
      fireEvent.click(screen.getByRole('button', { name: 'filters' }));
      fireEvent.click(screen.getByRole('tab', { name: 'sortBy' }));

      fireEvent.click(screen.getByLabelText('oldestFirst'));
      expect((useContentSearch as any).mock.calls.at(-1)[0].request.sort_by).toEqual({ lastUpdatedOn: 'asc' });
    });

    it('clears every applied filter and restores the default sort', () => {
      render(<ExplorePage />);
      fireEvent.click(screen.getByRole('button', { name: 'filters' }));
      fireEvent.click(screen.getByLabelText('Course'));
      expect(screen.getByLabelText('Course')).toBeChecked();

      fireEvent.click(screen.getByText('clearFilters'));
      expect(screen.getByLabelText('Course')).not.toBeChecked();
      expect((useContentSearch as any).mock.calls.at(-1)[0].request.sort_by).toEqual({ lastUpdatedOn: 'desc' });
    });

    it('closes from the header close button', () => {
      const { container } = render(<ExplorePage />);
      fireEvent.click(screen.getByRole('button', { name: 'filters' }));
      expect(screen.getByTestId('ion-modal')).toBeInTheDocument();
      fireEvent.click(container.querySelector('.close-btn')!);
      expect(screen.queryByTestId('ion-modal')).toBeNull();
    });

    it('closes from the footer apply button', () => {
      const { container } = render(<ExplorePage />);
      fireEvent.click(screen.getByRole('button', { name: 'filters' }));
      fireEvent.click(container.querySelector('.apply-filters-btn')!);
      expect(screen.queryByTestId('ion-modal')).toBeNull();
    });

    it('closes when Ionic dismisses the sheet', () => {
      render(<ExplorePage />);
      fireEvent.click(screen.getByRole('button', { name: 'filters' }));
      fireEvent.click(screen.getByTestId('modal-dismiss'));
      expect(screen.queryByTestId('ion-modal')).toBeNull();
    });
  });
});
