import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DownloadsPage from './DownloadsPage';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: any) => <div>{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  IonIcon: ({ icon }: any) => <span data-icon={icon} />,
  IonSpinner: () => <span data-testid="ion-spinner" />,
  IonProgressBar: ({ value }: any) => <div data-testid="ion-progress-bar" data-value={value} />,
}));

vi.mock('ionicons/icons', () => ({
  pauseCircleOutline: 'pause',
  playCircleOutline: 'play',
  closeCircleOutline: 'close',
  refreshOutline: 'refresh',
  alertCircleOutline: 'alert',
  timeOutline: 'time',
  cloudDownloadOutline: 'cloud-download',
}));

vi.mock('../components/layout/AppHeader', () => ({
  AppHeader: ({ title }: any) => <div data-testid="app-header">{title}</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, _opts?: any) => key,
  }),
}));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));

vi.mock('../hooks/useDownloadQueue', () => ({
  useDownloadQueue: vi.fn().mockReturnValue([]),
}));

vi.mock('../hooks/useStorageInfo', () => ({
  useStorageInfo: vi.fn().mockReturnValue({ totalBytes: 5000, itemCount: 2 }),
}));

vi.mock('../services/download_manager', () => ({
  downloadManager: {
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    retryAllFailed: vi.fn(),
    cancelAll: vi.fn(),
  },
  DownloadState: {
    DOWNLOADING: 'DOWNLOADING',
    PAUSED: 'PAUSED',
    IMPORTING: 'IMPORTING',
    QUEUED: 'QUEUED',
    RETRY_WAIT: 'RETRY_WAIT',
    FAILED: 'FAILED',
    COMPLETED: 'COMPLETED',
  },
}));

import { useDownloadQueue } from '../hooks/useDownloadQueue';
import { downloadManager } from '../services/download_manager';

const makeEntry = (state: string, overrides: any = {}) => ({
  identifier: `id-${state}`,
  state,
  progress: 50,
  bytes_downloaded: 1000,
  total_bytes: 2000,
  content_meta: null,
  last_error: null,
  ...overrides,
});

describe('DownloadsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDownloadQueue).mockReturnValue([]);
  });

  it('has a <main id="main-content"> landmark', () => {
    const { container } = render(<DownloadsPage />);
    expect(container.querySelector('main#main-content')).toBeInTheDocument();
  });

  it('shows empty state when no downloads', () => {
    const { container } = render(<DownloadsPage />);
    expect(container.querySelector('.dl-empty')).toBeInTheDocument();
  });

  it('shows active downloading section with progress bar', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('DOWNLOADING')]);
    const { container } = render(<DownloadsPage />);
    expect(container.querySelector('.dl-section')).toBeInTheDocument();
    expect(screen.getByTestId('ion-progress-bar')).toBeInTheDocument();
  });

  it('shows pause button for DOWNLOADING entry', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('DOWNLOADING')]);
    render(<DownloadsPage />);
    expect(screen.getByRole('button', { name: 'pause' })).toBeInTheDocument();
  });

  it('shows resume button for PAUSED entry', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('PAUSED')]);
    render(<DownloadsPage />);
    expect(screen.getByRole('button', { name: 'download.resume' })).toBeInTheDocument();
  });

  it('shows spinner for IMPORTING entry instead of progress bar', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('IMPORTING')]);
    render(<DownloadsPage />);
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
  });

  it('does not show cancel button for IMPORTING entry', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('IMPORTING')]);
    render(<DownloadsPage />);
    expect(screen.queryByRole('button', { name: 'cancel' })).not.toBeInTheDocument();
  });

  it('shows queued section for QUEUED entry', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('QUEUED')]);
    const { container } = render(<DownloadsPage />);
    expect(container.querySelector('.dl-section')).toBeInTheDocument();
  });

  it('shows failed section for FAILED entry', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('FAILED', { last_error: 'Network error' })]);
    const { container } = render(<DownloadsPage />);
    expect(container.querySelector('.dl-section-failed')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('shows cancel all button when active + queued entries exist', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('DOWNLOADING'), makeEntry('QUEUED', { identifier: 'q1' })]);
    render(<DownloadsPage />);
    expect(screen.getByText('download.cancelAll')).toBeInTheDocument();
  });

  it('calls downloadManager.pause when pause button clicked', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('DOWNLOADING')]);
    render(<DownloadsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'pause' }));
    expect(downloadManager.pause).toHaveBeenCalledWith('id-DOWNLOADING');
  });

  it('calls downloadManager.resume when resume button clicked', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('PAUSED')]);
    render(<DownloadsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'download.resume' }));
    expect(downloadManager.resume).toHaveBeenCalledWith('id-PAUSED');
  });

  it('calls downloadManager.retryAllFailed when retry all clicked', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('FAILED')]);
    render(<DownloadsPage />);
    fireEvent.click(screen.getByText('download.retryAll'));
    expect(downloadManager.retryAllFailed).toHaveBeenCalled();
  });

  it('shows content name from content_meta JSON', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([
      makeEntry('DOWNLOADING', { content_meta: JSON.stringify({ name: 'My Course' }) }),
    ]);
    render(<DownloadsPage />);
    expect(screen.getByText('My Course')).toBeInTheDocument();
  });

  it('falls back to identifier when content_meta has no name', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([
      makeEntry('DOWNLOADING', { identifier: 'do_1234', content_meta: null }),
    ]);
    render(<DownloadsPage />);
    expect(screen.getByText('do_1234')).toBeInTheDocument();
  });

  it('shows storage footer when downloads exist', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('DOWNLOADING')]);
    const { container } = render(<DownloadsPage />);
    expect(container.querySelector('.dl-storage-footer')).toBeInTheDocument();
  });

  // ── Accessibility Tests ──

  it('empty state has role="status" and aria-live', () => {
    const { container } = render(<DownloadsPage />);
    const emptyDiv = container.querySelector('.dl-empty');
    expect(emptyDiv).toHaveAttribute('role', 'status');
    expect(emptyDiv).toHaveAttribute('aria-live', 'polite');
  });

  it('cancel all button has aria-label', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('DOWNLOADING'), makeEntry('QUEUED', { identifier: 'q1' })]);
    render(<DownloadsPage />);
    const cancelAllBtn = screen.getByText('download.cancelAll');
    expect(cancelAllBtn).toHaveAttribute('aria-label', 'download.cancelAll');
  });

  it('active downloads section has aria-live for progress announcements', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('DOWNLOADING')]);
    const { container } = render(<DownloadsPage />);
    const activeSection = container.querySelector('section.dl-section');
    expect(activeSection).toHaveAttribute('aria-live', 'polite');
  });

  it('storage footer has role="status"', () => {
    vi.mocked(useDownloadQueue).mockReturnValue([makeEntry('DOWNLOADING')]);
    const { container } = render(<DownloadsPage />);
    const footer = container.querySelector('.dl-storage-footer');
    expect(footer).toHaveAttribute('role', 'status');
  });
});
