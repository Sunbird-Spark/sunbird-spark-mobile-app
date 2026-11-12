import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Ionic ──
const mockRouterPush = vi.fn();
const mockRouterGoBack = vi.fn();
vi.mock('@ionic/react', async () => {
  const React = await import('react');
  return {
    IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
    IonHeader: ({ children }: any) => <div data-testid="ion-header">{children}</div>,
    IonToolbar: ({ children }: any) => <div>{children}</div>,
    IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
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
  default: ({ collectionData, hideBestSuited, children }: any) => (
    <div data-testid="collection-overview" data-hide-best-suited={String(!!hideBestSuited)}>
      <span>{collectionData.title}</span>
      {children}
    </div>
  ),
}));

let accordionProps: any = null;
vi.mock('../components/collection/CollectionAccordion', () => ({
  default: (props: any) => {
    accordionProps = props;
    return (
      <div
        data-testid="collection-accordion"
        data-view-state={props.viewState}
        data-hide-title={String(!!props.hideTitle)}
      >
        <button data-testid="accordion-play" onClick={() => props.onContentPlay('do_leaf_1')}>play</button>
      </div>
    );
  },
}));

let playerProps: any = null;
vi.mock('../components/collection/CollectionContentPlayer', () => ({
  default: (props: any) => {
    playerProps = props;
    return (
      <div data-testid="collection-content-player">
        <button data-testid="player-close" onClick={props.onClose}>close</button>
      </div>
    );
  },
}));

let dialogProps: any = null;
vi.mock('../components/collection/CourseCompletionDialog', () => ({
  default: (props: any) => {
    dialogProps = props;
    return <div data-testid="course-completion-dialog" />;
  },
}));

vi.mock('../components/collection/RelatedContent', () => ({
  default: ({ items }: any) => <div data-testid="related-content">{items.length} items</div>,
}));
vi.mock('../components/home/FAQSection', () => ({ default: () => <div data-testid="faq-section" /> }));
vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error }: any) => <div data-testid="page-loader">{message}{error}</div>,
}));
vi.mock('../components/telemetry/TelemetryTracker', () => ({ TelemetryTracker: () => null }));
vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));

const mockLocation = { pathname: '/collection/do_test_123', search: '', state: undefined as any };
vi.mock('react-router-dom', () => ({
  useParams: () => ({ collectionId: 'do_test_123' }),
  useLocation: () => mockLocation,
}));

vi.mock('../hooks/useCollection', () => ({ useCollection: vi.fn() }));
vi.mock('../hooks/useContentSearch', () => ({ useContentSearch: vi.fn(() => ({ data: undefined })) }));
vi.mock('../services/relatedContentMapper', () => ({
  mapSearchContentToRelatedContentItems: vi.fn(() => []),
}));
vi.mock('../hooks/useCollectionEnrollment', () => ({ useCollectionEnrollment: vi.fn() }));
vi.mock('../hooks/useConsent', () => ({ useConsent: vi.fn() }));
vi.mock('../hooks/useUser', () => ({ useUser: vi.fn(() => ({ data: undefined })) }));
vi.mock('../hooks/useForceSync', () => ({ useForceSync: vi.fn() }));
vi.mock('../hooks/useLocalContentSet', () => ({ useLocalContentSet: vi.fn(() => new Set()) }));
vi.mock('../hooks/useIsContentLocal', () => ({
  useIsContentLocal: vi.fn(() => ({ isLocal: false, isCheckPending: false })),
}));
vi.mock('../hooks/useCourseDownloadProgress', () => ({ useCourseDownloadProgress: vi.fn() }));
vi.mock('../hooks/useBatchDownloadStates', () => ({ useBatchDownloadStates: vi.fn(() => new Map()) }));
vi.mock('../providers/NetworkProvider', () => ({ useNetwork: vi.fn(() => ({ isOffline: false })) }));
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ t: (k: string) => k })),
}));
vi.mock('../services/UserService', () => ({
  userService: { getUserId: vi.fn(() => 'user-1'), isLoggedIn: vi.fn(() => true) },
}));
vi.mock('../services/TelemetryService', () => ({ telemetryService: { audit: vi.fn() } }));
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
import { useCollectionEnrollment } from '../hooks/useCollectionEnrollment';
import { useConsent } from '../hooks/useConsent';
import { useForceSync } from '../hooks/useForceSync';
import { useCourseDownloadProgress } from '../hooks/useCourseDownloadProgress';
import { useNetwork } from '../providers/NetworkProvider';
import { telemetryService } from '../services/TelemetryService';

