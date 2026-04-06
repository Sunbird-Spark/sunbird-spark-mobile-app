import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TermsOfUsePage from './TermsOfUsePage';

const { mockRead } = vi.hoisted(() => ({
  mockRead: vi.fn(),
}));

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children, className }: any) => <div>{children}</div>,
  IonToolbar: ({ children, className }: any) => <div>{children}</div>,
  IonTitle: ({ children, className }: any) => <h1 className={className}>{children}</h1>,
  IonContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonButtons: ({ children, slot }: any) => <div data-slot={slot}>{children}</div>,
  IonBackButton: ({ defaultHref, icon, text, className, color }: any) => (
    <button data-testid="ion-back-button" className={className} data-href={defaultHref} />
  ),
}));

vi.mock('ionicons/icons', () => ({
  chevronBackOutline: 'chevron-back',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/SystemSettingService', () => ({
  SystemSettingService: vi.fn().mockImplementation(function () {
    return { read: mockRead };
  }),
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

describe('TermsOfUsePage — accessibility', () => {
  beforeEach(() => {
    mockRead.mockReset();
    mockRead.mockResolvedValue(null);
    (useAuth as any).mockReset();
    (useAuth as any).mockReturnValue({
      tncUrl: null,
      userId: 'u1',
      isAuthenticated: true,
    });
  });

  it('shows loading state with role="status" and aria-live="polite" on initial render', () => {
    render(<TermsOfUsePage />);
    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveAttribute('aria-live', 'polite');
  });

  it('shows not-available message when no URL resolves', async () => {
    render(<TermsOfUsePage />);
    // Wait for async effect: loading clears, "not available" div appears
    await waitFor(() => {
      expect(screen.getByText('tnc.notAvailable')).toBeInTheDocument();
    });
  });

  it('renders page title', () => {
    render(<TermsOfUsePage />);
    expect(screen.getByText('termsOfUse')).toBeInTheDocument();
  });

  it('renders back button', () => {
    render(<TermsOfUsePage />);
    expect(screen.getByTestId('ion-back-button')).toBeInTheDocument();
  });

  it('renders iframe when tncUrl is provided from AuthContext', async () => {
    (useAuth as any).mockReturnValue({
      tncUrl: 'https://example.com/tnc',
      userId: 'u1',
      isAuthenticated: true,
    });
    const { container } = render(<TermsOfUsePage />);
    await waitFor(() => {
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.getAttribute('src')).toBe('https://example.com/tnc');
    });
  });

  it('hides iframe while loading and shows after load event', async () => {
    (useAuth as any).mockReturnValue({
      tncUrl: 'https://example.com/tnc',
      userId: 'u1',
      isAuthenticated: true,
    });
    const { container } = render(<TermsOfUsePage />);
    await waitFor(() => {
      expect(container.querySelector('iframe')).toBeInTheDocument();
    });
    const iframe = container.querySelector('iframe')!;
    expect(iframe).toHaveStyle('display: none');
    fireEvent.load(iframe);
    expect(iframe).toHaveStyle('display: block');
  });

  it('loads url from system setting with JSON string value', async () => {
    mockRead.mockResolvedValue({
      data: {
        response: {
          value: JSON.stringify({
            latestVersion: '3.5.0',
            '3.5.0': { url: 'https://system.example.com/tnc' },
          }),
        },
      },
    });
    const { container } = render(<TermsOfUsePage />);
    await waitFor(() => {
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.getAttribute('src')).toBe('https://system.example.com/tnc');
    });
  });

  it('loads url from system setting with object value (data.value path)', async () => {
    mockRead.mockResolvedValue({
      data: {
        value: {
          latestVersion: '3.5.0',
          '3.5.0': { url: 'https://obj.example.com/tnc' },
        },
      },
    });
    const { container } = render(<TermsOfUsePage />);
    await waitFor(() => {
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.getAttribute('src')).toBe('https://obj.example.com/tnc');
    });
  });

  it('shows not-available when system setting has no latestVersion', async () => {
    mockRead.mockResolvedValue({
      data: { response: { value: { someOtherKey: {} } } },
    });
    render(<TermsOfUsePage />);
    await waitFor(() => {
      expect(screen.getByText('tnc.notAvailable')).toBeInTheDocument();
    });
  });

  it('shows not-available when system setting throws', async () => {
    mockRead.mockRejectedValue(new Error('network error'));
    render(<TermsOfUsePage />);
    await waitFor(() => {
      expect(screen.getByText('tnc.notAvailable')).toBeInTheDocument();
    });
  });

  it('shows not-available when JSON string cannot be parsed', async () => {
    mockRead.mockResolvedValue({
      data: { response: { value: 'not-valid-json' } },
    });
    render(<TermsOfUsePage />);
    await waitFor(() => {
      expect(screen.getByText('tnc.notAvailable')).toBeInTheDocument();
    });
  });
});
