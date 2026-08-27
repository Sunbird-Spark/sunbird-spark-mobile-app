import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRouterPush = vi.fn();
const mockRouterGoBack = vi.fn();
vi.mock('@ionic/react', async () => {
  const React = await import('react');
  return {
    IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
    IonHeader: ({ children }: any) => <div>{children}</div>,
    IonToolbar: ({ children }: any) => <div>{children}</div>,
    IonContent: ({ children }: any) => <div>{children}</div>,
    IonModal: ({ isOpen, children }: any) => (isOpen ? <div data-testid="ion-modal">{children}</div> : null),
    IonSpinner: () => <div data-testid="ion-spinner" />,
    IonIcon: ({ icon }: any) => <span data-testid="ion-icon" data-icon={icon} />,
    IonToggle: ({ checked, onIonChange }: any) => (
      <input
        data-testid="ion-toggle"
        type="checkbox"
        checked={checked}
        onChange={(e) => onIonChange({ detail: { checked: e.target.checked } })}
      />
    ),
    IonToast: ({ isOpen, message, color }: any) =>
      isOpen ? <div data-testid="ion-toast" data-color={color}>{message}</div> : null,
    IonAlert: ({ isOpen }: any) => (isOpen ? <div data-testid="ion-alert" /> : null),
    useIonRouter: () => ({ push: mockRouterPush, goBack: mockRouterGoBack }),
    useIonViewDidEnter: (cb: () => void) => {
      React.useEffect(() => { cb(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    },
    useIonViewWillLeave: (cb: () => void) => {
      React.useEffect(() => () => cb(), []); // eslint-disable-line react-hooks/exhaustive-deps
    },
  };
});

vi.mock('./CollectionPage.css', () => ({}));
vi.mock('../components/icons/CollectionIcons', () => ({
  BackIcon: () => <span data-testid="back-icon" />,
  SearchIcon: () => <span data-testid="search-icon" />,
  RightArrowIcon: () => <span data-testid="right-arrow-icon" />,
}));
vi.mock('../components/collection/CollectionOverview', () => ({
  default: ({ collectionData, children }: any) => (
    <div data-testid="collection-overview">{collectionData.title}{children}</div>
  ),
}));
vi.mock('../components/collection/CollectionAccordion', () => ({
  default: (props: any) => <div data-testid="collection-accordion" data-view-state={props.viewState} />,
}));
vi.mock('../components/collection/CollectionContentPlayer', () => ({
  default: () => <div data-testid="collection-content-player" />,
}));
vi.mock('../components/collection/CourseCompletionDialog', () => ({
  default: () => <div data-testid="course-completion-dialog" />,
}));
vi.mock('../components/collection/RelatedContent', () => ({
  default: () => <div data-testid="related-content" />,
}));
vi.mock('../components/home/FAQSection', () => ({ default: () => <div data-testid="faq-section" /> }));
vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error }: any) => <div data-testid="page-loader">{message}{error}</div>,
}));
vi.mock('../components/telemetry/TelemetryTracker', () => ({ TelemetryTracker: () => null }));
vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ collectionId: 'do_coll_1' }),
  useLocation: () => ({ pathname: '/collection/do_coll_1', search: '', state: undefined }),
}));

