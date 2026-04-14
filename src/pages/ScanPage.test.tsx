import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ScanPage from './ScanPage';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: any) => <div>{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  IonSpinner: () => <span data-testid="ion-spinner" />,
  IonAlert: ({ isOpen, header }: any) => isOpen ? <div role="alertdialog">{header}</div> : null,
}));

vi.mock('../components/layout/AppHeader', () => ({
  AppHeader: ({ title }: any) => <div data-testid="app-header">{title}</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));

vi.mock('../hooks/useQRScannerPreference', () => ({
  useQRScannerPreference: vi.fn(),
}));

vi.mock('../hooks/useDIALScanner', () => ({
  useDIALScanner: vi.fn(),
}));

import { useQRScannerPreference } from '../hooks/useQRScannerPreference';
import { useDIALScanner } from '../hooks/useDIALScanner';

describe('ScanPage — landmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useDIALScanner as any).mockReturnValue({ alertType: null, startScan: vi.fn(), dismissAlert: vi.fn() });
  });

  it('has a <main id="main-content"> landmark when loading', () => {
    (useQRScannerPreference as any).mockReturnValue({ isEnabled: false, isLoading: true });
    const { container } = render(<ScanPage />);
    expect(container.querySelector('main#main-content')).toBeInTheDocument();
  });

  it('has a <main id="main-content"> landmark when scanner is disabled', () => {
    (useQRScannerPreference as any).mockReturnValue({ isEnabled: false, isLoading: false });
    const { container } = render(<ScanPage />);
    expect(container.querySelector('main#main-content')).toBeInTheDocument();
  });

  it('has a <main id="main-content"> landmark when scanner is enabled', () => {
    (useQRScannerPreference as any).mockReturnValue({ isEnabled: true, isLoading: false });
    const { container } = render(<ScanPage />);
    expect(container.querySelector('main#main-content')).toBeInTheDocument();
  });

  it('shows disabled message inside main when scanner is off', () => {
    (useQRScannerPreference as any).mockReturnValue({ isEnabled: false, isLoading: false });
    const { container } = render(<ScanPage />);
    const main = container.querySelector('main#main-content')!;
    expect(main.textContent).toContain('scanPage.scannerDisabled');
  });

  it('shows start scanning button inside main when scanner is enabled', () => {
    (useQRScannerPreference as any).mockReturnValue({ isEnabled: true, isLoading: false });
    const { container } = render(<ScanPage />);
    const main = container.querySelector('main#main-content')!;
    expect(main.textContent).toContain('scanPage.startScanning');
  });
});
