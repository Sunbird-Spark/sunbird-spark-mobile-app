import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonHeader: ({ children }: any) => <div>{children}</div>,
  IonToolbar: ({ children }: any) => <div>{children}</div>,
  IonTitle: ({ children }: any) => <h1>{children}</h1>,
  IonContent: ({ children }: any) => <div>{children}</div>,
  IonButtons: ({ children }: any) => <div>{children}</div>,
  IonBackButton: () => <button data-testid="ion-back-button" />,
  IonImg: ({ src, alt }: any) => <img src={src} alt={alt} />,
  IonAlert: ({ isOpen, header, message, buttons, onDidDismiss }: any) =>
    isOpen ? (
      <div data-testid="ion-alert" data-header={header}>
        <span data-testid="alert-message">{message}</span>
        <button data-testid="alert-dismiss" onClick={onDidDismiss}>dismiss</button>
        {buttons?.map((b: any) => (
          <button key={b.role} data-testid={`alert-${b.role}`} onClick={() => b.handler?.()}>{b.text}</button>
        ))}
      </div>
    ) : null,
  useIonRouter: () => ({ push: vi.fn(), goBack: vi.fn() }),
}));

vi.mock('ionicons/icons', () => ({ chevronBackOutline: 'chevron-back' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, p?: any) => (p ? `${k}|${Object.values(p).join(',')}` : k),
  }),
}));

const historyPush = vi.fn();
vi.mock('react-router', () => ({ useHistory: () => ({ push: historyPush }) }));

vi.mock('../services/db/ContentDbService', () => ({
  contentDbService: { getDownloadedContent: vi.fn() },
}));
vi.mock('../services/download_manager', () => ({
  downloadManager: { subscribe: vi.fn(() => vi.fn()) },
}));
vi.mock('../services/content/contentDeleteHelper', () => ({
  deleteDownloadedContent: vi.fn().mockResolvedValue({ deleted: true }),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { convertFileSrc: vi.fn((url: string) => `capacitor://${url}`) },
}));
vi.mock('../utils/placeholderImages', () => ({ getPlaceholderImage: () => 'placeholder.png' }));
vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));
vi.mock('./DownloadedContentsPage.css', () => ({}));

import DownloadedContentsPage from './DownloadedContentsPage';
import { contentDbService } from '../services/db/ContentDbService';
import { downloadManager } from '../services/download_manager';
import { deleteDownloadedContent } from '../services/content/contentDeleteHelper';

const entry = (over: Record<string, unknown> = {}) => ({
  identifier: 'do_123',
  server_data: JSON.stringify({ name: 'Test Content' }),
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
  size_on_device: 2048,
  pragma: '',
  manifest_version: '',
  dialcodes: '',
  child_nodes: '',
  primary_category: 'Learning Resource',
  ...over,
});

const load = async (entries: any[]) => {
  (contentDbService.getDownloadedContent as any).mockResolvedValue(entries);
  const view = render(<DownloadedContentsPage />);
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  return view;
};

const card = (container: HTMLElement) => container.querySelector('.dc-card') as HTMLElement;
const cardBody = (container: HTMLElement) => container.querySelector('.dc-card-body') as HTMLElement;

