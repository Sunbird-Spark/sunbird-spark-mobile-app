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
  IonAlert: ({ isOpen }: any) => (isOpen ? <div data-testid="ion-alert" /> : null),
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
let trackerProps: any = null;
vi.mock('../components/telemetry/TelemetryTracker', () => ({
  TelemetryTracker: (props: any) => { trackerProps = props; return null; },
}));
vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ collectionId: 'do_coll_1' }),
  useLocation: () => ({ pathname: '/collection/do_coll_1', search: '?ref=home', state: undefined }),
}));

vi.mock('../hooks/useCollection', () => ({ useCollection: vi.fn() }));
vi.mock('../hooks/useContentSearch', () => ({ useContentSearch: vi.fn(() => ({ data: undefined })) }));
vi.mock('../services/relatedContentMapper', () => ({
  mapSearchContentToRelatedContentItems: vi.fn(() => []),
}));
vi.mock('../hooks/useCollectionEnrollment', () => ({ useCollectionEnrollment: vi.fn() }));
vi.mock('../hooks/useConsent', () => ({ useConsent: vi.fn() }));
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
    total: 0, completed: 0, overallPercent: 0, isDownloading: false,
    isPaused: false, allDownloaded: false, isFullyLocal: false, failedCount: 0,
  })),
}));
vi.mock('../hooks/useBatchDownloadStates', () => ({ useBatchDownloadStates: vi.fn(() => new Map()) }));
vi.mock('../providers/NetworkProvider', () => ({ useNetwork: vi.fn(() => ({ isOffline: false })) }));
vi.mock('../contexts/LanguageContext', () => {
  const value = { t: (k: string) => k };
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
    subscribe: vi.fn(() => vi.fn()), getEntry: vi.fn(async () => null),
    pause: vi.fn(async () => undefined), resume: vi.fn(async () => undefined),
    notifyContentDeleted: vi.fn(),
  },
}));
vi.mock('../services/db/ContentDbService', () => ({
  contentDbService: {
    getByIdentifiers: vi.fn(async () => []), getByIdentifier: vi.fn(async () => null),
    delete: vi.fn(async () => undefined),
  },
}));

import CollectionPage from './CollectionPage';
import { useCollection } from '../hooks/useCollection';
import { useCollectionEnrollment } from '../hooks/useCollectionEnrollment';
import { useConsent } from '../hooks/useConsent';
import { useUser } from '../hooks/useUser';
import { useNetwork } from '../providers/NetworkProvider';
import { userService } from '../services/UserService';
import { telemetryService } from '../services/TelemetryService';

const collectionData = {
  id: 'do_coll_1',
  title: 'Test Course',
  primaryCategory: 'Course',
  trackable: { enabled: 'Yes' },
  channel: 'ch-1',
  children: [],
};

const enrol = { mutateAsync: vi.fn(async () => undefined), isPending: false };
const unenrol = { mutateAsync: vi.fn(async () => undefined), isPending: false };

const baseEnrollment = {
  isLoading: false, isEnrolled: false, enrolledBatchId: null, enrollableBatches: [] as any[],
  isBatchEnded: false, isBatchUpcoming: false, batchStartDate: undefined as any,
  contentStatusMap: {}, contentAttemptInfoMap: {},
  progressProps: { total: 0, completed: 0, percentage: 0 },
  hasCertificate: false, certPreviewUrl: undefined as any,
  batchListLoading: false, batchListError: undefined as any,
  joinLoading: false, joinError: '', enrol, unenrol,
};

const baseConsent = {
  status: null as any, lastUpdatedOn: undefined as any, isLoading: false,
  refetch: vi.fn(), updateConsent: vi.fn(async () => undefined), isUpdating: false,
};

const setup = (over: { collection?: any; enrollment?: any; consent?: any; offline?: boolean } = {}) => {
  (useCollection as any).mockReturnValue({
    data: { ...collectionData, ...over.collection },
    isLoading: false, isError: false, fetchStatus: 'success', status: 'success', refetch: vi.fn(),
  });
  (useCollectionEnrollment as any).mockReturnValue({ ...baseEnrollment, ...over.enrollment });
  (useConsent as any).mockReturnValue({ ...baseConsent, ...over.consent });
  (useNetwork as any).mockReturnValue({ isOffline: !!over.offline });
};

