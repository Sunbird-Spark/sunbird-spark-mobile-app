import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CollectionCard from './CollectionCard';
import type { ContentSearchItem } from '../../types/contentTypes';

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonImg: ({ src, alt, className }: any) => (
    <img data-testid="ion-img" src={src} alt={alt} className={className} />
  ),
}));

// Mock react-router-dom
const mockPush = vi.fn();
vi.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: mockPush,
  }),
}));

// Mock CSS import
vi.mock('./ContentCards.css', () => ({}));

describe('CollectionCard', () => {
  const mockItem: ContentSearchItem = {
    identifier: 'do_12345',
    name: 'Test Collection',
    posterImage: 'https://example.com/poster.jpg',
    appIcon: 'https://example.com/icon.jpg',
    thumbnail: 'https://example.com/thumb.jpg',
    creator: 'Test Creator',
    createdBy: 'Test Author',
    leafNodesCount: 10,
    primaryCategory: 'Course',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the collection name', () => {
      render(<CollectionCard item={mockItem} />);
      expect(screen.getByText('Test Collection')).toBeInTheDocument();
    });

    it('renders "Untitled" when name is missing', () => {
      const itemWithoutName = { ...mockItem, name: undefined };
      render(<CollectionCard item={itemWithoutName} />);
      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('renders the badge with primaryCategory', () => {
      render(<CollectionCard item={mockItem} />);
      expect(screen.getByText('Course')).toBeInTheDocument();
    });

    it('renders "Collection" badge when primaryCategory is missing', () => {
      const item = { ...mockItem, primaryCategory: undefined };
      render(<CollectionCard item={item} />);
      expect(screen.getByText('Collection')).toBeInTheDocument();
    });

    it('renders the creator name', () => {
      render(<CollectionCard item={mockItem} />);
      expect(screen.getByText('Test Creator')).toBeInTheDocument();
    });

    it('renders lessons count', () => {
      render(<CollectionCard item={mockItem} />);
      expect(screen.getByText('10 Lessons')).toBeInTheDocument();
    });

    it('renders the separator dot', () => {
      render(<CollectionCard item={mockItem} />);
      const dot = screen.getByText('\u2022');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('Image fallback chain', () => {
    it('uses posterImage first', () => {
      render(<CollectionCard item={mockItem} />);
      const img = screen.getByTestId('ion-img');
      expect(img).toHaveAttribute('src', 'https://example.com/poster.jpg');
    });

    it('falls back to appIcon when posterImage is missing', () => {
      const item = { ...mockItem, posterImage: undefined };
      render(<CollectionCard item={item} />);
      const img = screen.getByTestId('ion-img');
      expect(img).toHaveAttribute('src', 'https://example.com/icon.jpg');
    });

    it('falls back to thumbnail when posterImage and appIcon are missing', () => {
      const item = { ...mockItem, posterImage: undefined, appIcon: undefined };
      render(<CollectionCard item={item} />);
      const img = screen.getByTestId('ion-img');
      expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
    });

    it('renders placeholder when no image is available', () => {
      const item = { ...mockItem, posterImage: undefined, appIcon: undefined, thumbnail: undefined };
      render(<CollectionCard item={item} />);
      expect(screen.queryByTestId('ion-img')).not.toBeInTheDocument();
    });
  });

  describe('Creator fallback', () => {
    it('uses creator field first', () => {
      render(<CollectionCard item={mockItem} />);
      expect(screen.getByText('Test Creator')).toBeInTheDocument();
    });

    it('falls back to createdBy when creator is missing', () => {
      const item = { ...mockItem, creator: undefined };
      render(<CollectionCard item={item} />);
      expect(screen.getByText('Test Author')).toBeInTheDocument();
    });

    it('shows "Unknown" when both creator and createdBy are missing', () => {
      const item = { ...mockItem, creator: undefined, createdBy: undefined };
      render(<CollectionCard item={item} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Lessons count', () => {
    it('shows 0 Lessons when leafNodesCount is missing', () => {
      const item = { ...mockItem, leafNodesCount: undefined };
      render(<CollectionCard item={item} />);
      expect(screen.getByText('0 Lessons')).toBeInTheDocument();
    });

    it('shows correct lessons count', () => {
      const item = { ...mockItem, leafNodesCount: 25 };
      render(<CollectionCard item={item} />);
      expect(screen.getByText('25 Lessons')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to collection detail page on click', () => {
      render(<CollectionCard item={mockItem} />);
      const card = document.querySelector('.collection-card')!;
      fireEvent.click(card);
      expect(mockPush).toHaveBeenCalledWith('/collection/do_12345');
    });

    it('navigates with the correct identifier', () => {
      const item = { ...mockItem, identifier: 'do_99999' };
      render(<CollectionCard item={item} />);
      const card = document.querySelector('.collection-card')!;
      fireEvent.click(card);
      expect(mockPush).toHaveBeenCalledWith('/collection/do_99999');
    });
  });
});
