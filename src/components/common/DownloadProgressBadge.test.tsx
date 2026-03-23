import { render, screen, fireEvent } from '@testing-library/react';
import { DownloadProgressBadge } from './DownloadProgressBadge';
import type { DownloadProgress } from '../../services/download_manager/types';

describe('DownloadProgressBadge', () => {
  const defaultProps = {
    downloadState: null as DownloadProgress | null,
    isLocal: false,
    onDownload: vi.fn(),
    onRetry: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders download icon when not local and no download state', () => {
    render(<DownloadProgressBadge {...defaultProps} />);
    const btn = screen.getByLabelText('Download');
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(defaultProps.onDownload).toHaveBeenCalled();
  });

  it('renders trash icon when isLocal is true', () => {
    render(<DownloadProgressBadge {...defaultProps} isLocal={true} />);
    const btn = screen.getByLabelText('Delete');
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(defaultProps.onDelete).toHaveBeenCalled();
  });

  it('renders progress ring when downloading', () => {
    const downloadState: DownloadProgress = {
      identifier: 'do_1',
      state: 'DOWNLOADING' as any,
      progress: 45,
      bytesDownloaded: 450,
      totalBytes: 1000,
    };
    render(<DownloadProgressBadge {...defaultProps} downloadState={downloadState} />);
    expect(screen.getByLabelText('Downloading 45%')).toBeDefined();
    expect(screen.getByText('45')).toBeDefined();
  });

  it('renders retry button when failed', () => {
    const downloadState: DownloadProgress = {
      identifier: 'do_1',
      state: 'FAILED' as any,
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
    };
    render(<DownloadProgressBadge {...defaultProps} downloadState={downloadState} />);
    const btn = screen.getByLabelText('Retry download');
    fireEvent.click(btn);
    expect(defaultProps.onRetry).toHaveBeenCalled();
  });

  it('renders queued state', () => {
    const downloadState: DownloadProgress = {
      identifier: 'do_1',
      state: 'QUEUED' as any,
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
    };
    render(<DownloadProgressBadge {...defaultProps} downloadState={downloadState} />);
    expect(screen.getByLabelText('Queued')).toBeDefined();
  });

  it('renders download icon for cancelled state', () => {
    const downloadState: DownloadProgress = {
      identifier: 'do_1',
      state: 'CANCELLED' as any,
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
    };
    render(<DownloadProgressBadge {...defaultProps} downloadState={downloadState} />);
    const btn = screen.getByLabelText('Download');
    fireEvent.click(btn);
    expect(defaultProps.onDownload).toHaveBeenCalled();
  });

  it('prioritizes isLocal over downloadState', () => {
    const downloadState: DownloadProgress = {
      identifier: 'do_1',
      state: 'DOWNLOADING' as any,
      progress: 50,
      bytesDownloaded: 500,
      totalBytes: 1000,
    };
    render(<DownloadProgressBadge {...defaultProps} isLocal={true} downloadState={downloadState} />);
    expect(screen.getByLabelText('Delete')).toBeDefined();
  });
});
