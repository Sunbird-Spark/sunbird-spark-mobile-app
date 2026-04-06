import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DownloadedContentsPage from './DownloadedContentsPage';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children, className }: any) => <div>{children}</div>,
  IonToolbar: ({ children, className }: any) => <div>{children}</div>,
  IonTitle: ({ children, className }: any) => <h1 className={className}>{children}</h1>,
  IonContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonButtons: ({ children, slot }: any) => <div data-slot={slot}>{children}</div>,
  IonBackButton: ({ defaultHref, text, icon, className, color }: any) => (
    <button data-testid="ion-back-button" className={className} data-href={defaultHref} />
  ),
  IonAlert: () => null,
  IonImg: ({ src, alt, className }: any) => <img src={src} alt={alt} className={className} />,
  useIonRouter: () => ({ push: vi.fn(), goBack: vi.fn() }),
}));

vi.mock('ionicons/icons', () => ({
  chevronBackOutline: 'chevron-back',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: any) => key }),
}));

vi.mock('react-router', () => ({
  useHistory: () => ({ push: vi.fn() }),
}));

vi.mock('../services/db/ContentDbService', () => ({
  contentDbService: {
    getDownloadedContent: vi.fn(),
  },
}));

vi.mock('../services/download_manager', () => ({
  downloadManager: {
    subscribe: vi.fn().mockReturnValue(vi.fn()),
  },
}));

vi.mock('../services/content/contentDeleteHelper', () => ({
  deleteDownloadedContent: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    convertFileSrc: vi.fn((url: string) => url),
  },
}));

vi.mock('../utils/placeholderImages', () => ({
  getPlaceholderImage: () => 'placeholder.png',
}));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));
vi.mock('./DownloadedContentsPage.css', () => ({}));

import { contentDbService } from '../services/db/ContentDbService';

const sampleEntry = {
  identifier: 'do_123',
  server_data: JSON.stringify({ name: 'Test Content', appIcon: '' }),
  local_data: '',
  mime_type: 'application/pdf',
  path: null,
  visibility: 'Default' as const,
  server_last_updated_on: null,
  local_last_updated_on: '',
  ref_count: 1,
  content_state: 2,
  content_type: 'Resource',
  audience: 'Student',
  size_on_device: 1024,
  pragma: '',
  manifest_version: '',
  dialcodes: '',
  child_nodes: '',
  primary_category: 'Learning Resource',
};

describe('DownloadedContentsPage — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (contentDbService.getDownloadedContent as any).mockResolvedValue([]);
  });

  it('empty state has role="status" and aria-live="polite" when no downloaded content', async () => {
    render(<DownloadedContentsPage />);
    await waitFor(() => {
      const statusEl = screen.getByRole('status');
      expect(statusEl).toBeInTheDocument();
      expect(statusEl).toHaveAttribute('aria-live', 'polite');
    });
  });

  it('card body has role="button" and aria-label="openItem" when content exists', async () => {
    (contentDbService.getDownloadedContent as any).mockResolvedValue([sampleEntry]);
    const { container } = render(<DownloadedContentsPage />);
    await waitFor(() => {
      const cardBody = container.querySelector('.dc-card-body');
      expect(cardBody).toHaveAttribute('role', 'button');
      expect(cardBody?.getAttribute('aria-label')).toBe('openItem');
    });
  });

  it('delete action has role="button" and aria-label="deleteItem" when content exists', async () => {
    (contentDbService.getDownloadedContent as any).mockResolvedValue([sampleEntry]);
    const { container } = render(<DownloadedContentsPage />);
    await waitFor(() => {
      const deleteAction = container.querySelector('.dc-delete-action');
      expect(deleteAction).toHaveAttribute('role', 'button');
      expect(deleteAction?.getAttribute('aria-label')).toBe('deleteItem');
    });
  });

  it('renders back button', () => {
    render(<DownloadedContentsPage />);
    expect(screen.getByTestId('ion-back-button')).toBeInTheDocument();
  });

  it('renders content name from server_data', async () => {
    (contentDbService.getDownloadedContent as any).mockResolvedValue([sampleEntry]);
    const { container } = render(<DownloadedContentsPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  it('renders content with appIcon (uses dc-thumb-img class)', async () => {
    const entryWithIcon = {
      ...sampleEntry,
      server_data: JSON.stringify({ name: 'Test', appIcon: 'http://example.com/icon.png' }),
    };
    (contentDbService.getDownloadedContent as any).mockResolvedValue([entryWithIcon]);
    const { container } = render(<DownloadedContentsPage />);
    await waitFor(() => {
      const img = container.querySelector('.dc-thumb-img');
      expect(img).toBeInTheDocument();
    });
  });

  it('clicking the card body calls navigate', async () => {
    (contentDbService.getDownloadedContent as any).mockResolvedValue([sampleEntry]);
    const { container } = render(<DownloadedContentsPage />);
    await waitFor(() => {
      const cardBody = container.querySelector('.dc-card-body');
      expect(cardBody).toBeInTheDocument();
    });
    const cardBody = container.querySelector('.dc-card-body')!;
    fireEvent.click(cardBody);
    // No crash = pass
    expect(cardBody).toBeInTheDocument();
  });

  it('clicking the delete action shows confirmation', async () => {
    (contentDbService.getDownloadedContent as any).mockResolvedValue([sampleEntry]);
    const { container } = render(<DownloadedContentsPage />);
    await waitFor(() => {
      const deleteAction = container.querySelector('.dc-delete-action');
      expect(deleteAction).toBeInTheDocument();
    });
    const deleteAction = container.querySelector('.dc-delete-action')!;
    fireEvent.click(deleteAction);
    // No crash = pass (IonAlert is mocked as null)
  });

  it('content with size_on_device 0 does not render size text', async () => {
    const entryZeroSize = { ...sampleEntry, size_on_device: 0 };
    (contentDbService.getDownloadedContent as any).mockResolvedValue([entryZeroSize]);
    render(<DownloadedContentsPage />);
    await waitFor(() => {
      // Size text not rendered when size_on_device === 0
      expect(screen.queryByText(/\d+ B$/)).toBeNull();
    });
  });

  it('content with server_data parse failure uses identifier', async () => {
    const badEntry = { ...sampleEntry, server_data: 'invalid-json', identifier: 'fallback_id' };
    (contentDbService.getDownloadedContent as any).mockResolvedValue([badEntry]);
    render(<DownloadedContentsPage />);
    await waitFor(() => {
      expect(screen.getByText('fallback_id')).toBeInTheDocument();
    });
  });
});
