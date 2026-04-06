import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TermsAndConditionsPage from './TermsAndConditionsPage';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children, className }: any) => <div>{children}</div>,
  IonToolbar: ({ children, className }: any) => <div>{children}</div>,
  IonTitle: ({ children, className }: any) => <h1 className={className}>{children}</h1>,
  IonContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonFooter: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonButtons: ({ children, slot }: any) => <div data-slot={slot}>{children}</div>,
  IonButton: ({ children, onClick, className, 'aria-label': ariaLabel }: any) => (
    <button onClick={onClick} className={className} aria-label={ariaLabel}>{children}</button>
  ),
  IonIcon: ({ icon, slot }: any) => <span data-icon={icon} data-slot={slot} />,
  IonSpinner: ({ name }: any) => <span data-testid="ion-spinner" data-name={name} />,
  IonAlert: ({ isOpen, onDidDismiss, header, message, buttons }: any) =>
    isOpen ? <div role="alertdialog">{header}</div> : null,
  useIonRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('ionicons/icons', () => ({
  close: 'close-icon',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useTnC', () => ({
  useTnCAccept: vi.fn(),
}));

vi.mock('../hooks/useTelemetry', () => ({
  useTelemetry: vi.fn(),
}));

vi.mock('../components/common/PageLoader', () => ({
  default: ({ message, error }: any) =>
    message
      ? <div role="status" aria-live="polite">{message}</div>
      : error
        ? <div role="alert">{error}</div>
        : null,
}));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));
vi.mock('./TermsAndConditionsPage.css', () => ({}));

import { useAuth } from '../contexts/AuthContext';
import { useTnCAccept } from '../hooks/useTnC';
import { useTelemetry } from '../hooks/useTelemetry';

describe('TermsAndConditionsPage — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      tncData: {
        url: 'https://example.com/tnc',
        version: '3.5.0',
        isLatestVersionAccepted: false,
      },
      completeTnC: vi.fn(),
      userId: 'user1',
      isAuthenticated: true,
    });
    (useTnCAccept as any).mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    (useTelemetry as any).mockReturnValue({ audit: vi.fn() });
  });

  it('close button has aria-label="close"', () => {
    render(<TermsAndConditionsPage />);
    const closeBtn = screen.getByRole('button', { name: 'close' });
    expect(closeBtn).toBeInTheDocument();
  });

  it('renders nothing when tncData is null', () => {
    (useAuth as any).mockReturnValue({
      tncData: null,
      completeTnC: vi.fn(),
      userId: 'user1',
      isAuthenticated: true,
    });
    const { container } = render(<TermsAndConditionsPage />);
    expect(container.firstChild).toBeNull();
  });

  it('page title is rendered', () => {
    render(<TermsAndConditionsPage />);
    expect(screen.getByText('tnc.title')).toBeInTheDocument();
  });

  it('shows loading state initially (no footer, spinner in progress)', () => {
    render(<TermsAndConditionsPage />);
    // Footer is hidden when loading=true
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows footer after iframe loads', () => {
    const { container } = render(<TermsAndConditionsPage />);
    const iframe = container.querySelector('iframe');
    // Simulate iframe load
    if (iframe) fireEvent.load(iframe);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('accept button is disabled when checkbox not checked', () => {
    const { container } = render(<TermsAndConditionsPage />);
    const iframe = container.querySelector('iframe');
    if (iframe) fireEvent.load(iframe);
    const acceptBtn = screen.getByRole('button', { name: /tnc.continue/i });
    expect(acceptBtn).toBeDisabled();
  });

  it('accept button is enabled after checking agree checkbox', () => {
    const { container } = render(<TermsAndConditionsPage />);
    const iframe = container.querySelector('iframe');
    if (iframe) fireEvent.load(iframe);
    fireEvent.click(screen.getByRole('checkbox'));
    const acceptBtn = screen.getByRole('button', { name: /tnc.continue/i });
    expect(acceptBtn).not.toBeDisabled();
  });

  it('calls completeTnC on close button click', () => {
    const completeTnC = vi.fn();
    (useAuth as any).mockReturnValue({
      tncData: { url: 'https://example.com/tnc', version: '3.5.0' },
      completeTnC,
      userId: 'user1',
    });
    render(<TermsAndConditionsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(completeTnC).toHaveBeenCalled();
  });

  it('calls acceptTnC.mutateAsync and completeTnC on successful accept', async () => {
    const completeTnC = vi.fn();
    const mutateAsync = vi.fn().mockResolvedValue({});
    const audit = vi.fn().mockResolvedValue(undefined);
    (useAuth as any).mockReturnValue({
      tncData: { url: 'https://example.com/tnc', version: '3.5.0' },
      completeTnC,
      userId: 'user1',
    });
    (useTnCAccept as any).mockReturnValue({ mutateAsync, isPending: false });
    (useTelemetry as any).mockReturnValue({ audit });

    const { container } = render(<TermsAndConditionsPage />);
    const iframe = container.querySelector('iframe');
    if (iframe) fireEvent.load(iframe);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /tnc.continue/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ version: '3.5.0' });
      expect(completeTnC).toHaveBeenCalled();
    });
  });

  it('shows error alert when acceptTnC throws', async () => {
    const completeTnC = vi.fn();
    const mutateAsync = vi.fn().mockRejectedValue(new Error('network error'));
    (useAuth as any).mockReturnValue({
      tncData: { url: 'https://example.com/tnc', version: '3.5.0' },
      completeTnC,
      userId: 'user1',
    });
    (useTnCAccept as any).mockReturnValue({ mutateAsync, isPending: false });

    const { container } = render(<TermsAndConditionsPage />);
    const iframe = container.querySelector('iframe');
    if (iframe) fireEvent.load(iframe);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /tnc.continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  it('accept button shows spinner when isPending=true', () => {
    const { container } = render(<TermsAndConditionsPage />);
    const iframe = container.querySelector('iframe');
    if (iframe) fireEvent.load(iframe);
    // Update mock to isPending=true
    (useTnCAccept as any).mockReturnValue({ mutateAsync: vi.fn(), isPending: true });
    // Re-render with isPending true
    const { container: c2 } = render(<TermsAndConditionsPage />);
    const iframe2 = c2.querySelector('iframe');
    if (iframe2) fireEvent.load(iframe2);
    expect(c2.querySelector('[data-testid="ion-spinner"]')).toBeInTheDocument();
  });
});
