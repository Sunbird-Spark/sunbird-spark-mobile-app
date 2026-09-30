import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const mockGoBack = vi.fn();
vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children }: any) => <div>{children}</div>,
  IonToolbar: ({ children }: any) => <div>{children}</div>,
  IonContent: ({ children }: any) => <div>{children}</div>,
  IonIcon: ({ icon }: any) => <span data-icon={icon} />,
  IonImg: ({ src, alt }: any) => <img src={src} alt={alt} />,
  IonToast: ({ isOpen, message, color, onDidDismiss }: any) =>
    isOpen ? (
      <div data-testid="ion-toast" data-color={color}>
        {message}
        <button data-testid="toast-dismiss" onClick={onDidDismiss}>dismiss</button>
      </div>
    ) : null,
  IonAlert: ({ isOpen, header, message, buttons, onDidDismiss }: any) =>
    isOpen ? (
      <div data-testid="ion-alert" data-header={header}>
        <span>{message}</span>
        <button data-testid="alert-dismiss" onClick={onDidDismiss}>dismiss</button>
        {buttons?.map((b: any) => (
          <button key={b.text} data-testid={`alert-${b.role}`} onClick={() => b.handler?.()}>{b.text}</button>
        ))}
      </div>
    ) : null,
  useIonRouter: () => ({ push: vi.fn(), goBack: mockGoBack }),
}));