describe('DownloadedContentsPage — swipe to delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (downloadManager.subscribe as any).mockReturnValue(vi.fn());
    (deleteDownloadedContent as any).mockResolvedValue({ deleted: true });
  });

  it('reveals the delete action after a left swipe and suppresses the card tap', async () => {
    const { container } = await load([entry()]);

    fireEvent.touchStart(card(container), { touches: [{ clientX: 200 }] });
    fireEvent.touchMove(card(container), { touches: [{ clientX: 100 }] });
    expect(card(container)).toHaveStyle({ transform: 'translateX(-70px)' });

    fireEvent.touchEnd(card(container));
    expect(card(container)).toHaveStyle({ transform: 'translateX(-70px)' });

    fireEvent.click(cardBody(container));
    expect(historyPush).not.toHaveBeenCalled();
  });

  it('snaps back when the swipe is too short', async () => {
    const { container } = await load([entry()]);

    fireEvent.touchStart(card(container), { touches: [{ clientX: 200 }] });
    fireEvent.touchMove(card(container), { touches: [{ clientX: 190 }] });
    fireEvent.touchEnd(card(container));

    expect(card(container)).toHaveStyle({ transform: 'translateX(-0px)' });
    fireEvent.click(cardBody(container));
    expect(historyPush).toHaveBeenCalled();
  });

  it('ignores a right-swipe', async () => {
    const { container } = await load([entry()]);

    fireEvent.touchStart(card(container), { touches: [{ clientX: 100 }] });
    fireEvent.touchMove(card(container), { touches: [{ clientX: 200 }] });
    expect(card(container)).toHaveStyle({ transform: 'translateX(-0px)' });
  });

  it('ignores touch movement that never began with a touch start', async () => {
    const { container } = await load([entry()]);
    fireEvent.touchMove(card(container), { touches: [{ clientX: 10 }] });
    expect(card(container)).toHaveStyle({ transform: 'translateX(-0px)' });
  });

  it('supports the same gesture with a mouse drag', async () => {
    const { container } = await load([entry()]);

    fireEvent.mouseDown(card(container), { clientX: 200 });
    fireEvent.mouseMove(card(container), { clientX: 120 });
    expect(card(container)).toHaveStyle({ transform: 'translateX(-70px)' });

    fireEvent.mouseUp(card(container));
    expect(card(container)).toHaveStyle({ transform: 'translateX(-70px)' });
  });

  it('ignores mouse movement outside of a drag', async () => {
    const { container } = await load([entry()]);
    fireEvent.mouseMove(card(container), { clientX: 10 });
    expect(card(container)).toHaveStyle({ transform: 'translateX(-0px)' });
  });

  it('resets a right-dragging mouse gesture', async () => {
    const { container } = await load([entry()]);
    fireEvent.mouseDown(card(container), { clientX: 100 });
    fireEvent.mouseMove(card(container), { clientX: 200 });
    expect(card(container)).toHaveStyle({ transform: 'translateX(-0px)' });
  });

  it('settles the gesture when the pointer leaves the card mid-drag', async () => {
    const { container } = await load([entry()]);

    fireEvent.mouseDown(card(container), { clientX: 200 });
    fireEvent.mouseMove(card(container), { clientX: 120 });
    fireEvent.mouseLeave(card(container));
    expect(card(container)).toHaveStyle({ transform: 'translateX(-70px)' });

    // A second mouseleave with no drag in progress is a no-op.
    fireEvent.mouseLeave(card(container));
    expect(card(container)).toHaveStyle({ transform: 'translateX(-70px)' });
  });
});

