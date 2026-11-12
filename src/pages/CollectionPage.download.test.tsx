import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRouterPush = vi.fn();
const mockRouterGoBack = vi.fn();
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonHeader: ({ children }: any) => <div>{children}</div>,
  IonToolbar: ({ children }: any) => <div>{children}</div>,
  IonContent: ({ children }: any) => <div>{children}</div>,
  IonModal: ({ isOpen, children, className, onDidDismiss }: any) =>
    isOpen ? (
      <div data-testid="ion-modal" data-class={className}>
        {children}
        <button data-testid="modal-dismiss" onClick={onDidDismiss}>dismiss</button>
      </div>
    ) : null,
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
          <button key={b.text} data-testid={`alert-btn-${b.role}`} onClick={() => b.handler?.()}>
            {b.text}
          </button>
        ))}
      </div>
    ) : null,
  useIonRouter: () => ({ push: mockRouterPush, goBack: mockRouterGoBack }),
  useIonViewDidEnter: vi.fn(),
  useIonViewWillLeave: vi.fn(),
}));

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

let accordionProps: any = null;
vi.mock('../components/collection/CollectionAccordion', () => ({
  default: (props: any) => {
    accordionProps = props;
    return <div data-testid="collection-accordion" data-view-state={props.viewState} />;
  },
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
  useIsContentLocal: vi.fn(() => ({ isLocal: true, isCheckPending: false })),
}));
vi.mock('../hooks/useCourseDownloadProgress', () => ({ useCourseDownloadProgress: vi.fn() }));
vi.mock('../hooks/useBatchDownloadStates', () => ({ useBatchDownloadStates: vi.fn(() => new Map()) }));
vi.mock('../providers/NetworkProvider', () => ({ useNetwork: vi.fn(() => ({ isOffline: false })) }));
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (k: string, p?: any) => (p ? `${k}|${Object.values(p).join(',')}` : k),
  })),
}));
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
import { useLocalContentSet } from '../hooks/useLocalContentSet';
import { useCourseDownloadProgress } from '../hooks/useCourseDownloadProgress';
import { useBatchDownloadStates } from '../hooks/useBatchDownloadStates';
import { useNetwork } from '../providers/NetworkProvider';
import { startBulkDownload } from '../services/content/courseDownloadHelper';
import { deleteDownloadedContent } from '../services/content/contentDeleteHelper';
import { downloadManager } from '../services/download_manager';
import { contentDbService } from '../services/db/ContentDbService';

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

const baseProgress = {
  total: 3, completed: 0, overallPercent: 0, isDownloading: false,
  isPaused: false, allDownloaded: false, isFullyLocal: false, failedCount: 0,
};

const st = (state: string) => ({ state, progress: 0 });

const setProgress = (over: Partial<typeof baseProgress> = {}) =>
  (useCourseDownloadProgress as any).mockReturnValue({ ...baseProgress, ...over });