vi.mock('../hooks/useCollection', () => ({ useCollection: vi.fn() }));
vi.mock('../hooks/useContentSearch', () => ({ useContentSearch: vi.fn(() => ({ data: undefined })) }));
vi.mock('../services/relatedContentMapper', () => ({
  mapSearchContentToRelatedContentItems: vi.fn(() => []),
}));
vi.mock('../hooks/useCollectionEnrollment', () => ({
  useCollectionEnrollment: vi.fn(() => ({
    isLoading: false, isEnrolled: false, enrolledBatchId: null, enrollableBatches: [],
    isBatchEnded: false, isBatchUpcoming: false, batchStartDate: undefined,
    contentStatusMap: {}, contentAttemptInfoMap: {},
    progressProps: { total: 0, completed: 0, percentage: 0 },
    hasCertificate: false, certPreviewUrl: undefined,
    batchListLoading: false, batchListError: undefined, joinLoading: false, joinError: '',
    enrol: { mutateAsync: vi.fn() }, unenrol: { mutateAsync: vi.fn() },
  })),
}));
vi.mock('../hooks/useConsent', () => ({
  useConsent: vi.fn(() => ({
    status: null, lastUpdatedOn: undefined, refetch: vi.fn(),
    updateConsent: vi.fn(), isUpdating: false,
  })),
}));
vi.mock('../hooks/useUser', () => ({ useUser: vi.fn(() => ({ data: undefined })) }));
vi.mock('../hooks/useForceSync', () => ({
  useForceSync: vi.fn(() => ({
    showForceSyncButton: false, handleForceSync: vi.fn(), isForceSyncing: false, forceSyncError: null,
  })),
}));
vi.mock('../hooks/useLocalContentSet', () => ({ useLocalContentSet: vi.fn(() => new Set()) }));
vi.mock('../hooks/useIsContentLocal', () => ({
  useIsContentLocal: vi.fn(() => ({ isLocal: false, isCheckPending: false })),
}));
vi.mock('../hooks/useCourseDownloadProgress', () => ({
  useCourseDownloadProgress: vi.fn(() => ({
    total: 2, completed: 0, overallPercent: 0, isDownloading: false,
    isPaused: false, allDownloaded: false, isFullyLocal: false, failedCount: 0,
  })),
}));
vi.mock('../hooks/useBatchDownloadStates', () => ({ useBatchDownloadStates: vi.fn(() => new Map()) }));
vi.mock('../providers/NetworkProvider', () => ({ useNetwork: vi.fn(() => ({ isOffline: false })) }));
vi.mock('../contexts/LanguageContext', () => {
  const value = { t: (k: string, p?: any) => (p ? `${k}|${Object.values(p).join(',')}` : k) };
  return { useLanguage: () => value };
});
vi.mock('../services/UserService', () => ({
  userService: { getUserId: vi.fn(() => 'user-1'), isLoggedIn: vi.fn(() => true) },
}));
vi.mock('../services/TelemetryService', () => ({ telemetryService: { audit: vi.fn() } }));
vi.mock('../services/content/courseDownloadHelper', () => ({ startBulkDownload: vi.fn() }));
vi.mock('../services/content/contentDeleteHelper', () => ({ deleteDownloadedContent: vi.fn() }));
vi.mock('../services/download_manager', () => ({
  downloadManager: {
    subscribe: vi.fn(() => vi.fn()),
    getEntry: vi.fn(async () => null),
    pause: vi.fn(async () => undefined),
    resume: vi.fn(async () => undefined),
    notifyContentDeleted: vi.fn(),
  },
}));
vi.mock('../services/db/ContentDbService', () => ({
  contentDbService: {
    getByIdentifiers: vi.fn(async () => []),
    getByIdentifier: vi.fn(async () => null),
    delete: vi.fn(async () => undefined),
  },
}));

import CollectionPage from './CollectionPage';
import { useCollection } from '../hooks/useCollection';
import { useNetwork } from '../providers/NetworkProvider';
import { startBulkDownload } from '../services/content/courseDownloadHelper';
import { downloadManager } from '../services/download_manager';
import { contentDbService } from '../services/db/ContentDbService';

type DlEvent = { type: string; identifier?: string };

const children = [
  {
    identifier: 'unit_1',
    name: 'Unit 1',
    mimeType: 'application/vnd.ekstep.content-collection',
    children: [
      { identifier: 'leaf_1', name: 'Leaf One', mimeType: 'application/pdf', downloadUrl: 'u1', size: 1024 },
      { identifier: 'leaf_2', name: 'Leaf Two', mimeType: 'video/mp4', downloadUrl: 'u2', size: 2048 },
    ],
  },
  { identifier: 'leaf_3', name: 'Youtube clip', mimeType: 'video/x-youtube' },
];

const collectionData = {
  id: 'do_coll_1',
  title: 'Test Collection',
  primaryCategory: 'Digital Textbook',
  trackable: { enabled: 'No' },
  children,
  hierarchyRoot: { downloadUrl: 'https://cdn/spine.ecar', pkgVersion: 7 },
};

const mockCollection = (over: Record<string, unknown> = {}) =>
  (useCollection as any).mockReturnValue({
    data: collectionData, isLoading: false, isError: false,
    fetchStatus: 'success', status: 'success', refetch: vi.fn(), ...over,
  });

const emit = async (event: DlEvent) => {
  const cb = (downloadManager.subscribe as any).mock.calls.at(-1)[0];
  await act(async () => { await cb(event); });
};

