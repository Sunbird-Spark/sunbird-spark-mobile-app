import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ResourceCard from './ResourceCard';
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

describe('ResourceCard', () => {
  const mockItem: ContentSearchItem = {
    identifier: 'do_12345',
    name: 'Test Resource',
    posterImage: 'https://example.com/poster.jpg',
    appIcon: 'https://example.com/icon.jpg',
    thumbnail: 'https://example.com/thumb.jpg',
    mimeType: 'application/pdf',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the resource name', () => {
      render(<ResourceCard item={mockItem} />);
      expect(screen.getByText('Test Resource')).toBeInTheDocument();
    });

    it('renders "Untitled" when name is missing', () => {
      const itemWithoutName = { ...mockItem, name: undefined };
      render(<ResourceCard item={itemWithoutName} />);
      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('renders the image using posterImage first', () => {
      render(<ResourceCard item={mockItem} />);
      const img = screen.getByTestId('ion-img');
      expect(img).toHaveAttribute('src', 'https://example.com/poster.jpg');
    });

    it('falls back to appIcon when posterImage is missing', () => {
      const item = { ...mockItem, posterImage: undefined };
      render(<ResourceCard item={item} />);
      const img = screen.getByTestId('ion-img');
      expect(img).toHaveAttribute('src', 'https://example.com/icon.jpg');
    });

    it('falls back to thumbnail when posterImage and appIcon are missing', () => {
      const item = { ...mockItem, posterImage: undefined, appIcon: undefined };
      render(<ResourceCard item={item} />);
      const img = screen.getByTestId('ion-img');
      expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
    });

    it('renders placeholder when no image is available', () => {
      const item = { ...mockItem, posterImage: undefined, appIcon: undefined, thumbnail: undefined };
      render(<ResourceCard item={item} />);
      expect(screen.queryByTestId('ion-img')).not.toBeInTheDocument();
      expect(document.querySelector('.resource-card-image-placeholder')).toBeInTheDocument();
    });
  });

  describe('MIME type labels', () => {
    it.each([
      ['video/x-youtube', 'Video'],
      ['video/webm', 'Video'],
      ['video/mp4', 'Video'],
      ['application/pdf', 'PDF'],
      ['application/epub', 'EPUB'],
      ['application/vnd.ekstep.html-archive', 'HTML'],
      ['application/vnd.ekstep.ecml-archive', 'ECML'],
      ['application/vnd.ekstep.h5p-archive', 'H5P'],
    ])('displays "%s" as "%s"', (mimeType, expectedLabel) => {
      const item = { ...mockItem, mimeType };
      render(<ResourceCard item={item} />);
      const badges = screen.getAllByText(expectedLabel);
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    it('displays "View" for unknown mime types', () => {
      const item = { ...mockItem, mimeType: 'application/unknown' };
      render(<ResourceCard item={item} />);
      const viewLabels = screen.getAllByText('View');
      expect(viewLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('displays "View" when mimeType is undefined', () => {
      const item = { ...mockItem, mimeType: undefined };
      render(<ResourceCard item={item} />);
      const viewLabels = screen.getAllByText('View');
      expect(viewLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Navigation', () => {
    it('navigates to content detail page on click', () => {
      render(<ResourceCard item={mockItem} />);
      const card = document.querySelector('.resource-card')!;
      fireEvent.click(card);
      expect(mockPush).toHaveBeenCalledWith('/content/do_12345');
    });

    it('navigates with correct identifier', () => {
      const item = { ...mockItem, identifier: 'do_99999' };
      render(<ResourceCard item={item} />);
      const card = document.querySelector('.resource-card')!;
      fireEvent.click(card);
      expect(mockPush).toHaveBeenCalledWith('/content/do_99999');
    });
  });

  describe('Badge and action', () => {
    it('renders the mime type badge', () => {
      render(<ResourceCard item={mockItem} />);
      const badge = document.querySelector('.resource-card-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('PDF');
    });

    it('renders the action section with label and arrow', () => {
      render(<ResourceCard item={mockItem} />);
      const action = document.querySelector('.resource-card-action');
      expect(action).toBeInTheDocument();
      expect(action).toHaveTextContent('PDF');
      expect(document.querySelector('.resource-card-arrow')).toBeInTheDocument();
    });
  });
});
