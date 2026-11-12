import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { HierarchyContentNode } from '../../types/collectionTypes';
import type { DownloadProgress } from '../../services/download_manager/types';

const mockRouterPush = vi.fn();
let groupValue: string[] = [];
let groupOnChange: ((e: any) => void) | undefined;

vi.mock('@ionic/react', () => ({
  IonAccordionGroup: ({ children, value, onIonChange, 'aria-label': ariaLabel }: any) => {
    groupValue = value ?? [];
    groupOnChange = onIonChange;
    return <div data-testid="accordion-group" aria-label={ariaLabel}>{children}</div>;
  },
  IonAccordion: ({ children, value }: any) => (
    <div data-testid={`accordion-${value}`} data-expanded={groupValue.includes(value)}>{children}</div>
  ),
  IonItem: ({ children, slot }: any) => <div data-slot={slot}>{children}</div>,
  IonLabel: ({ children }: any) => <div>{children}</div>,
  IonModal: ({ children, isOpen, onDidDismiss }: any) =>
    isOpen ? (
      <div data-testid="ion-modal">
        {children}
        <button data-testid="modal-dismiss" onClick={onDidDismiss}>dismiss</button>
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
  IonSpinner: () => <div data-testid="ion-spinner" />,
  IonToast: ({ isOpen, message, onDidDismiss }: any) =>
    isOpen ? (
      <div data-testid="ion-toast">
        {message}
        <button data-testid="toast-dismiss" onClick={onDidDismiss}>dismiss</button>
      </div>
    ) : null,
  useIonRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/collection/do_1', search: '?x=1' }),
}));
vi.mock('../../utils/returnTo', () => ({ saveReturnTo: vi.fn() }));
vi.mock('ionicons/icons', () => ({ chevronDownOutline: 'chevron-down-outline' }));
vi.mock('../icons/CollectionIcons', () => ({
  VideoIcon: ({ size }: any) => <span data-testid="video-icon" data-size={size} />,
  DocumentIcon: ({ size }: any) => <span data-testid="document-icon" data-size={size} />,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, p?: any) => (p ? `${k}|${Object.values(p).join(',')}` : k),
  }),
}));
vi.mock('../../services/content/courseDownloadHelper', () => ({ startBulkDownload: vi.fn() }));
vi.mock('../../services/content/contentDeleteHelper', () => ({ deleteDownloadedContent: vi.fn() }));
vi.mock('../../services/download_manager', () => ({
  downloadManager: {
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
  },
}));

import CollectionAccordion from './CollectionAccordion';
import { saveReturnTo } from '../../utils/returnTo';
import { startBulkDownload } from '../../services/content/courseDownloadHelper';
import { deleteDownloadedContent } from '../../services/content/contentDeleteHelper';
import { downloadManager } from '../../services/download_manager';

const t = (k: string) => k;

const leaf = (id: string, over: Partial<HierarchyContentNode> = {}): HierarchyContentNode => ({
  identifier: id,
  name: `Leaf ${id}`,
  mimeType: 'application/pdf',
  downloadUrl: `https://cdn/${id}.ecar`,
  ...over,
} as HierarchyContentNode);

const unit = (id: string, kids: HierarchyContentNode[], over: Partial<HierarchyContentNode> = {}): HierarchyContentNode => ({
  identifier: id,
  name: `Unit ${id}`,
  mimeType: 'application/vnd.ekstep.content-collection',
  children: kids,
  ...over,
} as HierarchyContentNode);

const tree = [unit('u1', [leaf('l1'), leaf('l2')])];

const dl = (state: string, progress = 0): DownloadProgress =>
  ({ identifier: 'x', state, progress, bytesDownloaded: 0, totalBytes: 0 } as unknown as DownloadProgress);

const renderAccordion = (props: Partial<React.ComponentProps<typeof CollectionAccordion>> = {}) =>
  render(
    <CollectionAccordion
      children={tree}
      collectionId="do_1"
      isCourse
      viewState="default"
      t={t}
      {...props}
    />,
  );