describe('CollectionPage — download controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    accordionProps = null;
    (useCollection as any).mockReturnValue({
      data: collectionData, isLoading: false, isError: false,
      fetchStatus: 'success', status: 'success', refetch: vi.fn(),
    });
    (useLocalContentSet as any).mockReturnValue(new Set());
    (useBatchDownloadStates as any).mockReturnValue(new Map());
    (useNetwork as any).mockReturnValue({ isOffline: false });
    setProgress();
  });

  // ── Header icon states ──

  it('shows the plain download button when nothing is downloaded yet', () => {
    render(<CollectionPage />);
    expect(screen.getByLabelText('download.download')).toBeInTheDocument();
    expect(screen.queryByLabelText('download.deleteDownloadedContent')).not.toBeInTheDocument();
  });

  it('shows the delete (trash) button once every item is local', () => {
    setProgress({ isFullyLocal: true, allDownloaded: true });
    (useLocalContentSet as any).mockReturnValue(new Set(['leaf_1', 'leaf_2']));
    render(<CollectionPage />);
    expect(screen.getByLabelText('download.deleteDownloadedContent')).toBeInTheDocument();
    expect(screen.queryByLabelText('download.download')).not.toBeInTheDocument();
  });

  it('shows a pause control with the progress ring while downloading', () => {
    setProgress({ isDownloading: true, overallPercent: 40 });
    (useBatchDownloadStates as any).mockReturnValue(new Map([['leaf_1', st('DOWNLOADING')]]));
    render(<CollectionPage />);
    expect(screen.getByLabelText('download.pauseAll')).toBeInTheDocument();
  });

  it('pauses every active item when the pause control is used', async () => {
    setProgress({ isDownloading: true });
    (useBatchDownloadStates as any).mockReturnValue(
      new Map([
        ['leaf_1', st('DOWNLOADING')],
        ['leaf_2', st('QUEUED')],
        ['leaf_3', st('COMPLETED')],
      ]),
    );
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.pauseAll'));
    await waitFor(() => expect(downloadManager.pause).toHaveBeenCalledTimes(2));
    expect(downloadManager.pause).toHaveBeenCalledWith('leaf_1');
    expect(downloadManager.pause).toHaveBeenCalledWith('leaf_2');
    expect(downloadManager.pause).not.toHaveBeenCalledWith('leaf_3');
  });

  it('shows a resume control when the queue is paused and resumes only paused items', async () => {
    setProgress({ isDownloading: true, isPaused: true });
    (useBatchDownloadStates as any).mockReturnValue(
      new Map([['leaf_1', st('PAUSED')], ['leaf_2', st('COMPLETED')]]),
    );
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.resumeAll'));
    await waitFor(() => expect(downloadManager.resume).toHaveBeenCalledWith('leaf_1'));
    expect(downloadManager.resume).toHaveBeenCalledTimes(1);
  });

  it('shows only a spinner (no pause/resume) during the importing phase', () => {
    setProgress({ isDownloading: true });
    (useBatchDownloadStates as any).mockReturnValue(new Map([['leaf_1', st('IMPORTING')]]));
    render(<CollectionPage />);
    expect(screen.queryByLabelText('download.pauseAll')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('download.resumeAll')).not.toBeInTheDocument();
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
  });

  it('still offers pause when an item is downloading alongside importing items', () => {
    setProgress({ isDownloading: true });
    (useBatchDownloadStates as any).mockReturnValue(
      new Map([['leaf_1', st('IMPORTING')], ['leaf_2', st('DOWNLOADING')]]),
    );
    render(<CollectionPage />);
    expect(screen.getByLabelText('download.pauseAll')).toBeInTheDocument();
  });

  it('shows the all-failed retry icon when every item failed and nothing is local', () => {
    (useBatchDownloadStates as any).mockReturnValue(
      new Map([['leaf_1', st('FAILED')], ['leaf_2', st('FAILED')]]),
    );
    render(<CollectionPage />);
    expect(screen.getByLabelText('download.downloadFailedRetry')).toBeInTheDocument();
  });

  it('shows the partial-error icon when some items failed but others are local', () => {
    (useLocalContentSet as any).mockReturnValue(new Set(['leaf_1']));
    (useBatchDownloadStates as any).mockReturnValue(new Map([['leaf_2', st('FAILED')]]));
    render(<CollectionPage />);
    expect(screen.getByLabelText('download.partialDownloadRetry')).toBeInTheDocument();
  });

  it('shows the partial-remaining icon when some items are local and none failed', () => {
    (useLocalContentSet as any).mockReturnValue(new Set(['leaf_1']));
    render(<CollectionPage />);
    expect(screen.getByLabelText('download.partialDownloadRemaining')).toBeInTheDocument();
  });

  it('opens the download sheet from the failed-state icon', () => {
    (useBatchDownloadStates as any).mockReturnValue(new Map([['leaf_1', st('FAILED')]]));
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.downloadFailedRetry'));
    expect(screen.getByRole('button', { name: /download\.download \(3 KB\)/ })).toBeInTheDocument();
  });

  it('opens the download sheet from the partial-state icon', () => {
    (useLocalContentSet as any).mockReturnValue(new Set(['leaf_1']));
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.partialDownloadRemaining'));
    expect(screen.getByText(/Download \(1 items\)/)).toBeInTheDocument();
  });

  // ── Download sheet ──

  it('lists the downloadable count and total size in the sheet', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.download'));
    expect(screen.getByText(/Download \(2 items\) for Collection/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download\.download \(3 KB\)/ })).toBeInTheDocument();
  });

  it('labels the sheet for a course rather than a collection', () => {
    (useCollection as any).mockReturnValue({
      data: { ...collectionData, primaryCategory: 'Course' },
      isLoading: false, isError: false, fetchStatus: 'success', status: 'success', refetch: vi.fn(),
    });
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.download'));
    expect(screen.getByText(/Download \(2 items\) for Course/)).toBeInTheDocument();
  });

  it('shows the empty message when nothing in the hierarchy is downloadable', () => {
    (useCollection as any).mockReturnValue({
      data: { ...collectionData, children: [{ identifier: 'leaf_3', mimeType: 'video/x-youtube' }] },
      isLoading: false, isError: false, fetchStatus: 'success', status: 'success', refetch: vi.fn(),
    });
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.download'));
    expect(screen.getByText('download.noDownloadableItems')).toBeInTheDocument();
  });

  it('warns about the missing connection inside the sheet when offline', () => {
    (useNetwork as any).mockReturnValue({ isOffline: true });
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.download'));
    expect(screen.getByText('download.noInternet')).toBeInTheDocument();
  });

  it('offers deletion from the sheet when everything is already downloaded', () => {
    setProgress({ allDownloaded: true, isFullyLocal: false });
    (useLocalContentSet as any).mockReturnValue(new Set(['leaf_1']));
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.partialDownloadRemaining'));
    expect(screen.getByText('download.allContentDownloaded')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download\.download \(/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('download.deleteAllDownloads'));
    expect(screen.queryByText('download.allContentDownloaded')).not.toBeInTheDocument();
    expect(screen.getByTestId('ion-alert')).toHaveAttribute('data-header', 'Delete Collection');
  });

  // ── Delete flow ──

  it('deletes every local leaf plus the collection entry and shows a toast', async () => {
    setProgress({ allDownloaded: true, isFullyLocal: true });
    (useLocalContentSet as any).mockReturnValue(new Set(['leaf_1', 'leaf_2']));
    localStorage.setItem('dl_toast_shown_do_coll_1', '1');
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.deleteDownloadedContent'));
    fireEvent.click(screen.getByTestId('alert-btn-destructive'));

    await waitFor(() => expect(contentDbService.delete).toHaveBeenCalledWith('do_coll_1'));
    expect(deleteDownloadedContent).toHaveBeenCalledWith('leaf_1');
    expect(deleteDownloadedContent).toHaveBeenCalledWith('leaf_2');
    expect(deleteDownloadedContent).not.toHaveBeenCalledWith('leaf_3');
    expect(downloadManager.notifyContentDeleted).toHaveBeenCalledWith('do_coll_1');
    expect(localStorage.getItem('dl_toast_shown_do_coll_1')).toBeNull();
    await waitFor(() => expect(screen.getByText('download.deleted')).toBeInTheDocument());
  });

  it('shows a danger toast when deletion fails', async () => {
    setProgress({ allDownloaded: true, isFullyLocal: true });
    (useLocalContentSet as any).mockReturnValue(new Set(['leaf_1']));
    (deleteDownloadedContent as any).mockRejectedValueOnce(new Error('disk error'));
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.deleteDownloadedContent'));
    fireEvent.click(screen.getByTestId('alert-btn-destructive'));

    await waitFor(() => expect(screen.getByText('download.deleteFailed')).toBeInTheDocument());
    expect(screen.getByText('download.deleteFailed').closest('[data-testid="ion-toast"]'))
      .toHaveAttribute('data-color', 'danger');
  });

  // ── View downloaded only ──

  it('shows an empty-state when the downloaded-only filter matches nothing', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByTestId('ion-toggle'));
    expect(screen.getByText('No Downloaded contents found')).toBeInTheDocument();
    expect(screen.queryByTestId('collection-accordion')).not.toBeInTheDocument();
  });

  it('passes only downloaded branches to the accordion when the filter is on', () => {
    (useLocalContentSet as any).mockReturnValue(new Set(['leaf_1']));
    render(<CollectionPage />);
    fireEvent.click(screen.getByTestId('ion-toggle'));
    expect(accordionProps.children).toHaveLength(1);
    expect(accordionProps.children[0].children).toHaveLength(1);
    expect(accordionProps.children[0].children[0].identifier).toBe('leaf_1');
  });

  it('defaults the downloaded-only filter to on when opened offline', () => {
    (useNetwork as any).mockReturnValue({ isOffline: true });
    (useLocalContentSet as any).mockReturnValue(new Set(['leaf_1']));
    render(<CollectionPage />);
    expect(screen.getByTestId('ion-toggle')).toBeChecked();
    expect(accordionProps.isOffline).toBe(true);
  });

  it('starts the bulk download from the sheet with the spine metadata', async () => {
    (startBulkDownload as any).mockResolvedValue({ enqueued: 2, skippedLocal: 0 });
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.download'));
    fireEvent.click(screen.getByRole('button', { name: /download\.download \(3 KB\)/ }));

    await waitFor(() =>
      expect(startBulkDownload).toHaveBeenCalledWith('do_coll_1', children, {
        spineDownloadUrl: 'https://cdn/spine.ecar',
        pkgVersion: 7,
      }),
    );
    await waitFor(() =>
      expect(screen.getByText('download.downloadingItems|2')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('toast-dismiss'));
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
  });

  it('closes the download sheet when it is swiped away', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.download'));
    expect(screen.getByTestId('ion-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('modal-dismiss'));
    expect(screen.queryByTestId('ion-modal')).not.toBeInTheDocument();
  });

  it('closes the delete alert when it is dismissed without a choice', () => {
    setProgress({ isFullyLocal: true, allDownloaded: true });
    (useLocalContentSet as any).mockReturnValue(new Set(['leaf_1']));
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('download.deleteDownloadedContent'));
    fireEvent.click(screen.getByTestId('alert-dismiss'));
    expect(screen.queryByTestId('ion-alert')).not.toBeInTheDocument();
    expect(deleteDownloadedContent).not.toHaveBeenCalled();
  });
});
