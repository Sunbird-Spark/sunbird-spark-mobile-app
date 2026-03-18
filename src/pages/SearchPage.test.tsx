import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SearchPage from './SearchPage';

// ── Mock router ──
const mockPush = vi.fn();
const mockGoBack = vi.fn();
vi.mock('react-router-dom', () => ({
  useHistory: () => ({ push: mockPush, goBack: mockGoBack, length: 2 }),
}));

// ── Mock Ionic components ──
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
  IonToolbar: ({ children }: any) => <div data-testid="ion-toolbar">{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  IonInput: ({ value, placeholder, onIonInput, ...rest }: any) => (
    <input
      data-testid="ion-input"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onIonInput?.({ detail: { value: e.target.value } })}
    />
  ),
  IonSpinner: () => <div data-testid="ion-spinner" />,
}));

// ── Mock CSS ──
vi.mock('./SearchPage.css', () => ({}));

// ── Mock child cards ──
vi.mock('../components/content/CollectionCard', () => ({
  default: ({ item }: any) => <div data-testid="collection-card">{item.name}</div>,
}));
vi.mock('../components/content/ResourceCard', () => ({
  default: ({ item }: any) => <div data-testid="resource-card">{item.name}</div>,
}));

// ── Mock useDebounce to return value immediately ──
vi.mock('../hooks/useDebounce', () => ({
  default: (value: string) => value,
}));

// ── Mock useContentSearch ──
const defaultSearchReturn = {
  data: undefined as any,
  isLoading: false,
  error: null,
};

vi.mock('../hooks/useContentSearch', () => ({
  useContentSearch: vi.fn(() => defaultSearchReturn),
}));

import { useContentSearch } from '../hooks/useContentSearch';

const COLLECTION_MIME = 'application/vnd.ekstep.content-collection';

const makeItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    identifier: `do_${i}`,
    name: `Item ${i}`,
    mimeType: i === 0 ? COLLECTION_MIME : 'application/pdf',
  }));

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useContentSearch as any).mockReturnValue({ ...defaultSearchReturn });
  });

  it('renders page structure', () => {
    render(<SearchPage />);
    expect(screen.getByTestId('ion-page')).toBeInTheDocument();
    expect(screen.getByTestId('ion-header')).toBeInTheDocument();
    expect(screen.getByTestId('ion-content')).toBeInTheDocument();
  });

  it('renders search input with placeholder', () => {
    render(<SearchPage />);
    expect(screen.getByPlaceholderText('Search courses, textbooks...')).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    render(<SearchPage />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows default state when no search query', () => {
    render(<SearchPage />);
    expect(screen.getByText('Search for courses, textbooks, and more')).toBeInTheDocument();
  });

  it('navigates back when Cancel is clicked', () => {
    render(<SearchPage />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows clear button when search query has text', () => {
    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search courses, textbooks...');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('clears search query when clear button is clicked', () => {
    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search courses, textbooks...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(input.value).toBe('');
  });

  it('shows loading spinner when searching', () => {
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      isLoading: true,
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search courses, textbooks...');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('shows error message on search failure', () => {
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      error: new Error('Network error'),
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search courses, textbooks...');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(screen.getByText('Search failed: Network error')).toBeInTheDocument();
  });

  it('shows "No results" when search returns empty', () => {
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      data: { data: { content: [], count: 0 } },
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search courses, textbooks...');
    fireEvent.change(input, { target: { value: 'xyz' } });

    expect(screen.getByText(/No results for/)).toBeInTheDocument();
  });

  it('renders results heading with query text', () => {
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      data: { data: { content: makeItems(2), count: 2 } },
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search courses, textbooks...');
    fireEvent.change(input, { target: { value: 'data' } });

    expect(screen.getByText(/Results for/)).toBeInTheDocument();
  });

  it('renders CollectionCard for collection mimeType and ResourceCard for others', () => {
    const items = makeItems(3);
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      data: { data: { content: items, count: 10 } },
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search courses, textbooks...');
    fireEvent.change(input, { target: { value: 'data' } });

    // Item 0 is collection, items 1-2 are resources
    expect(screen.getAllByTestId('collection-card')).toHaveLength(1);
    expect(screen.getAllByTestId('resource-card')).toHaveLength(2);
  });

  it('shows "View All Results" when total count exceeds preview limit', () => {
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      data: { data: { content: makeItems(3), count: 15 } },
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search courses, textbooks...');
    fireEvent.change(input, { target: { value: 'data' } });

    expect(screen.getByText(/View All Results/)).toBeInTheDocument();
  });

  it('does not show "View All Results" when total count is within preview limit', () => {
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      data: { data: { content: makeItems(2), count: 2 } },
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search courses, textbooks...');
    fireEvent.change(input, { target: { value: 'data' } });

    expect(screen.queryByText(/View All Results/)).not.toBeInTheDocument();
  });

  it('navigates to explore page with query when "View All Results" is clicked', () => {
    (useContentSearch as any).mockReturnValue({
      ...defaultSearchReturn,
      data: { data: { content: makeItems(3), count: 15 } },
    });

    render(<SearchPage />);
    const input = screen.getByPlaceholderText('Search courses, textbooks...');
    fireEvent.change(input, { target: { value: 'data science' } });

    fireEvent.click(screen.getByText(/View All Results/));
    expect(mockPush).toHaveBeenCalledWith('/explore?query=data%20science');
  });
});