const startDownload = () => {
  fireEvent.click(screen.getByLabelText('download.download'));
  fireEvent.click(screen.getByRole('button', { name: /download\.download \(3 KB\)/ }));
};

describe('CollectionPage — download manager events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (useNetwork as any).mockReturnValue({ isOffline: false });
    (contentDbService.getByIdentifiers as any).mockResolvedValue([]);
    (contentDbService.getByIdentifier as any).mockResolvedValue(null);
    (downloadManager.getEntry as any).mockResolvedValue(null);
    (downloadManager.subscribe as any).mockReturnValue(vi.fn());
    mockCollection();
  });

  it('subscribes to the download manager and unsubscribes on unmount', () => {
    const unsub = vi.fn();
    (downloadManager.subscribe as any).mockReturnValue(unsub);
    const { unmount } = render(<CollectionPage />);
    expect(downloadManager.subscribe).toHaveBeenCalled();
    unmount();
    expect(unsub).toHaveBeenCalled();
  });

  it('shows an aggregate success toast when the queue drains with local items', async () => {
    (contentDbService.getByIdentifiers as any).mockResolvedValue([
      { identifier: 'leaf_1', content_state: 2 },
      { identifier: 'leaf_2', content_state: 1 },
    ]);
    render(<CollectionPage />);
    await emit({ type: 'all_done' });

    expect(contentDbService.getByIdentifiers).toHaveBeenCalledWith(['leaf_1', 'leaf_2']);
    expect(screen.getByText('download.downloadedSuccessfully|1,2')).toBeInTheDocument();
    expect(localStorage.getItem('dl_toast_shown_do_coll_1')).toBe('1');
  });

  it('shows the aggregate success toast only once per download session', async () => {
    (contentDbService.getByIdentifiers as any).mockResolvedValue([
      { identifier: 'leaf_1', content_state: 2 },
    ]);
    localStorage.setItem('dl_toast_shown_do_coll_1', '1');
    render(<CollectionPage />);
    await emit({ type: 'all_done' });
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
  });

  it('does not toast when the queue drains with nothing local', async () => {
    (contentDbService.getByIdentifiers as any).mockResolvedValue([
      { identifier: 'leaf_1', content_state: 1 },
    ]);
    render(<CollectionPage />);
    await emit({ type: 'all_done' });
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
    expect(localStorage.getItem('dl_toast_shown_do_coll_1')).toBeNull();
  });

  it('names the failed content in the failure toast', async () => {
    (downloadManager.getEntry as any).mockResolvedValue({ state: 'FAILED' });
    (contentDbService.getByIdentifier as any).mockResolvedValue({
      server_data: JSON.stringify({ name: 'Leaf One' }),
    });
    render(<CollectionPage />);
    await emit({ type: 'state_change', identifier: 'leaf_1' });

    const toast = screen.getByText('Failed to download "Leaf One"');
    expect(toast.closest('[data-testid="ion-toast"]')).toHaveAttribute('data-color', 'danger');
    expect(localStorage.getItem('dl_fail_shown_leaf_1')).toBe('1');
  });

  it('falls back to the generic failure message when the db has no entry', async () => {
    (downloadManager.getEntry as any).mockResolvedValue({ state: 'FAILED' });
    render(<CollectionPage />);
    await emit({ type: 'state_change', identifier: 'leaf_1' });
    expect(screen.getByText('download.downloadFailed')).toBeInTheDocument();
  });

  it('falls back to the generic failure message when server_data is malformed', async () => {
    (downloadManager.getEntry as any).mockResolvedValue({ state: 'FAILED' });
    (contentDbService.getByIdentifier as any).mockResolvedValue({ server_data: '{not-json' });
    render(<CollectionPage />);
    await emit({ type: 'state_change', identifier: 'leaf_1' });
    expect(screen.getByText('download.downloadFailed')).toBeInTheDocument();
  });

  it('uses the title when server_data has no name', async () => {
    (downloadManager.getEntry as any).mockResolvedValue({ state: 'FAILED' });
    (contentDbService.getByIdentifier as any).mockResolvedValue({
      server_data: JSON.stringify({ title: 'Titled Leaf' }),
    });
    render(<CollectionPage />);
    await emit({ type: 'state_change', identifier: 'leaf_1' });
    expect(screen.getByText('Failed to download "Titled Leaf"')).toBeInTheDocument();
  });

  it('suppresses a repeat failure toast for the same item', async () => {
    (downloadManager.getEntry as any).mockResolvedValue({ state: 'FAILED' });
    localStorage.setItem('dl_fail_shown_leaf_1', '1');
    render(<CollectionPage />);
    await emit({ type: 'state_change', identifier: 'leaf_1' });
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
    expect(contentDbService.getByIdentifier).not.toHaveBeenCalled();
  });

  it('clears the failure flag when the item is retried', async () => {
    (downloadManager.getEntry as any).mockResolvedValue({ state: 'DOWNLOADING' });
    localStorage.setItem('dl_fail_shown_leaf_1', '1');
    render(<CollectionPage />);
    await emit({ type: 'state_change', identifier: 'leaf_1' });
    expect(localStorage.getItem('dl_fail_shown_leaf_1')).toBeNull();
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
  });

  it('clears the failure flag when the item is re-queued', async () => {
    (downloadManager.getEntry as any).mockResolvedValue({ state: 'QUEUED' });
    localStorage.setItem('dl_fail_shown_leaf_1', '1');
    render(<CollectionPage />);
    await emit({ type: 'state_change', identifier: 'leaf_1' });
    expect(localStorage.getItem('dl_fail_shown_leaf_1')).toBeNull();
  });

  it('ignores state_change events that carry no identifier', async () => {
    render(<CollectionPage />);
    await emit({ type: 'state_change' });
    expect(downloadManager.getEntry).not.toHaveBeenCalled();
  });

  it('ignores unrelated event types', async () => {
    render(<CollectionPage />);
    await emit({ type: 'progress', identifier: 'leaf_1' });
    expect(downloadManager.getEntry).not.toHaveBeenCalled();
    expect(contentDbService.getByIdentifiers).not.toHaveBeenCalled();
  });

  // ── Bulk download outcomes ──

  it('reports that everything was already downloaded', async () => {
    (startBulkDownload as any).mockResolvedValue({ enqueued: 0, skippedLocal: 2 });
    render(<CollectionPage />);
    startDownload();
    await waitFor(() => expect(screen.getByText('download.allDownloaded')).toBeInTheDocument());
  });

  it('shows a danger toast when the bulk download cannot start', async () => {
    (startBulkDownload as any).mockRejectedValue(new Error('network down'));
    render(<CollectionPage />);
    startDownload();
    await waitFor(() => expect(screen.getByText('download.failedToStart')).toBeInTheDocument());
    expect(screen.getByText('download.failedToStart').closest('[data-testid="ion-toast"]'))
      .toHaveAttribute('data-color', 'danger');
  });

  it('stays silent when nothing was enqueued and nothing was skipped', async () => {
    (startBulkDownload as any).mockResolvedValue({ enqueued: 0, skippedLocal: 0 });
    render(<CollectionPage />);
    startDownload();
    await waitFor(() => expect(startBulkDownload).toHaveBeenCalled());
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
  });

  // ── Query lifecycle ──

  it('refetches the hierarchy when the view enters with an idle query', () => {
    const refetch = vi.fn();
    mockCollection({ data: undefined, fetchStatus: 'idle', status: 'pending', refetch });
    render(<CollectionPage />);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('refetches the hierarchy when the view enters after an error', () => {
    const refetch = vi.fn();
    mockCollection({ data: undefined, isError: true, fetchStatus: 'idle', refetch });
    render(<CollectionPage />);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('does not refetch on view enter when the query already succeeded', () => {
    const refetch = vi.fn();
    mockCollection({ refetch });
    render(<CollectionPage />);
    expect(refetch).not.toHaveBeenCalled();
  });

  it('refetches the hierarchy when the device comes back online', () => {
    const refetch = vi.fn();
    mockCollection({ refetch });
    (useNetwork as any).mockReturnValue({ isOffline: true });
    const { rerender } = render(<CollectionPage />);
    expect(refetch).not.toHaveBeenCalled();

    (useNetwork as any).mockReturnValue({ isOffline: false });
    rerender(<CollectionPage />);
    expect(refetch).toHaveBeenCalledTimes(1);

    rerender(<CollectionPage />);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the offline placeholder when there is no cached hierarchy', () => {
    mockCollection({ data: undefined });
    (useNetwork as any).mockReturnValue({ isOffline: true });
    render(<CollectionPage />);
    expect(screen.getByText('collection.offlineNotAvailable')).toBeInTheDocument();
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
  });
});