vi.mock('ionicons/icons', () => ({
  cloudOfflineOutline: 'cloud-offline',
  checkmarkCircle: 'checkmark-circle',
  alertCircleOutline: 'alert-circle',
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const routeParams = { contentId: 'do_test_123' as string | undefined };
vi.mock('react-router-dom', () => ({ useParams: () => routeParams }));

vi.mock('@capacitor/screen-orientation', () => ({
  ScreenOrientation: {
    lock: vi.fn().mockResolvedValue(undefined),
    unlock: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../hooks/useContent', () => ({ useContentRead: vi.fn() }));
vi.mock('../hooks/useQumlContent', () => ({ useQumlContent: vi.fn() }));
vi.mock('../hooks/useContentSearch', () => ({ useContentSearch: vi.fn(() => ({ data: null })) }));
vi.mock('../hooks/useDownloadState', () => ({ useDownloadState: vi.fn(() => null) }));
vi.mock('../hooks/useIsContentLocal', () => ({ useIsContentLocal: vi.fn() }));
vi.mock('../providers/NetworkProvider', () => ({ useNetwork: vi.fn(() => ({ isOffline: false })) }));

vi.mock('../components/players/ContentPlayer', () => ({
  ContentPlayer: ({ onPlayerEvent, onTelemetryEvent }: any) => (
    <div data-testid="content-player">
      <button data-testid="player-exit" onClick={() => onPlayerEvent({ data: { edata: { type: 'exit' } } })}>exit</button>
      <button data-testid="player-render" onClick={() => onPlayerEvent({ eid: 'RENDERED' })}>render</button>
      <button data-testid="player-telemetry" onClick={() => onTelemetryEvent({ eid: 'IMPRESSION' })}>tele</button>
    </div>
  ),
}));

vi.mock('../components/common/DownloadProgressBadge', () => ({
  DownloadProgressBadge: ({ onDownload, onRetry, onDelete, onPause, onResume, isLocal }: any) => (
    <div data-testid="download-badge" data-is-local={String(!!isLocal)}>
      <button data-testid="badge-download" onClick={onDownload}>download</button>
      <button data-testid="badge-retry" onClick={onRetry}>retry</button>
      <button data-testid="badge-delete" onClick={onDelete}>delete</button>
      <button data-testid="badge-pause" onClick={onPause}>pause</button>
      <button data-testid="badge-resume" onClick={onResume}>resume</button>
    </div>
  ),
}));

vi.mock('../components/collection/RelatedContent', () => ({
  default: () => <div data-testid="related-content" />,
}));
vi.mock('../services/content/contentDownloadHelper', () => ({ startContentDownload: vi.fn() }));
vi.mock('../services/content/contentDeleteHelper', () => ({ deleteDownloadedContent: vi.fn() }));
vi.mock('../services/content/hierarchyUtils', () => ({ NON_DOWNLOADABLE_MIME_TYPES: ['video/x-youtube'] }));
vi.mock('../services/content/contentPlaybackResolver', () => ({
  resolveContentForPlayer: vi.fn(async (_id, meta) => ({ ...meta, resolved: true })),
}));
vi.mock('../services/db/ContentDbService', () => ({
  contentDbService: { getByIdentifier: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../services/ContentService', () => ({ mergeTranscriptsFromServerData: vi.fn() }));
vi.mock('../services/relatedContentMapper', () => ({
  mapSearchContentToRelatedContentItems: vi.fn(() => []),
}));
vi.mock('../services/download_manager', () => ({
  downloadManager: {
    subscribe: vi.fn(() => vi.fn()),
    getEntry: vi.fn().mockResolvedValue(null),
    retry: vi.fn(), pause: vi.fn(), resume: vi.fn(),
  },
  importService: { downloadTranscripts: vi.fn().mockResolvedValue(undefined) },
  DownloadState: {
    QUEUED: 'QUEUED', DOWNLOADING: 'DOWNLOADING', PAUSED: 'PAUSED', DOWNLOADED: 'DOWNLOADED',
    IMPORTING: 'IMPORTING', COMPLETED: 'COMPLETED', FAILED: 'FAILED',
    CANCELLED: 'CANCELLED', RETRY_WAIT: 'RETRY_WAIT',
  },
}));
vi.mock('../components/icons/CollectionIcons', () => ({ BackIcon: () => <span data-testid="back-icon" /> }));
vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error, onRetry }: any) => (
    <div data-testid="page-loader">
      {message && <span role="status">{message}</span>}
      {error && <span role="alert">{error}</span>}
      {onRetry && <button data-testid="loader-retry" onClick={onRetry}>retry</button>}
    </div>
  ),
}));
vi.mock('../services/TelemetryService', () => ({ telemetryService: { save: vi.fn() } }));
vi.mock('../components/telemetry/TelemetryTracker', () => ({ TelemetryTracker: () => null }));
vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));
vi.mock('./ContentPlayerPage.css', () => ({}));

import ContentPlayerPage from './ContentPlayerPage';
import { useContentRead } from '../hooks/useContent';
import { useQumlContent } from '../hooks/useQumlContent';
import { useDownloadState } from '../hooks/useDownloadState';
import { useIsContentLocal } from '../hooks/useIsContentLocal';
import { useNetwork } from '../providers/NetworkProvider';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { startContentDownload } from '../services/content/contentDownloadHelper';
import { deleteDownloadedContent } from '../services/content/contentDeleteHelper';
import { contentDbService } from '../services/db/ContentDbService';
import { mergeTranscriptsFromServerData } from '../services/ContentService';
import { downloadManager, importService } from '../services/download_manager';
import { telemetryService } from '../services/TelemetryService';

const pdfContent = {
  name: 'Test Content', mimeType: 'application/pdf', identifier: 'do_test_123',
  contentType: 'Resource', pkgVersion: 2, appIcon: 'icon.png',
};

const refetchBase = vi.fn();
const refetchQuml = vi.fn();
const refetchEnriched = vi.fn();

/** Wires the two `useContentRead` calls (base read + enrich=all read). */
const mockReads = (opts: {
  content?: any; base?: Record<string, unknown>; enriched?: Record<string, unknown>;
} = {}) => {
  const content = 'content' in opts ? opts.content : pdfContent;
  (useContentRead as any).mockImplementation((_id: string, o?: any) =>
    (o?.enrichTranscripts
      ? { data: undefined, isLoading: false, isFetching: false, refetch: refetchEnriched, ...opts.enriched }
      : {
        data: content ? { data: { content } } : undefined,
        isLoading: false, error: null, refetch: refetchBase, fetchStatus: 'idle', ...opts.base,
      }),
  );
};

const emit = async (event: any) => {
  const cb = (downloadManager.subscribe as any).mock.calls.at(-1)[0];
  await act(async () => { await cb(event); });
};

describe('ContentPlayerPage — downloads and playback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeParams.contentId = 'do_test_123';
    (useNetwork as any).mockReturnValue({ isOffline: false });
    (useQumlContent as any).mockReturnValue({ data: null, isLoading: false, error: null, refetch: refetchQuml });
    (useDownloadState as any).mockReturnValue(null);
    (useIsContentLocal as any).mockReturnValue({ isLocal: false, isCheckPending: false });
    (contentDbService.getByIdentifier as any).mockResolvedValue(null);
    (downloadManager.subscribe as any).mockReturnValue(vi.fn());
    mockReads();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('navigates back from the detail header', () => {
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByLabelText('back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('hides the download badge for streaming-only content', () => {
    mockReads({ content: { ...pdfContent, mimeType: 'video/x-youtube' } });
    render(<ContentPlayerPage />);
    expect(screen.queryByTestId('download-badge')).not.toBeInTheDocument();
  });

  // ── Download ──

  it.each([
    ['started', 'download.started', undefined],
    ['already_downloaded', 'download.alreadyDownloaded', 'success'],
    ['in_progress', 'download.inProgress', undefined],
    ['not_available', 'download.notAvailable', undefined],
  ])('reports the "%s" download outcome', async (result, message) => {
    (startContentDownload as any).mockResolvedValue(result);
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByTestId('badge-download'));

    await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument());
    expect(startContentDownload).toHaveBeenCalledWith(pdfContent, { priority: 10 });
  });

  it('shows a danger toast when starting the download throws', async () => {
    (startContentDownload as any).mockRejectedValue(new Error('boom'));
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByTestId('badge-download'));

    await waitFor(() => expect(screen.getByText('download.downloadFailed')).toBeInTheDocument());
    expect(screen.getByTestId('ion-toast')).toHaveAttribute('data-color', 'danger');
  });

  it('refuses to download while offline', async () => {
    (useNetwork as any).mockReturnValue({ isOffline: true });
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByTestId('badge-download'));

    await waitFor(() => expect(screen.getByText('download.noInternet')).toBeInTheDocument());
    expect(startContentDownload).not.toHaveBeenCalled();
  });

  it('sends the enriched video metadata to the downloader when available', async () => {
    const video = { ...pdfContent, mimeType: 'video/mp4' };
    const enrichedContent = { ...video, enrichment: { transcriptUrl: 'https://cdn/t.vtt' } };
    mockReads({
      content: video,
      enriched: { data: { data: { content: enrichedContent } } },
    });
    (startContentDownload as any).mockResolvedValue('started');
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByTestId('badge-download'));

    await waitFor(() =>
      expect(startContentDownload).toHaveBeenCalledWith(enrichedContent, { priority: 10 }),
    );
  });

  it('dismisses the toast', async () => {
    (startContentDownload as any).mockResolvedValue('started');
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByTestId('badge-download'));
    await waitFor(() => expect(screen.getByTestId('ion-toast')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('toast-dismiss'));
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
  });

  // ── Delete ──

  it('deletes downloaded content after confirmation and flips the badge to not-local', async () => {
    (useIsContentLocal as any).mockReturnValue({ isLocal: true, isCheckPending: false });
    (deleteDownloadedContent as any).mockResolvedValue({ deleted: true });
    render(<ContentPlayerPage />);
    expect(screen.getByTestId('download-badge')).toHaveAttribute('data-is-local', 'true');

    fireEvent.click(screen.getByTestId('badge-delete'));
    expect(screen.getByTestId('ion-alert')).toHaveAttribute('data-header', 'download.deleteTitle');
    fireEvent.click(screen.getByTestId('alert-destructive'));

    await waitFor(() => expect(screen.getByText('download.deleted')).toBeInTheDocument());
    expect(deleteDownloadedContent).toHaveBeenCalledWith('do_test_123');
    expect(screen.getByTestId('download-badge')).toHaveAttribute('data-is-local', 'false');
  });

  it('stays silent when the delete helper reports nothing was removed', async () => {
    (useIsContentLocal as any).mockReturnValue({ isLocal: true, isCheckPending: false });
    (deleteDownloadedContent as any).mockResolvedValue({ deleted: false });
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByTestId('badge-delete'));
    fireEvent.click(screen.getByTestId('alert-destructive'));

    await waitFor(() => expect(deleteDownloadedContent).toHaveBeenCalled());
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
  });

  it('shows a danger toast when deletion throws', async () => {
    (deleteDownloadedContent as any).mockRejectedValue(new Error('locked'));
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByTestId('badge-delete'));
    fireEvent.click(screen.getByTestId('alert-destructive'));

    await waitFor(() => expect(screen.getByText('download.deleteFailed')).toBeInTheDocument());
  });

  it('closes the delete confirmation without deleting', () => {
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByTestId('badge-delete'));
    fireEvent.click(screen.getByTestId('alert-dismiss'));
    expect(screen.queryByTestId('ion-alert')).not.toBeInTheDocument();
    expect(deleteDownloadedContent).not.toHaveBeenCalled();
  });

  it('forwards retry, pause and resume to the download manager', () => {
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByTestId('badge-retry'));
    fireEvent.click(screen.getByTestId('badge-pause'));
    fireEvent.click(screen.getByTestId('badge-resume'));

    expect(downloadManager.retry).toHaveBeenCalledWith('do_test_123');
    expect(downloadManager.pause).toHaveBeenCalledWith('do_test_123');
    expect(downloadManager.resume).toHaveBeenCalledWith('do_test_123');
  });

  // ── Download manager events ──

  it('confirms a completed download and refetches the content', async () => {
    (downloadManager.getEntry as any).mockResolvedValue({ state: 'COMPLETED' });
    render(<ContentPlayerPage />);
    await emit({ type: 'state_change', identifier: 'do_test_123' });

    expect(screen.getByText('download.downloadSuccess')).toBeInTheDocument();
    expect(refetchBase).toHaveBeenCalled();
  });

  it('also refetches the QuML and enriched reads after a completed download', async () => {
    mockReads({
      content: { ...pdfContent, mimeType: 'video/mp4' },
      enriched: { data: undefined },
    });
    (downloadManager.getEntry as any).mockResolvedValue({ state: 'COMPLETED' });
    render(<ContentPlayerPage />);
    await emit({ type: 'state_change', identifier: 'do_test_123' });

    expect(refetchEnriched).toHaveBeenCalled();
  });

  it('refetches the QuML question set after a completed download', async () => {
    mockReads({ content: { ...pdfContent, mimeType: 'application/vnd.sunbird.questionset' } });
    (useQumlContent as any).mockReturnValue({
      data: { identifier: 'do_test_123', mimeType: 'application/vnd.sunbird.questionset', name: 'Quiz' },
      isLoading: false, error: null, refetch: refetchQuml,
    });
    (downloadManager.getEntry as any).mockResolvedValue({ state: 'COMPLETED' });
    render(<ContentPlayerPage />);
    await emit({ type: 'state_change', identifier: 'do_test_123' });

    expect(refetchQuml).toHaveBeenCalled();
  });

  it('reports a failed download', async () => {
    (downloadManager.getEntry as any).mockResolvedValue({ state: 'FAILED' });
    render(<ContentPlayerPage />);
    await emit({ type: 'state_change', identifier: 'do_test_123' });

    expect(screen.getByText('download.downloadFailed')).toBeInTheDocument();
    expect(refetchBase).not.toHaveBeenCalled();
  });

  it('ignores events for other content and non state_change events', async () => {
    render(<ContentPlayerPage />);
    await emit({ type: 'state_change', identifier: 'other_id' });
    await emit({ type: 'progress', identifier: 'do_test_123' });
    expect(downloadManager.getEntry).not.toHaveBeenCalled();
  });

  it('does not subscribe without a content id', () => {
    routeParams.contentId = undefined;
    mockReads({ content: undefined });
    render(<ContentPlayerPage />);
    expect(downloadManager.subscribe).not.toHaveBeenCalled();
  });

  it('retries every read from the error state', async () => {
    mockReads({ content: undefined, base: { error: { message: 'Network error' } } });
    (contentDbService.getByIdentifier as any).mockResolvedValue({
      identifier: 'do_test_123', mime_type: 'video/mp4', local_data: null,
    });
    render(<ContentPlayerPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('loader-retry'));

    expect(refetchBase).toHaveBeenCalled();
    expect(refetchEnriched).toHaveBeenCalled();
  });

  // ── Offline fallback + transcripts ──

  it('falls back to locally cached metadata when the API is unavailable', async () => {
    mockReads({ content: undefined, base: { fetchStatus: 'paused' } });
    (useIsContentLocal as any).mockReturnValue({ isLocal: true, isCheckPending: false });
    (contentDbService.getByIdentifier as any).mockResolvedValue({
      identifier: 'do_test_123',
      mime_type: 'application/pdf',
      local_data: JSON.stringify({ name: 'Cached Content' }),
      server_data: '{}',
    });

    render(<ContentPlayerPage />);
    await waitFor(() => expect(screen.getByText('Cached Content')).toBeInTheDocument());
    expect(mergeTranscriptsFromServerData).toHaveBeenCalled();
  });

  it('ignores unparseable local metadata', async () => {
    mockReads({ content: undefined, base: { fetchStatus: 'paused' } });
    (useIsContentLocal as any).mockReturnValue({ isLocal: true, isCheckPending: false });
    (contentDbService.getByIdentifier as any).mockResolvedValue({
      identifier: 'do_test_123', mime_type: 'application/pdf', local_data: '{oops',
    });

    render(<ContentPlayerPage />);
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(mergeTranscriptsFromServerData).not.toHaveBeenCalled();
  });

  it('does not start a download when there is no server content to download', async () => {
    mockReads({ content: undefined, base: { fetchStatus: 'paused' } });
    (useIsContentLocal as any).mockReturnValue({ isLocal: true, isCheckPending: false });
    (contentDbService.getByIdentifier as any).mockResolvedValue({
      identifier: 'do_test_123',
      mime_type: 'application/pdf',
      local_data: JSON.stringify({ name: 'Cached Content' }),
    });

    render(<ContentPlayerPage />);
    await waitFor(() => expect(screen.getByText('Cached Content')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('badge-download'));

    await waitFor(() => expect(startContentDownload).not.toHaveBeenCalled());
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
  });

  it('backfills transcripts for downloaded video that has none cached', async () => {
    const video = { ...pdfContent, mimeType: 'video/mp4' };
    mockReads({
      content: video,
      enriched: {
        data: { data: { content: { ...video, enrichment: { transcriptUrl: 'https://cdn/t.vtt' }, transcripts: [{ language: 'en' }] } } },
      },
    });
    (useIsContentLocal as any).mockReturnValue({ isLocal: true, isCheckPending: false });
    (contentDbService.getByIdentifier as any).mockResolvedValue({
      identifier: 'do_test_123', mime_type: 'video/mp4',
      local_data: JSON.stringify({ name: 'Video', transcripts: [] }),
    });

    render(<ContentPlayerPage />);
    await waitFor(() =>
      expect(importService.downloadTranscripts).toHaveBeenCalledWith(
        'do_test_123', 'https://cdn/t.vtt', [{ language: 'en' }],
      ),
    );
  });

  it('skips the transcript backfill when transcripts are already cached', async () => {
    const video = { ...pdfContent, mimeType: 'video/mp4' };
    mockReads({
      content: video,
      enriched: { data: { data: { content: { ...video, enrichment: { transcriptUrl: 'https://cdn/t.vtt' } } } } },
    });
    (useIsContentLocal as any).mockReturnValue({ isLocal: true, isCheckPending: false });
    (contentDbService.getByIdentifier as any).mockResolvedValue({
      identifier: 'do_test_123', mime_type: 'video/mp4',
      local_data: JSON.stringify({ name: 'Video', transcripts: [{ language: 'en' }] }),
    });

    render(<ContentPlayerPage />);
    await waitFor(() => expect(screen.getByText('Test Content')).toBeInTheDocument());
    expect(importService.downloadTranscripts).not.toHaveBeenCalled();
  });

  // ── Playback ──

  it('locks to landscape, hides the boot overlay on the first event and exits on EXIT', async () => {
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByLabelText('playItem'));

    expect(ScreenOrientation.lock).toHaveBeenCalledWith({ orientation: 'landscape' });
    expect(screen.getByTestId('content-player')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('loading');

    fireEvent.click(screen.getByTestId('player-render'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('player-exit'));
    expect(screen.queryByTestId('content-player')).not.toBeInTheDocument();
    expect(ScreenOrientation.unlock).toHaveBeenCalled();
  });

  it('drops the boot overlay after the safety timeout', async () => {
    vi.useFakeTimers();
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByLabelText('playItem'));
    expect(screen.getByRole('status')).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('saves player telemetry events', () => {
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByLabelText('playItem'));
    fireEvent.click(screen.getByTestId('player-telemetry'));
    expect(telemetryService.save).toHaveBeenCalledWith({ eid: 'IMPRESSION' });
  });

  it('guards playback of undownloaded content while offline', () => {
    (useNetwork as any).mockReturnValue({ isOffline: false });
    const { rerender } = render(<ContentPlayerPage />);
    fireEvent.click(screen.getByLabelText('playItem'));

    (useNetwork as any).mockReturnValue({ isOffline: true });
    rerender(<ContentPlayerPage />);

    expect(screen.getByText('download.youreOffline')).toBeInTheDocument();
    expect(screen.getByTestId('download-badge')).toBeInTheDocument();

    fireEvent.click(screen.getByText('back'));
    expect(screen.queryByText('download.youreOffline')).not.toBeInTheDocument();
  });

  it('shows download progress instead of a blank player while the ecar is still arriving', () => {
    (useDownloadState as any).mockReturnValue({ state: 'DOWNLOADING', progress: 42 });
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByLabelText('playItem'));

    expect(screen.getByRole('status')).toHaveTextContent('download.downloading');
    expect(screen.queryByTestId('content-player')).not.toBeInTheDocument();
  });

  it('labels a queued download while waiting to play', () => {
    (useDownloadState as any).mockReturnValue({ state: 'QUEUED', progress: 0 });
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByLabelText('playItem'));
    expect(screen.getByRole('status')).toHaveTextContent('download.queued');
  });

  it('labels the import phase while waiting to play', () => {
    (useDownloadState as any).mockReturnValue({ state: 'IMPORTING', progress: 100 });
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByLabelText('playItem'));
    expect(screen.getByRole('status')).toHaveTextContent('download.processing');
  });

  it('waits for the captions fetch before mounting the video player', () => {
    const video = { ...pdfContent, mimeType: 'video/mp4' };
    mockReads({ content: video, enriched: { isFetching: true, data: { data: { content: video } } } });
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByLabelText('playItem'));

    expect(screen.queryByTestId('content-player')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('loading');
  });

  it('waits for the local-availability check before mounting the player', () => {
    (useIsContentLocal as any).mockReturnValue({ isLocal: false, isCheckPending: true });
    render(<ContentPlayerPage />);
    fireEvent.click(screen.getByLabelText('playItem'));
    expect(screen.queryByTestId('content-player')).not.toBeInTheDocument();
  });
});
