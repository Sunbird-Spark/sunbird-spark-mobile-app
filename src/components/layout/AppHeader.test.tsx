import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AppHeader } from './AppHeader';

const mockGoBack = vi.fn();
vi.mock('@ionic/react', () => ({
  IonHeader: ({ children, role, className }: any) => (
    <header role={role} className={className}>{children}</header>
  ),
  IonIcon: ({ icon }: any) => <span data-testid="ion-icon" data-icon={icon} />,
  useIonRouter: () => ({ goBack: mockGoBack }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        back: 'Back',
        skipToMainContent: 'Skip to main content',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('ionicons/icons', () => ({
  chevronBackOutline: 'chevron-back-outline',
}));

vi.mock('../common/LanguageSelector', () => ({
  LanguageSelector: () => <button data-testid="lang-selector" />,
}));
vi.mock('../common/Notification', () => ({
  default: () => <button data-testid="notification" />,
}));
vi.mock('../common/QRScanButton', () => ({
  QRScanButton: () => <button data-testid="qr-scan" />,
}));

describe('AppHeader — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders as a banner landmark', () => {
    render(<AppHeader title="Home" />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('contains a skip link pointing to #main-content', () => {
    render(<AppHeader title="Home" />);
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink.tagName).toBe('A');
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(skipLink).toHaveClass('skip-link');
  });

  it('skip link has correct text from i18n', () => {
    render(<AppHeader title="Profile" />);
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
  });

  it('renders the page title', () => {
    render(<AppHeader title="My Learning" />);
    expect(screen.getByText('My Learning')).toBeInTheDocument();
  });

  it('does not show back button by default', () => {
    render(<AppHeader title="Home" />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('shows back button when showBack is true', () => {
    render(<AppHeader title="Detail" showBack />);
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('back button calls router.goBack on click', () => {
    render(<AppHeader title="Detail" showBack />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows notification button when showNotifications is true', () => {
    render(<AppHeader title="Home" showNotifications />);
    expect(screen.getByTestId('notification')).toBeInTheDocument();
  });

  it('does not show notification button by default', () => {
    render(<AppHeader title="Home" />);
    expect(screen.queryByTestId('notification')).not.toBeInTheDocument();
  });

  it('shows QR scan button by default', () => {
    render(<AppHeader title="Home" />);
    expect(screen.getByTestId('qr-scan')).toBeInTheDocument();
  });

  it('hides QR scan button when showScan is false', () => {
    render(<AppHeader title="Home" showScan={false} />);
    expect(screen.queryByTestId('qr-scan')).not.toBeInTheDocument();
  });
});