describe('CollectionAccordion — unit download button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    groupValue = [];
    groupOnChange = undefined;
    (startBulkDownload as any).mockResolvedValue({ enqueued: 2, skippedLocal: 0 });
    (deleteDownloadedContent as any).mockResolvedValue(undefined);
  });

  it('is hidden for a unit with nothing downloadable', () => {
    renderAccordion({ children: [unit('u1', [leaf('l1', { downloadUrl: undefined })])] });
    expect(screen.queryByLabelText(/collectionAccordion.downloadUnit/)).not.toBeInTheDocument();
  });

  it('is hidden entirely in the unenrolled view', () => {
    renderAccordion({ viewState: 'unenrolled' });
    expect(screen.queryByLabelText(/collectionAccordion.downloadUnit/)).not.toBeInTheDocument();
  });

  it('offers a full-unit download with the item count', () => {
    renderAccordion();
    expect(screen.getByLabelText('collectionAccordion.downloadUnit|2')).toBeInTheDocument();
  });

  it('switches to a "remaining" label with a progress count once part is local', () => {
    renderAccordion({ localContentSet: new Set(['l1']) });
    expect(screen.getByLabelText('collectionAccordion.downloadRemaining|1')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('starts a bulk download for the unit and shows a spinner while it runs', async () => {
    let release: (v: any) => void = () => { };
    (startBulkDownload as any).mockReturnValue(new Promise((r) => { release = r; }));
    renderAccordion();

    fireEvent.click(screen.getByLabelText('collectionAccordion.downloadUnit|2'));
    expect(startBulkDownload).toHaveBeenCalledWith('do_1', tree[0].children, {
      spineDownloadUrl: undefined,
      pkgVersion: undefined,
    });
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();

    release({ enqueued: 2, skippedLocal: 0 });
    await waitFor(() => expect(screen.queryByTestId('ion-spinner')).not.toBeInTheDocument());
  });

  it('passes the spine metadata through to the bulk download', () => {
    renderAccordion({ spineDownloadUrl: 'https://cdn/spine.ecar', spinePkgVersion: 4 });
    fireEvent.click(screen.getByLabelText('collectionAccordion.downloadUnit|2'));
    expect(startBulkDownload).toHaveBeenCalledWith('do_1', tree[0].children, {
      spineDownloadUrl: 'https://cdn/spine.ecar',
      pkgVersion: 4,
    });
  });

  it('does not start a download while offline', () => {
    renderAccordion({ isOffline: true });
    fireEvent.click(screen.getByLabelText('collectionAccordion.downloadUnit|2'));
    expect(startBulkDownload).not.toHaveBeenCalled();
  });

  it('shows a delete control once every downloadable leaf is local', () => {
    renderAccordion({ localContentSet: new Set(['l1', 'l2']) });
    expect(screen.getByLabelText('collectionAccordion.deleteUnitDownloads')).toBeInTheDocument();
    expect(screen.queryByLabelText(/collectionAccordion.downloadUnit/)).not.toBeInTheDocument();
  });

  it('deletes only the local leaves of the unit after confirmation', async () => {
    renderAccordion({ localContentSet: new Set(['l1', 'l2']) });
    fireEvent.click(screen.getByLabelText('collectionAccordion.deleteUnitDownloads'));
    expect(screen.getByTestId('ion-alert')).toHaveAttribute('data-header', 'collectionAccordion.deleteUnit');

    fireEvent.click(screen.getByTestId('alert-destructive'));
    await waitFor(() => expect(deleteDownloadedContent).toHaveBeenCalledTimes(2));
    expect(deleteDownloadedContent).toHaveBeenCalledWith('l1');
    expect(deleteDownloadedContent).toHaveBeenCalledWith('l2');
    expect(screen.queryByTestId('ion-alert')).not.toBeInTheDocument();
  });

  it('closes the delete confirmation without deleting', () => {
    renderAccordion({ localContentSet: new Set(['l1', 'l2']) });
    fireEvent.click(screen.getByLabelText('collectionAccordion.deleteUnitDownloads'));
    fireEvent.click(screen.getByTestId('alert-dismiss'));
    expect(screen.queryByTestId('ion-alert')).not.toBeInTheDocument();
    expect(deleteDownloadedContent).not.toHaveBeenCalled();
  });

  it('shows an aggregate ring with a pause action while the unit downloads', async () => {
    renderAccordion({
      downloadStates: new Map([['l1', dl('DOWNLOADING', 40)], ['l2', dl('QUEUED', 0)]]),
    });
    const unitRing = screen.getAllByLabelText('pauseDownload')[0];
    expect(screen.getByText('0/2')).toBeInTheDocument();

    fireEvent.click(unitRing);
    await waitFor(() => expect(downloadManager.pause).toHaveBeenCalledTimes(2));
    expect(downloadManager.pause).toHaveBeenCalledWith('l1');
    expect(downloadManager.pause).toHaveBeenCalledWith('l2');
  });

  it('shows a resume action when every active item in the unit is paused', async () => {
    renderAccordion({ downloadStates: new Map([['l1', dl('PAUSED', 30)]]) });
    fireEvent.click(screen.getAllByLabelText('resumeDownload')[0]);
    await waitFor(() => expect(downloadManager.resume).toHaveBeenCalledWith('l1'));
    expect(downloadManager.resume).toHaveBeenCalledTimes(1);
  });

  it('resumes the unit ring from the keyboard', async () => {
    renderAccordion({ downloadStates: new Map([['l1', dl('PAUSED', 30)]]) });
    fireEvent.keyDown(screen.getAllByLabelText('resumeDownload')[0], { key: 'Enter' });
    await waitFor(() => expect(downloadManager.resume).toHaveBeenCalledWith('l1'));
  });

  it('ignores unrelated keys on the unit ring', () => {
    renderAccordion({ downloadStates: new Map([['l1', dl('PAUSED', 30)]]) });
    fireEvent.keyDown(screen.getAllByLabelText('resumeDownload')[0], { key: 'Escape' });
    expect(downloadManager.resume).not.toHaveBeenCalled();
  });

  it('shows a retry-failed control when some items failed and some are local', () => {
    renderAccordion({
      localContentSet: new Set(['l1']),
      downloadStates: new Map([['l2', dl('FAILED')]]),
    });
    const btn = screen.getByLabelText('collectionAccordion.retryFailed|1');
    fireEvent.click(btn);
    expect(startBulkDownload).toHaveBeenCalled();
  });

  it('shows an all-failed control when nothing is local', () => {
    renderAccordion({
      downloadStates: new Map([['l1', dl('FAILED')], ['l2', dl('FAILED')]]),
    });
    fireEvent.click(screen.getByLabelText('download.downloadFailedRetry'));
    expect(startBulkDownload).toHaveBeenCalled();
  });
});

describe('CollectionAccordion — leaf item states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    groupValue = [];
  });

  it('renders the formatted duration for a leaf', () => {
    renderAccordion({ children: [unit('u1', [leaf('l1', { duration: 125 })])] });
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('omits the duration for a zero-length leaf', () => {
    renderAccordion({ children: [unit('u1', [leaf('l1', { duration: 0 })])] });
    expect(screen.queryByText(/^\d{2}:\d{2}$/)).not.toBeInTheDocument();
  });

  it('pauses an individual leaf from its progress ring', async () => {
    renderAccordion({ downloadStates: new Map([['l1', dl('DOWNLOADING', 60)]]) });
    const rings = screen.getAllByLabelText('pauseDownload');
    fireEvent.click(rings[rings.length - 1]);
    await waitFor(() => expect(downloadManager.pause).toHaveBeenCalledWith('l1'));
  });

  it('resumes an individual leaf from its progress ring', async () => {
    renderAccordion({ downloadStates: new Map([['l1', dl('PAUSED', 60)]]) });
    const rings = screen.getAllByLabelText('resumeDownload');
    fireEvent.click(rings[rings.length - 1]);
    await waitFor(() => expect(downloadManager.resume).toHaveBeenCalledWith('l1'));
  });

  it('pauses a queued leaf from its spinner', async () => {
    renderAccordion({ downloadStates: new Map([['l1', dl('QUEUED')]]) });
    const spinners = screen.getAllByTestId('ion-spinner');
    fireEvent.click(spinners[spinners.length - 1].parentElement!);
    await waitFor(() => expect(downloadManager.pause).toHaveBeenCalledWith('l1'));
  });

  it('does not pause an importing leaf from its spinner', () => {
    renderAccordion({ downloadStates: new Map([['l1', dl('IMPORTING')]]) });
    const spinners = screen.getAllByTestId('ion-spinner');
    fireEvent.click(spinners[spinners.length - 1].parentElement!);
    expect(downloadManager.pause).not.toHaveBeenCalled();
  });

  it('hides the duration and shows an error marker for a failed leaf', () => {
    renderAccordion({
      children: [unit('u1', [leaf('l1', { duration: 90 })])],
      downloadStates: new Map([['l1', dl('FAILED')]]),
    });
    expect(screen.queryByText('01:30')).not.toBeInTheDocument();
  });

  it('dims an offline leaf that is not downloaded and blocks activation', () => {
    const onContentPlay = vi.fn();
    renderAccordion({ isOffline: true, onContentPlay });
    const item = screen.getByLabelText('Leaf l1');

    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).toHaveAttribute('tabindex', '-1');
    expect(within(item).getByText('downloadToPlayOfflineHint')).toBeInTheDocument();

    fireEvent.click(item);
    expect(onContentPlay).not.toHaveBeenCalled();
  });

  it('allows playing an offline leaf that is available locally', () => {
    const onContentPlay = vi.fn();
    renderAccordion({ isOffline: true, localContentSet: new Set(['l1', 'l2']), onContentPlay });
    fireEvent.click(screen.getByLabelText('Leaf l1'));
    expect(onContentPlay).toHaveBeenCalledWith('l1');
  });

  it('plays a leaf from the keyboard', () => {
    const onContentPlay = vi.fn();
    renderAccordion({ onContentPlay });
    fireEvent.keyDown(screen.getByLabelText('Leaf l1'), { key: ' ' });
    expect(onContentPlay).toHaveBeenCalledWith('l1');
  });

  it('ignores unrelated keys on a leaf', () => {
    const onContentPlay = vi.fn();
    renderAccordion({ onContentPlay });
    fireEvent.keyDown(screen.getByLabelText('Leaf l1'), { key: 'a' });
    expect(onContentPlay).not.toHaveBeenCalled();
  });

  it('renders a nested sub-unit label and its leaves', () => {
    renderAccordion({
      children: [unit('u1', [unit('sub1', [leaf('l9')], { name: undefined as any })])],
    });
    expect(screen.getByText('collection.untitled')).toBeInTheDocument();
    expect(screen.getByLabelText('Leaf l9')).toBeInTheDocument();
  });

  it('renders nothing for a unit with no children', () => {
    renderAccordion({ children: [unit('u1', [])] });
    expect(screen.queryByRole('button', { name: /^Leaf/ })).not.toBeInTheDocument();
  });
});