const collectionData = {
  id: 'do_test_123',
  title: 'Test Course',
  primaryCategory: 'Course',
  trackable: { enabled: 'Yes' },
  children: [{ identifier: 'do_leaf_1', name: 'Leaf', mimeType: 'application/pdf', children: [] }],
  hierarchyRoot: { downloadUrl: 'https://cdn/spine.ecar', pkgVersion: 3 },
};

const baseProgress = {
  total: 0, completed: 0, overallPercent: 0, isDownloading: false,
  isPaused: false, allDownloaded: false, isFullyLocal: false, failedCount: 0,
};

const unenrol = { mutateAsync: vi.fn(async () => undefined), isPending: false };
const enrol = { mutateAsync: vi.fn(async () => undefined), isPending: false };

const baseEnrollment = {
  isLoading: false, isEnrolled: true, enrolledBatchId: 'batch-1', enrollableBatches: [],
  isBatchEnded: false, isBatchUpcoming: false, batchStartDate: undefined as any,
  contentStatusMap: { do_leaf_1: 2 }, contentAttemptInfoMap: {},
  progressProps: { total: 4, completed: 2, percentage: 50 },
  hasCertificate: false, certPreviewUrl: undefined as any,
  batchListLoading: false, batchListError: undefined as any,
  joinLoading: false, joinError: '', enrol, unenrol,
};

const baseForceSync = {
  showForceSyncButton: false, handleForceSync: vi.fn(), isForceSyncing: false, forceSyncError: null as any,
};

const baseConsent = {
  status: null as any, lastUpdatedOn: undefined as any, isLoading: false,
  refetch: vi.fn(), updateConsent: vi.fn(async () => undefined), isUpdating: false,
};

const setup = (over: {
  collection?: any; enrollment?: any; forceSync?: any; consent?: any; offline?: boolean;
} = {}) => {
  (useCollection as any).mockReturnValue({
    data: over.collection === undefined ? collectionData : over.collection,
    isLoading: false, isError: false, fetchStatus: 'success', status: 'success',
    refetch: vi.fn(),
  });
  (useCollectionEnrollment as any).mockReturnValue({ ...baseEnrollment, ...over.enrollment });
  (useForceSync as any).mockReturnValue({ ...baseForceSync, ...over.forceSync });
  (useConsent as any).mockReturnValue({ ...baseConsent, ...over.consent });
  (useNetwork as any).mockReturnValue({ isOffline: !!over.offline });
};

