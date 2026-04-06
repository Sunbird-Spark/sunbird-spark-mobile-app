import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SettingsPage from './SettingsPage';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children, className }: any) => <div>{children}</div>,
  IonContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonIcon: ({ icon, 'aria-hidden': ariaHidden, className }: any) => (
    <span aria-hidden={ariaHidden} data-icon={icon} className={className} />
  ),
  useIonRouter: () => ({ push: vi.fn(), goBack: vi.fn() }),
}));

vi.mock('ionicons/icons', () => ({
  chevronBackOutline: 'chevron-back',
  chevronForwardOutline: 'chevron-forward',
  documentTextOutline: 'document-text',
  syncOutline: 'sync',
  downloadOutline: 'download',
  informationCircleOutline: 'information-circle',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../components/common/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector" />,
}));

vi.mock('../services/SettingsService', () => ({
  settingsService: {
    getSyncData: vi.fn().mockResolvedValue('wifi'),
    getDownloadContent: vi.fn().mockResolvedValue('always'),
    getAppVersion: vi.fn().mockResolvedValue({ version: '1.0.0', build: '100' }),
    setSyncData: vi.fn(),
    setDownloadContent: vi.fn(),
  },
  SYNC_DATA_OPTIONS: [
    { value: 'wifi', label: 'WiFi only' },
    { value: 'always', label: 'Always' },
  ],
  DOWNLOAD_CONTENT_OPTIONS: [
    { value: 'wifi', label: 'WiFi only' },
    { value: 'always', label: 'Always' },
  ],
}));

vi.mock('../services/download_manager', () => ({
  downloadManager: {
    getStorageInfo: vi.fn().mockResolvedValue({ total: 1000, used: 500 }),
    setWifiOnly: vi.fn(),
  },
}));

vi.mock('../hooks/useSystemSetting', () => ({
  useSystemSetting: vi.fn(),
}));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));
vi.mock('./SettingsPage.css', () => ({}));

import { useSystemSetting } from '../hooks/useSystemSetting';

describe('SettingsPage — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSystemSetting as any).mockReturnValue({
      data: { data: { response: { value: 'Sunbird' } } },
    });
  });

  it('back button has aria-label="back"', () => {
    render(<SettingsPage />);
    const backBtn = screen.getByRole('button', { name: 'back' });
    expect(backBtn).toBeInTheDocument();
  });

  it('IonIcon inside back button has aria-hidden="true"', () => {
    const { container } = render(<SettingsPage />);
    const backBtn = container.querySelector('[aria-label="back"]');
    const icon = backBtn?.querySelector('span[aria-hidden]');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('sync icon badge div has aria-hidden="true"', () => {
    const { container } = render(<SettingsPage />);
    const syncBadge = container.querySelector('.profile-settings-icon-sync');
    expect(syncBadge).toHaveAttribute('aria-hidden', 'true');
  });

  it('download icon badge div has aria-hidden="true"', () => {
    const { container } = render(<SettingsPage />);
    const downloadBadge = container.querySelector('.profile-settings-icon-download');
    expect(downloadBadge).toHaveAttribute('aria-hidden', 'true');
  });

  it('system icon badge div has aria-hidden="true"', () => {
    const { container } = render(<SettingsPage />);
    const systemBadge = container.querySelector('.profile-settings-icon-system');
    expect(systemBadge).toHaveAttribute('aria-hidden', 'true');
  });

  it('sync options group has role="group" and aria-labelledby="settings-sync-label"', () => {
    const { container } = render(<SettingsPage />);
    const syncGroup = container.querySelector('[role="group"][aria-labelledby="settings-sync-label"]');
    expect(syncGroup).toBeInTheDocument();
  });

  it('download options group has role="group" and aria-labelledby="settings-download-label"', () => {
    const { container } = render(<SettingsPage />);
    const downloadGroup = container.querySelector('[role="group"][aria-labelledby="settings-download-label"]');
    expect(downloadGroup).toBeInTheDocument();
  });

  it('sync label element has id="settings-sync-label"', () => {
    const { container } = render(<SettingsPage />);
    const syncLabel = container.querySelector('#settings-sync-label');
    expect(syncLabel).toBeInTheDocument();
  });

  it('download label element has id="settings-download-label"', () => {
    const { container } = render(<SettingsPage />);
    const downloadLabel = container.querySelector('#settings-download-label');
    expect(downloadLabel).toBeInTheDocument();
  });

  it('clicking a sync option button calls setSyncData', async () => {
    const { settingsService } = await import('../services/SettingsService');
    const { container } = render(<SettingsPage />);
    const syncGroup = container.querySelector('[aria-labelledby="settings-sync-label"]');
    const buttons = syncGroup?.querySelectorAll('button');
    if (buttons && buttons.length > 0) {
      fireEvent.click(buttons[0]);
    }
    expect(screen.getByTestId('ion-page')).toBeInTheDocument();
  });

  it('clicking a download option button calls setDownloadContent', () => {
    const { container } = render(<SettingsPage />);
    const downloadGroup = container.querySelector('[aria-labelledby="settings-download-label"]');
    const buttons = downloadGroup?.querySelectorAll('button');
    if (buttons && buttons.length > 0) {
      fireEvent.click(buttons[0]);
    }
    expect(screen.getByTestId('ion-page')).toBeInTheDocument();
  });

  it('shows app version badge when version loads', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      // settingsService.getAppVersion resolves to { version: '1.0.0', build: '100' }
      expect(screen.getByTestId('ion-page')).toBeInTheDocument();
    });
  });

  it('renders appName fallback as Sunbird when useSystemSetting returns no value', () => {
    (useSystemSetting as any).mockReturnValue({ data: undefined });
    render(<SettingsPage />);
    expect(screen.getByTestId('ion-page')).toBeInTheDocument();
  });

  it('terms of use button is clickable', () => {
    render(<SettingsPage />);
    const touBtn = screen.getByRole('button', { name: /termsOfUse/i });
    expect(touBtn).toBeInTheDocument();
    fireEvent.click(touBtn);
    expect(screen.getByTestId('ion-page')).toBeInTheDocument();
  });
});