describe('CollectionAccordion — assessment and gating states', () => {
  const assessTree = [
    unit('u1', [
      leaf('a1', { name: 'Quiz', contentType: 'SelfAssess', maxAttempts: 2 } as any),
    ]),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    groupValue = [];
  });

  it('shows the attempt counter and best score for a self-assess item', () => {
    renderAccordion({
      children: assessTree,
      viewState: 'enrolled',
      enrollmentData: {
        contentStatusMap: { a1: 1 },
        contentAttemptInfoMap: { a1: { attemptCount: 1, bestScore: { totalScore: 7, totalMaxScore: 10 } } },
      },
    });
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText(/bestScore/)).toBeInTheDocument();
    expect(screen.getByLabelText('inProgress')).toBeInTheDocument();
  });

  it('blocks a self-assess item once max attempts are used and toasts about it', async () => {
    const onContentPlay = vi.fn();
    renderAccordion({
      children: assessTree,
      viewState: 'enrolled',
      onContentPlay,
      enrollmentData: {
        contentStatusMap: { a1: 2 },
        contentAttemptInfoMap: { a1: { attemptCount: 2 } },
      },
    });
    expect(screen.getByLabelText('completed')).toBeInTheDocument();
    expect(screen.getByText('assessment_max_attempts_reached')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Quiz'));
    expect(onContentPlay).not.toHaveBeenCalled();
    expect(screen.getByTestId('ion-toast')).toHaveTextContent('assessment_max_attempts_reached');

    fireEvent.click(screen.getByTestId('toast-dismiss'));
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
  });

  it('marks an untouched item as not started', () => {
    renderAccordion({
      viewState: 'enrolled',
      enrollmentData: { contentStatusMap: {}, contentAttemptInfoMap: {} },
    });
    expect(screen.getAllByLabelText('notStarted')).toHaveLength(2);
  });

  it('prompts an anonymous learner to sign in and routes there', () => {
    renderAccordion({ viewState: 'anonymous' });
    fireEvent.click(screen.getByLabelText('Leaf l1'));
    expect(screen.getByText('collection.unlockYourLearning')).toBeInTheDocument();

    fireEvent.click(screen.getByText('login'));
    expect(saveReturnTo).toHaveBeenCalledWith('/collection/do_1?x=1');
    expect(mockRouterPush).toHaveBeenCalledWith('/sign-in', 'forward', 'push');
    expect(screen.queryByTestId('ion-modal')).not.toBeInTheDocument();
  });

  it('closes the login prompt when it is swiped away', () => {
    renderAccordion({ viewState: 'anonymous' });
    fireEvent.click(screen.getByLabelText('Leaf l1'));
    fireEvent.click(screen.getByTestId('modal-dismiss'));
    expect(screen.queryByTestId('ion-modal')).not.toBeInTheDocument();
  });

  it('nudges an unenrolled learner to join the course', () => {
    const onContentPlay = vi.fn();
    renderAccordion({ viewState: 'unenrolled', onContentPlay });
    fireEvent.click(screen.getByLabelText('Leaf l1'));
    expect(onContentPlay).not.toHaveBeenCalled();
    expect(screen.getByTestId('ion-toast')).toHaveTextContent('collection.joinCourseToAccess');

    fireEvent.click(screen.getByTestId('toast-dismiss'));
    expect(screen.queryByTestId('ion-toast')).not.toBeInTheDocument();
  });

  it('tracks which units the learner expands', () => {
    renderAccordion({ children: [unit('u1', [leaf('l1')]), unit('u2', [leaf('l2')])] });
    expect(screen.getByTestId('accordion-u1')).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByTestId('accordion-u2')).toHaveAttribute('data-expanded', 'false');

    act(() => groupOnChange?.({ detail: { value: ['u2'] } }));
    expect(screen.getByTestId('accordion-u1')).toHaveAttribute('data-expanded', 'false');
    expect(screen.getByTestId('accordion-u2')).toHaveAttribute('data-expanded', 'true');
  });

  it('falls back to a positional name for an unnamed unit', () => {
    renderAccordion({ children: [unit('u1', [leaf('l1')], { name: undefined as any })] });
    expect(screen.getByText('Unit 1')).toBeInTheDocument();
  });
});
