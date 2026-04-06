import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SignInPage from './SignInPage';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children, className }: any) => <div data-testid="ion-header" className={className}>{children}</div>,
  IonToolbar: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonButtons: ({ children, slot }: any) => <div data-slot={slot}>{children}</div>,
  IonBackButton: ({ defaultHref, text, icon, className }: any) => (
    <button data-testid="ion-back-button" className={className} />
  ),
  IonContent: ({ children, fullscreen, className }: any) => (
    <div data-testid="ion-content" className={className}>{children}</div>
  ),
  IonSpinner: () => <span data-testid="ion-spinner" />,
  IonIcon: ({ icon }: any) => <span data-testid="ion-icon" data-icon={icon} />,
  IonToast: ({ isOpen, message, onDidDismiss }: any) =>
    isOpen ? <div data-testid="ion-toast">{message}</div> : null,
  useIonRouter: () => ({ push: vi.fn() }),
}));

vi.mock('ionicons/icons', () => ({
  eyeOutline: 'eye-outline',
  eyeOffOutline: 'eye-off-outline',
  chevronBackOutline: 'chevron-back',
}));

vi.mock('../assets/sunbird-logo-new.svg', () => ({ default: 'sunbird-logo.svg' }));
vi.mock('./SignInPage.css', () => ({}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../providers/NetworkProvider', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/AuthWebviewService', () => ({
  authWebviewService: {
    openForgotPassword: vi.fn(),
    openRegistration: vi.fn(),
  },
}));

vi.mock('../hooks/useImpression', () => ({
  default: vi.fn(),
}));

import { useNetwork } from '../providers/NetworkProvider';
import { useAuth } from '../contexts/AuthContext';

describe('SignInPage — accessibility', () => {
  const mockLoginWithCredentials = vi.fn();
  const mockLoginWithGoogle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNetwork as any).mockReturnValue({ isOffline: false });
    (useAuth as any).mockReturnValue({
      loginWithCredentials: mockLoginWithCredentials,
      loginWithGoogle: mockLoginWithGoogle,
    });
  });

  it('email input has associated label via htmlFor/id', () => {
    render(<SignInPage />);
    const emailInput = screen.getByLabelText('signInPage.emailOrMobile');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('id', 'sign-in-email');
  });

  it('password input has associated label via htmlFor/id', () => {
    render(<SignInPage />);
    const passwordInput = screen.getByLabelText('signInPage.password');
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('id', 'sign-in-password');
  });

  it('show/hide password button has aria-label', () => {
    render(<SignInPage />);
    expect(screen.getByRole('button', { name: 'signInPage.showPassword' })).toBeInTheDocument();
  });

  it('show/hide password button aria-label toggles when clicked', () => {
    render(<SignInPage />);
    const eyeBtn = screen.getByRole('button', { name: 'signInPage.showPassword' });
    fireEvent.click(eyeBtn);
    expect(screen.getByRole('button', { name: 'signInPage.hidePassword' })).toBeInTheDocument();
  });

  it('error message has role="alert" when login fails', async () => {
    mockLoginWithCredentials.mockRejectedValue(new Error('INVALID_CREDENTIALS'));
    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText('signInPage.emailOrMobile'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('signInPage.password'), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signInPage.login' }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });

  it('error message has aria-live="assertive"', async () => {
    mockLoginWithCredentials.mockRejectedValue(new Error('LOGIN_FAILED'));
    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText('signInPage.emailOrMobile'), {
      target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByLabelText('signInPage.password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signInPage.login' }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  it('login button is disabled when form fields are empty', () => {
    render(<SignInPage />);
    const loginBtn = screen.getByRole('button', { name: 'signInPage.login' });
    expect(loginBtn).toBeDisabled();
  });

  it('login button is enabled when both fields are filled', () => {
    render(<SignInPage />);
    fireEvent.change(screen.getByLabelText('signInPage.emailOrMobile'), {
      target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByLabelText('signInPage.password'), {
      target: { value: 'password' },
    });
    const loginBtn = screen.getByRole('button', { name: 'signInPage.login' });
    expect(loginBtn).not.toBeDisabled();
  });

  it('login form has aria-label for screen reader identification', () => {
    const { container } = render(<SignInPage />);
    const form = container.querySelector('form');
    expect(form).toHaveAttribute('aria-label', 'signInPage.login');
  });

  it('Google icon SVG is hidden from screen readers', () => {
    const { container } = render(<SignInPage />);
    const googleSvg = container.querySelector('.sign-in-google-btn svg');
    expect(googleSvg).toHaveAttribute('aria-hidden', 'true');
  });
});
