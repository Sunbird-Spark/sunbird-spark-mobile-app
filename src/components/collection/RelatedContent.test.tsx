import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RelatedContent from './RelatedContent';
import type { RelatedContentItem } from '../../types/contentTypes';

// Mock icons
vi.mock('../icons/CollectionIcons', () => ({
  RightArrowIcon: () => <span data-testid="right-arrow-icon" />,
}));

// Mock react-router-dom
const mockPush = vi.fn();
vi.mock('react-router-dom', () => ({
  useHistory: () => ({ push: mockPush }),
}));

// Mock child cards
vi.mock('../content/CollectionCard', () => ({
  default: ({ item }: any) => <div data-testid="collection-card">{item.name}</div>,
}));
vi.mock('../content/ResourceCard', () => ({
  default: ({ item }: any) => <div data-testid="resource-card">{item.name}</div>,
}));

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'collection.relatedContent': 'Related Content',
  };
  return map[key] ?? key;
};

const mockItems: RelatedContentItem[] = [
  { identifier: 'do_1', name: 'Course A', appIcon: '', posterImage: '', mimeType: 'application/vnd.ekstep.content-collection', cardType: 'collection', creator: 'User 1' },
  { identifier: 'do_2', name: 'PDF Resource', appIcon: '', posterImage: '', mimeType: 'application/pdf', cardType: 'resource', creator: 'User 2' },
  { identifier: 'do_3', name: 'Video Lesson', appIcon: '', posterImage: '', mimeType: 'video/mp4', cardType: 'resource', creator: 'User 3' },
];

describe('RelatedContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when items array is empty', () => {
    const { container } = render(<RelatedContent items={[]} t={mockT} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the Related Content title', () => {
    render(<RelatedContent items={mockItems} t={mockT} />);
    expect(screen.getByText('Related Content')).toBeInTheDocument();
  });

  it('renders the right arrow icon', () => {
    render(<RelatedContent items={mockItems} t={mockT} />);
    expect(screen.getByTestId('right-arrow-icon')).toBeInTheDocument();
  });

  it('renders CollectionCard for collection cardType items', () => {
    render(<RelatedContent items={mockItems} t={mockT} />);
    const collectionCards = screen.getAllByTestId('collection-card');
    expect(collectionCards).toHaveLength(1);
    expect(screen.getByText('Course A')).toBeInTheDocument();
  });

  it('renders ResourceCard for resource cardType items', () => {
    render(<RelatedContent items={mockItems} t={mockT} />);
    const resourceCards = screen.getAllByTestId('resource-card');
    expect(resourceCards).toHaveLength(2);
    expect(screen.getByText('PDF Resource')).toBeInTheDocument();
    expect(screen.getByText('Video Lesson')).toBeInTheDocument();
  });

  it('wraps each card in cp-related-card-wrapper', () => {
    render(<RelatedContent items={mockItems} t={mockT} />);
    const wrappers = document.querySelectorAll('.cp-related-card-wrapper');
    expect(wrappers).toHaveLength(3);
  });

  it('renders a single collection item correctly', () => {
    const singleItem: RelatedContentItem[] = [
      { identifier: 'do_solo', name: 'Solo Course', appIcon: '', posterImage: '', mimeType: 'application/vnd.ekstep.content-collection', cardType: 'collection', creator: 'X' },
    ];
    render(<RelatedContent items={singleItem} t={mockT} />);
    expect(screen.getByTestId('collection-card')).toBeInTheDocument();
    expect(screen.queryByTestId('resource-card')).not.toBeInTheDocument();
  });

  it('renders a single resource item correctly', () => {
    const singleItem: RelatedContentItem[] = [
      { identifier: 'do_solo', name: 'Solo PDF', appIcon: '', posterImage: '', mimeType: 'application/pdf', cardType: 'resource', creator: 'Y' },
    ];
    render(<RelatedContent items={singleItem} t={mockT} />);
    expect(screen.getByTestId('resource-card')).toBeInTheDocument();
    expect(screen.queryByTestId('collection-card')).not.toBeInTheDocument();
  });
});