describe('CollectionPage — joining a course', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    accordionProps = null;
    trackerProps = null;
    vi.mocked(userService.isLoggedIn).mockReturnValue(true);
    vi.mocked(userService.getUserId).mockReturnValue('user-1');
    setup();
  });

  it('treats the course creator as unenrolled and blocks enrolment', () => {
    setup({ collection: { createdBy: 'user-1' } });
    render(<CollectionPage />);
    expect(screen.getByTestId('collection-accordion')).toHaveAttribute('data-view-state', 'unenrolled');

    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    expect(screen.queryByText('collection.availableBatches')).not.toBeInTheDocument();
    expect(screen.getByText('collection.creatorCannotEnrol')).toBeInTheDocument();
  });

  it('blocks the creator from enrolling via the keyboard too', () => {
    setup({ collection: { createdBy: 'user-1' } });
    render(<CollectionPage />);
    fireEvent.keyDown(screen.getByText('collection.joinTheCourse'), { key: 'Enter' });
    expect(screen.getByText('collection.creatorCannotEnrol')).toBeInTheDocument();
  });

  it('opens the batch modal from the keyboard for a non-creator', () => {
    setup({ collection: { createdBy: 'someone-else' } });
    render(<CollectionPage />);
    fireEvent.keyDown(screen.getByText('collection.joinTheCourse'), { key: ' ' });
    expect(screen.getByText('collection.availableBatches')).toBeInTheDocument();
  });

  it('ignores unrelated keys on the join CTA', () => {
    render(<CollectionPage />);
    fireEvent.keyDown(screen.getByText('collection.joinTheCourse'), { key: 'Escape' });
    expect(screen.queryByText('collection.availableBatches')).not.toBeInTheDocument();
  });

  it('shows a spinner while the batch list loads', () => {
    setup({ enrollment: { batchListLoading: true } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows the batch list error', () => {
    setup({ enrollment: { batchListError: 'Batches unavailable' } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    expect(screen.getByText('Batches unavailable')).toBeInTheDocument();
  });

  it('reports when there are no enrollable batches', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    expect(screen.getByText('collection.noBatchesAvailable')).toBeInTheDocument();
  });

  it('lists the enrollable batches, falling back to the identifier for unnamed ones', () => {
    setup({
      enrollment: {
        enrollableBatches: [
          { identifier: 'batch-1', name: 'Morning batch' },
          { identifier: 'batch-2' },
        ],
      },
    });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    expect(screen.getByRole('option', { name: 'Morning batch' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'batch-2' })).toBeInTheDocument();
  });

  it('does not enrol until a batch has been picked', () => {
    setup({ enrollment: { enrollableBatches: [{ identifier: 'batch-1', name: 'B1' }] } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    const cta = screen.getByText('collection.joinTheBatch').parentElement!;
    expect(cta).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(cta);
    fireEvent.keyDown(cta, { key: 'Enter' });
    expect(enrol.mutateAsync).not.toHaveBeenCalled();
  });

  it('enrols in the selected batch, audits it and closes the modal', async () => {
    setup({ enrollment: { enrollableBatches: [{ identifier: 'batch-1', name: 'B1' }] } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'batch-1' } });
    fireEvent.click(screen.getByText('collection.joinTheBatch').parentElement!);

    await waitFor(() =>
      expect(enrol.mutateAsync).toHaveBeenCalledWith({
        courseId: 'do_coll_1', userId: 'user-1', batchId: 'batch-1',
      }),
    );
    expect(telemetryService.audit).toHaveBeenCalledWith({
      edata: { props: ['enrollment'], prevstate: 'NotEnrolled', state: 'Enrolled' },
      object: { id: 'do_coll_1', type: 'Collection', ver: '1' },
    });
    await waitFor(() => expect(screen.queryByText('collection.availableBatches')).not.toBeInTheDocument());
  });

  it('enrols from the keyboard on the batch CTA', async () => {
    setup({ enrollment: { enrollableBatches: [{ identifier: 'batch-9', name: 'B9' }] } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'batch-9' } });
    fireEvent.keyDown(screen.getByText('collection.joinTheBatch').parentElement!, { key: ' ' });
    await waitFor(() => expect(enrol.mutateAsync).toHaveBeenCalled());
  });

  it('keeps the modal open and surfaces the join error when enrolment fails', async () => {
    enrol.mutateAsync.mockRejectedValueOnce(new Error('already enrolled') as never);
    setup({
      enrollment: { enrollableBatches: [{ identifier: 'batch-1', name: 'B1' }], joinError: 'Enrolment failed' },
    });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'batch-1' } });
    fireEvent.click(screen.getByText('collection.joinTheBatch').parentElement!);

    await waitFor(() => expect(enrol.mutateAsync).toHaveBeenCalled());
    expect(screen.getByText('Enrolment failed')).toBeInTheDocument();
    expect(screen.getByText('collection.availableBatches')).toBeInTheDocument();
  });

  it('replaces the batch CTA label with a spinner while joining', () => {
    setup({
      enrollment: { enrollableBatches: [{ identifier: 'batch-1', name: 'B1' }], joinLoading: true },
    });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    expect(screen.queryByText('collection.joinTheBatch')).not.toBeInTheDocument();
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
  });

  it('closes the batch modal from its close button', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    fireEvent.click(screen.getByText('collection.availableBatches').nextElementSibling!);
    expect(screen.queryByText('collection.availableBatches')).not.toBeInTheDocument();
  });

  it('closes the batch modal when it is swiped away', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    fireEvent.click(screen.getByTestId('modal-dismiss'));
    expect(screen.queryByText('collection.availableBatches')).not.toBeInTheDocument();
  });

  it('dismisses the creator warning toast', () => {
    setup({ collection: { createdBy: 'user-1' } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('collection.joinTheCourse'));
    fireEvent.click(screen.getByTestId('toast-dismiss'));
    expect(screen.queryByText('collection.creatorCannotEnrol')).not.toBeInTheDocument();
  });

  it('signs an anonymous user in from the keyboard', () => {
    vi.mocked(userService.isLoggedIn).mockReturnValue(false);
    setup();
    render(<CollectionPage />);
    fireEvent.keyDown(screen.getByText('collection.letsGetStarted').parentElement!, { key: ' ' });
    expect(mockRouterPush).toHaveBeenCalledWith('/sign-in', 'forward', 'push');
    expect(sessionStorage.getItem('auth_return_to')).toBe('/collection/do_coll_1?ref=home');
  });

  it('ignores unrelated keys on the anonymous CTA', () => {
    vi.mocked(userService.isLoggedIn).mockReturnValue(false);
    setup();
    render(<CollectionPage />);
    fireEvent.keyDown(screen.getByText('collection.letsGetStarted').parentElement!, { key: 'Tab' });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('falls back to a generic telemetry object type when the category is missing', () => {
    setup({ collection: { primaryCategory: '' } });
    render(<CollectionPage />);
    expect(trackerProps.startOptions.object).toEqual({ id: 'do_coll_1', type: 'Collection', ver: '1' });
  });
});

describe('CollectionPage — profile data sharing consent', () => {
  const enrolled = { isEnrolled: true, enrolledBatchId: 'batch-1' };
  const withConsent = { userConsent: 'Yes' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userService.isLoggedIn).mockReturnValue(true);
    vi.mocked(userService.getUserId).mockReturnValue('user-1');
    (useUser as any).mockReturnValue({
      data: { firstName: 'Ada', lastName: 'Lovelace', id: 'user-1', state: 'Kerala', maskedPhone: '99*****10' },
    });
    setup({ collection: withConsent, enrollment: enrolled });
  });

  it('hides the consent card when the collection does not ask for consent', () => {
    setup({ enrollment: enrolled });
    render(<CollectionPage />);
    expect(screen.queryByText('personalInformation')).not.toBeInTheDocument();
  });

  it('reports sharing as off until consent is active', () => {
    render(<CollectionPage />);
    expect(screen.getByText('consent.profileSharingOff')).toBeInTheDocument();
    expect(screen.queryByText(/consent.lastUpdatedOn/)).not.toBeInTheDocument();
  });

  it('reports sharing as on with the last updated date', () => {
    setup({
      collection: withConsent,
      enrollment: enrolled,
      consent: { status: 'ACTIVE', lastUpdatedOn: '2024-05-06T00:00:00Z' },
    });
    render(<CollectionPage />);
    expect(screen.getByText('consent.profileSharingOn')).toBeInTheDocument();
    expect(screen.getByText(/consent.lastUpdatedOn/)).toBeInTheDocument();
  });

  it('replaces the update link with a spinner while the consent call is in flight', () => {
    setup({ collection: withConsent, enrollment: enrolled, consent: { isUpdating: true } });
    render(<CollectionPage />);
    expect(screen.queryByText('update')).not.toBeInTheDocument();
  });

  it('opens the consent modal with the learner profile summary', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('update'));
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText('Kerala')).toBeInTheDocument();
    expect(screen.getByText('99*****10')).toBeInTheDocument();
    expect(screen.getByLabelText('consent.agreeToShare')).not.toBeChecked();
  });

  it('requires the checkbox before sharing is allowed', async () => {
    const updateConsent = vi.fn(async () => undefined);
    setup({ collection: withConsent, enrollment: enrolled, consent: { updateConsent } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('update'));
    fireEvent.click(screen.getByText('consent.share'));
    await waitFor(() => expect(updateConsent).not.toHaveBeenCalled());
  });

  it('grants consent, closes the modal and confirms with a toast', async () => {
    const updateConsent = vi.fn(async () => undefined);
    const refetch = vi.fn();
    setup({ collection: withConsent, enrollment: enrolled, consent: { updateConsent, refetch } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('update'));
    fireEvent.click(screen.getByLabelText('consent.agreeToShare'));
    fireEvent.click(screen.getByText('consent.share'));

    await waitFor(() => expect(updateConsent).toHaveBeenCalledWith('ACTIVE'));
    expect(refetch).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('consent.preferenceUpdated')).toBeInTheDocument());
    expect(screen.queryByText('consent.agreeToShare')).not.toBeInTheDocument();
  });

  it('revokes consent from the "do not share" action', async () => {
    const updateConsent = vi.fn(async () => undefined);
    setup({ collection: withConsent, enrollment: enrolled, consent: { updateConsent } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('update'));
    fireEvent.click(screen.getByText('consent.doNotShare'));
    await waitFor(() => expect(updateConsent).toHaveBeenCalledWith('REVOKED'));
    await waitFor(() => expect(screen.getByText('consent.preferenceUpdated')).toBeInTheDocument());
  });

  it('shows a danger toast when the consent update fails', async () => {
    const updateConsent = vi.fn().mockRejectedValue(new Error('500'));
    setup({ collection: withConsent, enrollment: enrolled, consent: { updateConsent } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('update'));
    fireEvent.click(screen.getByText('consent.doNotShare'));
    await waitFor(() => expect(screen.getByText('syncNoInternet')).toBeInTheDocument());
    expect(screen.getByText('syncNoInternet').closest('[data-testid="ion-toast"]'))
      .toHaveAttribute('data-color', 'danger');
  });

  it('refuses both consent actions while offline', async () => {
    const updateConsent = vi.fn(async () => undefined);
    setup({ collection: withConsent, enrollment: enrolled, consent: { updateConsent }, offline: true });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('update'));
    fireEvent.click(screen.getByText('consent.doNotShare'));
    await waitFor(() => expect(screen.getByText('syncNoInternet')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('consent.agreeToShare'));
    fireEvent.click(screen.getByText('consent.share'));
    await waitFor(() => expect(updateConsent).not.toHaveBeenCalled());
  });

  it('closes the consent modal from its close button', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('update'));
    fireEvent.click(screen.getByText('×'));
    expect(screen.queryByText('consent.agreeToShare')).not.toBeInTheDocument();
  });

  it('closes the consent modal when it is swiped away', () => {
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('update'));
    fireEvent.click(screen.getByTestId('modal-dismiss'));
    expect(screen.queryByText('consent.agreeToShare')).not.toBeInTheDocument();
  });

  it('dismisses the consent confirmation toast', async () => {
    const updateConsent = vi.fn(async () => undefined);
    setup({ collection: withConsent, enrollment: enrolled, consent: { updateConsent } });
    render(<CollectionPage />);
    fireEvent.click(screen.getByText('update'));
    fireEvent.click(screen.getByText('consent.doNotShare'));
    await waitFor(() => expect(screen.getByText('consent.preferenceUpdated')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('toast-dismiss'));
    expect(screen.queryByText('consent.preferenceUpdated')).not.toBeInTheDocument();
  });

  it('toggles the downloaded-only filter in the enrolled view', () => {
    render(<CollectionPage />);
    expect(screen.getByTestId('ion-toggle')).not.toBeChecked();
    fireEvent.click(screen.getByTestId('ion-toggle'));
    expect(screen.getByText('No Downloaded contents found')).toBeInTheDocument();
  });
});