describe('DownloadedContentsPage — delete and navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (downloadManager.subscribe as any).mockReturnValue(vi.fn());
    (deleteDownloadedContent as any).mockResolvedValue({ deleted: true });
  });

  it('deletes the selected entry and reloads the list', async () => {
    (contentDbService.getDownloadedContent as any).mockResolvedValue([entry()]);
    render(<DownloadedContentsPage />);
    await waitFor(() => expect(screen.getByText('Test Content')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('deleteItem|Test Content'));
    expect(screen.getByTestId('ion-alert')).toHaveAttribute('data-header', 'download.deleteTitle');
    expect(screen.getByTestId('alert-message')).toHaveTextContent('download.deleteMessage|Test Content');

    (contentDbService.getDownloadedContent as any).mockResolvedValue([]);
    await act(async () => { fireEvent.click(screen.getByTestId('alert-destructive')); });

    expect(deleteDownloadedContent).toHaveBeenCalledWith('do_123');
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(screen.queryByTestId('ion-alert')).not.toBeInTheDocument();
  });

  it('cancels the delete without touching the entry', async () => {
    await load([entry()]);
    fireEvent.click(screen.getByLabelText('deleteItem|Test Content'));
    fireEvent.click(screen.getByTestId('alert-cancel'));

    expect(deleteDownloadedContent).not.toHaveBeenCalled();
    expect(screen.queryByTestId('ion-alert')).not.toBeInTheDocument();
  });

  it('closes the confirmation when it is dismissed', async () => {
    await load([entry()]);
    fireEvent.click(screen.getByLabelText('deleteItem|Test Content'));
    fireEvent.click(screen.getByTestId('alert-dismiss'));
    expect(screen.queryByTestId('ion-alert')).not.toBeInTheDocument();
  });

  it('opens the delete confirmation from the keyboard', async () => {
    await load([entry()]);
    fireEvent.keyDown(screen.getByLabelText('deleteItem|Test Content'), { key: ' ' });
    expect(screen.getByTestId('ion-alert')).toBeInTheDocument();
  });

  it('ignores unrelated keys on the delete action', async () => {
    await load([entry()]);
    fireEvent.keyDown(screen.getByLabelText('deleteItem|Test Content'), { key: 'Escape' });
    expect(screen.queryByTestId('ion-alert')).not.toBeInTheDocument();
  });

  it('routes a collection entry to the collection page', async () => {
    await load([entry({ mime_type: 'application/vnd.ekstep.content-collection' })]);
    fireEvent.click(screen.getByLabelText('openItem|Test Content'));
    expect(historyPush).toHaveBeenCalledWith('/collection/do_123', {
      parentRoute: '/profile/downloaded-contents',
    });
  });

  it('routes a resource entry to the content player', async () => {
    await load([entry()]);
    fireEvent.click(screen.getByLabelText('openItem|Test Content'));
    expect(historyPush).toHaveBeenCalledWith('/content/do_123', {
      parentRoute: '/profile/downloaded-contents',
    });
  });

  it('opens an entry from the keyboard', async () => {
    await load([entry()]);
    fireEvent.keyDown(screen.getByLabelText('openItem|Test Content'), { key: 'Enter' });
    expect(historyPush).toHaveBeenCalledWith('/content/do_123', expect.anything());
  });

  it('ignores unrelated keys on the card body', async () => {
    await load([entry()]);
    fireEvent.keyDown(screen.getByLabelText('openItem|Test Content'), { key: 'x' });
    expect(historyPush).not.toHaveBeenCalled();
  });

  it('reloads the list on download manager state changes and unsubscribes on unmount', async () => {
    const unsub = vi.fn();
    (downloadManager.subscribe as any).mockReturnValue(unsub);
    const { unmount } = await load([entry()]);
    const notify = (downloadManager.subscribe as any).mock.calls[0][0];

    (contentDbService.getDownloadedContent as any).mockClear();
    await act(async () => { notify({ type: 'state_change', identifier: 'do_123' }); });
    await act(async () => { notify({ type: 'all_done' }); });
    await act(async () => { notify({ type: 'content_deleted', identifier: 'do_123' }); });
    expect(contentDbService.getDownloadedContent).toHaveBeenCalledTimes(3);

    await act(async () => { notify({ type: 'progress', identifier: 'do_123' }); });
    expect(contentDbService.getDownloadedContent).toHaveBeenCalledTimes(3);

    unmount();
    expect(unsub).toHaveBeenCalled();
  });
});

describe('DownloadedContentsPage — card metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (downloadManager.subscribe as any).mockReturnValue(vi.fn());
  });

  it('formats the size on device', async () => {
    await load([entry({ size_on_device: 2048 })]);
    expect(screen.getByText('2 KB')).toBeInTheDocument();
  });

  it('formats megabyte-scale sizes with one decimal', async () => {
    await load([entry({ size_on_device: 1_572_864 })]);
    expect(screen.getByText('1.5 MB')).toBeInTheDocument();
  });

  it('prefers the locally downloaded app icon', async () => {
    await load([entry({
      local_data: JSON.stringify({ name: 'Local Name', appIconLocal: 'appIcon.png' }),
      path: '/data/content/do_123/',
    })]);
    expect(screen.getByAltText('Test Content'))
      .toHaveAttribute('src', 'capacitor:///data/content/do_123/appIcon.png');
  });

  it('falls back to the server poster image when there is no local icon', async () => {
    await load([entry({
      server_data: JSON.stringify({ name: 'Test Content', posterImage: 'https://cdn/poster.png' }),
    })]);
    expect(screen.getByAltText('Test Content')).toHaveAttribute('src', 'https://cdn/poster.png');
  });

  it('falls back to a placeholder when no image is available', async () => {
    await load([entry()]);
    expect(screen.getByAltText('Test Content')).toHaveAttribute('src', 'placeholder.png');
  });

  it('uses the local name and description when the server data has none', async () => {
    await load([entry({
      server_data: '',
      local_data: JSON.stringify({ name: 'Local Only', description: 'From disk' }),
    })]);
    expect(screen.getByText('Local Only')).toBeInTheDocument();
  });

  it('falls back to the content type when there is no primary category', async () => {
    await load([entry({ primary_category: '', content_type: 'Resource' })]);
    expect(screen.getByText('Resource')).toBeInTheDocument();
  });

  it('falls back to a generic badge when neither category is set', async () => {
    await load([entry({ primary_category: '', content_type: '' })]);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