describe('CollectionPage — enrolled trackable view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    accordionProps = null;
    playerProps = null;
    dialogProps = null;
    mockLocation.state = undefined;
    (useCourseDownloadProgress as any).mockReturnValue({ ...baseProgress });
    setup();
  });

  it('renders enrolled curriculum with progress percentage and hidden accordion title', () => {
    render(<CollectionPage />);
    expect(screen.getByTestId('collection-accordion')).toHaveAttribute('data-view-state', 'enrolled');
    expect(screen.getByTestId('collection-accordion')).toHaveAttribute('data-hide-title', 'true');
    expect(screen.getByTestId('collection-overview')).toHaveAttribute('data-hide-best-suited', 'true');
    expect(screen.getByRole('heading', { name: /completed: 50%/i })).toBeInTheDocument();
  });

  it('passes enrollment status maps down to the accordion', () => {
    render(<CollectionPage />);
    expect(accordionProps.enrollmentData).toEqual({
      contentStatusMap: { do_leaf_1: 2 },
      contentAttemptInfoMap: {},
    });
    expect(accordionProps.spineDownloadUrl).toBe('https://cdn/spine.ecar');
    expect(accordionProps.spinePkgVersion).toBe(3);
  });

  it('renders the batch start label when a batch start date exists', () => {
    setup({ enrollment: { batchStartDate: '2024-03-05T00:00:00Z' } });
    render(<CollectionPage />);
    expect(screen.getByText(/collection.batchStartedOn/)).toBeInTheDocument();
  });

  it('marks the view active for the completion dialog after the Ionic view enters', () => {
    render(<CollectionPage />);
    expect(dialogProps.isViewActive).toBe(true);
    expect(dialogProps.progressPercentage).toBe(50);
    expect(dialogProps.progressBeforePlayer).toBeNull();
  });

  // ── Fullscreen player ──

  it('opens the fullscreen player and snapshots progress before playing', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByTestId('accordion-play'));
    expect(screen.getByTestId('collection-content-player')).toBeInTheDocument();
    expect(playerProps.contentId).toBe('do_leaf_1');
    expect(playerProps.batchId).toBe('batch-1');
    expect(playerProps.isEnrolled).toBe(true);
    expect(playerProps.currentContentStatus).toBe(2);
    expect(playerProps.skipContentStateUpdate).toBe(false);
  });

  it('closes the player and returns to the collection view', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByTestId('accordion-play'));
    fireEvent.click(screen.getByTestId('player-close'));
    expect(screen.queryByTestId('collection-content-player')).not.toBeInTheDocument();
    expect(screen.getByTestId('collection-accordion')).toBeInTheDocument();
  });

  // ── Upcoming batch gate ──

  it('renders the upcoming-batch gate instead of the curriculum', () => {
    setup({ enrollment: { isBatchUpcoming: true, batchStartDate: '2030-01-15T00:00:00Z' } });
    render(<CollectionPage />);
    expect(screen.queryByTestId('collection-accordion')).not.toBeInTheDocument();
    expect(screen.getByText(/This batch has not started yet/)).toBeInTheDocument();
    expect(screen.getByText(/It starts on/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Test Course' })).toBeInTheDocument();
  });

  it('omits the start date sentence when the batch has no start date', () => {
    setup({ enrollment: { isBatchUpcoming: true, batchStartDate: undefined } });
    render(<CollectionPage />);
    expect(screen.getByText(/This batch has not started yet/)).toBeInTheDocument();
    expect(screen.queryByText(/It starts on/)).not.toBeInTheDocument();
  });

  it('goes back from the upcoming-batch gate using the parent route', () => {
    mockLocation.state = { parentRoute: '/courses' };
    setup({ enrollment: { isBatchUpcoming: true } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('back'));
    expect(mockRouterPush).toHaveBeenCalledWith('/courses', 'back', 'pop');
    expect(mockRouterGoBack).not.toHaveBeenCalled();
  });

  // ── 3-dot menu ──

  it('opens the 3-dot menu and shows the leave-course action below 100%', () => {
    render(<CollectionPage />);
    expect(screen.queryByText('download.leaveCourse')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('moreOptions'));
    expect(screen.getByText('download.leaveCourse')).toBeInTheDocument();
  });

  it('closes the 3-dot menu when the backdrop is clicked', () => {
    const { container } = render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('moreOptions'));
    fireEvent.click(container.querySelector('.cp-menu-backdrop')!);
    expect(screen.queryByText('download.leaveCourse')).not.toBeInTheDocument();
  });

  it('hides the 3-dot menu at 100% when force-sync is unavailable', () => {
    setup({ enrollment: { progressProps: { total: 4, completed: 4, percentage: 100 } } });
    render(<CollectionPage />);
    expect(screen.queryByLabelText('moreOptions')).not.toBeInTheDocument();
  });

  it('shows the force-sync action at 100% and runs it, closing the menu', () => {
    const handleForceSync = vi.fn();
    setup({
      enrollment: { progressProps: { total: 4, completed: 4, percentage: 100 } },
      forceSync: { showForceSyncButton: true, handleForceSync },
    });
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('moreOptions'));
    fireEvent.click(screen.getByText('download.syncProgress'));
    expect(handleForceSync).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('download.syncProgress')).not.toBeInTheDocument();
  });

  it('renders a spinner in place of the force-sync label while syncing', () => {
    setup({
      enrollment: { progressProps: { total: 4, completed: 4, percentage: 100 } },
      forceSync: { showForceSyncButton: true, isForceSyncing: true },
    });
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('moreOptions'));
    expect(screen.queryByText('download.syncProgress')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('ion-spinner').length).toBeGreaterThan(0);
  });

  it('surfaces a force-sync error as a danger toast', () => {
    setup({ forceSync: { forceSyncError: 'Sync failed on server' } });
    render(<CollectionPage />);
    const toast = screen.getByText('Sync failed on server');
    expect(toast).toBeInTheDocument();
    expect(toast.closest('[data-testid="ion-toast"]')).toHaveAttribute('data-color', 'danger');
  });

  // ── Leave course ──

  it('unenrols through the confirmation dialog and closes it', async () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('moreOptions'));
    fireEvent.click(screen.getByText('download.leaveCourse'));
    expect(screen.getByText('download.leaveCourseConfirm')).toBeInTheDocument();

    fireEvent.click(screen.getByText('download.leave'));
    await waitFor(() =>
      expect(unenrol.mutateAsync).toHaveBeenCalledWith({
        courseId: 'do_test_123', userId: 'user-1', batchId: 'batch-1',
      }),
    );
    await waitFor(() => expect(screen.queryByText('download.leaveCourseConfirm')).not.toBeInTheDocument());
  });

  it('cancels the leave-course dialog without unenrolling', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('moreOptions'));
    fireEvent.click(screen.getByText('download.leaveCourse'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('download.leaveCourseConfirm')).not.toBeInTheDocument();
    expect(unenrol.mutateAsync).not.toHaveBeenCalled();
  });

  it('blocks leaving the course while offline and shows a toast', async () => {
    setup({ offline: true });
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('moreOptions'));
    fireEvent.click(screen.getByText('download.leaveCourse'));
    fireEvent.click(screen.getByText('download.leave'));
    await waitFor(() =>
      expect(screen.getByText('collection.leaveCourseOffline')).toBeInTheDocument(),
    );
    expect(unenrol.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows the server error message when unenrol fails', async () => {
    unenrol.mutateAsync.mockRejectedValueOnce(new Error('  Batch already ended  ') as never);
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('moreOptions'));
    fireEvent.click(screen.getByText('download.leaveCourse'));
    fireEvent.click(screen.getByText('download.leave'));
    await waitFor(() => expect(screen.getByText('Batch already ended')).toBeInTheDocument());
  });

  it('falls back to a generic message when unenrol rejects without a message', async () => {
    unenrol.mutateAsync.mockRejectedValueOnce(new Error('') as never);
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('moreOptions'));
    fireEvent.click(screen.getByText('download.leaveCourse'));
    fireEvent.click(screen.getByText('download.leave'));
    await waitFor(() =>
      expect(screen.getByText('Failed to unenroll from the course')).toBeInTheDocument(),
    );
  });

  it('does not call unenrol when there is no enrolled batch id', () => {
    setup({ enrollment: { enrolledBatchId: null } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('moreOptions'));
    fireEvent.click(screen.getByText('download.leaveCourse'));
    fireEvent.click(screen.getByText('download.leave'));
    expect(unenrol.mutateAsync).not.toHaveBeenCalled();
  });

  // ── Certificate card ──

  it('shows the no-certificate copy when the batch issues none', () => {
    render(<CollectionPage />);
    expect(screen.getByText('certificateDetails.noCertificate')).toBeInTheDocument();
    expect(screen.queryByText('certificateDetails.previewCertificate')).not.toBeInTheDocument();
  });

  it('hides the preview button when a certificate exists without a preview url', () => {
    setup({ enrollment: { hasCertificate: true } });
    render(<CollectionPage />);
    expect(screen.getByText('certificateDetails.earnCertificate')).toBeInTheDocument();
    expect(screen.queryByText('certificateDetails.previewCertificate')).not.toBeInTheDocument();
  });

  it('opens the certificate preview modal with the certificate image', () => {
    setup({ enrollment: { hasCertificate: true, certPreviewUrl: 'https://cdn/cert.png' } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('certificateDetails.previewCertificate'));
    expect(screen.getByText('download.previewCertificate')).toBeInTheDocument();
    expect(screen.getByAltText('Certificate Preview')).toHaveAttribute('src', 'https://cdn/cert.png');
  });

  it('closes the certificate preview when the modal is swiped away', () => {
    setup({ enrollment: { hasCertificate: true, certPreviewUrl: 'https://cdn/cert.png' } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('certificateDetails.previewCertificate'));
    fireEvent.click(screen.getByTestId('modal-dismiss'));
    expect(screen.queryByAltText('Certificate Preview')).not.toBeInTheDocument();
  });

  it('closes the leave-course dialog when it is swiped away', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByLabelText('moreOptions'));
    fireEvent.click(screen.getByText('download.leaveCourse'));
    fireEvent.click(screen.getByTestId('modal-dismiss'));
    expect(screen.queryByText('download.leaveCourseConfirm')).not.toBeInTheDocument();
  });

  it('hides the certificate card entirely while offline', () => {
    setup({ offline: true, enrollment: { hasCertificate: true } });
    render(<CollectionPage />);
    expect(screen.queryByText('certificate')).not.toBeInTheDocument();
    expect(screen.queryByText('certificateDetails.earnCertificate')).not.toBeInTheDocument();
  });

  it('does not record an enrollment audit event for an already-enrolled learner', () => {
    render(<CollectionPage />);
    expect(telemetryService.audit).not.toHaveBeenCalled();
  });
});
