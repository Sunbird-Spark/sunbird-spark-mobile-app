import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children }: any) => <div>{children}</div>,
  IonToolbar: ({ children }: any) => <div>{children}</div>,
  IonButtons: ({ children, slot }: any) => <div data-slot={slot}>{children}</div>,
  IonBackButton: () => <button data-testid="ion-back-button" />,
  IonContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonSpinner: () => <span data-testid="ion-spinner" />,
  IonIcon: ({ icon }: any) => <span data-testid="ion-icon" data-icon={icon} />,
  IonToast: ({ isOpen, message, onDidDismiss }: any) =>
    isOpen ? (
      <div data-testid="ion-toast">
        {message}
        <button data-testid="toast-dismiss" onClick={onDidDismiss}>x</button>
      </div>
    ) : null,
}));

vi.mock('ionicons/icons', () => ({
  eyeOutline: 'eye-outline',
  eyeOffOutline: 'eye-off-outline',
  chevronBackOutline: 'chevron-back',
}));
vi.mock('../constants/assets', () => ({ ASSETS: { SUNBIRD_LOGO: 'sunbird-logo.svg' } }));
vi.mock('./SignInPage.css', () => ({}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../providers/NetworkProvider', () => ({ useNetwork: vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../services/AuthWebviewService', () => ({
  authWebviewService: { openForgotPassword: vi.fn(), openRegistration: vi.fn() },
}));
vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));

import SignInPage from './SignInPage';
import { useNetwork } from '../providers/NetworkProvider';
import { useAuth } from '../contexts/AuthContext';
import { authWebviewService } from '../services/AuthWebviewService';

const mockLoginWithCredentials = vi.fn();
const mockLoginWithGoogle = vi.fn();

const fillCredentials = () => {
  fireEvent.change(screen.getByLabelText('signInPage.emailOrMobile'), { target: { value: 'user@test.com' } });
  fireEvent.change(screen.getByLabelText('signInPage.password'), { target: { value: 'secret' } });
};

const submitLogin = () => {
  fillCredentials();
  fireEvent.click(screen.getByRole('button', { name: 'signInPage.login' }));
};

const expectError = async (message: string) => {
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(message));
};

describe('SignInPage — error mapping and web-view flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNetwork as any).mockReturnValue({ isOffline: false });
    (useAuth as any).mockReturnValue({
      loginWithCredentials: mockLoginWithCredentials,
      loginWithGoogle: mockLoginWithGoogle,
    });
  });

  describe('credential login error mapping', () => {
    const cases: Array<[string, unknown, string]> = [
      ['a deleted account', new Error('USER_ACCOUNT_DELETED'), 'signInPage.accountDeleted'],
      ['an invalid_grant message', new Error('invalid_grant: bad password'), 'signInPage.invalidCredentials'],
      ['a blocked-account message', new Error('This account is blocked'), 'signInPage.accountBlocked'],
      ['a network failure', new Error('Network request failed'), 'signInPage.unableToConnect'],
      ['a timeout', new Error('Request timeout'), 'signInPage.unableToConnect'],
      ['a fetch failure', new Error('Failed to fetch'), 'signInPage.unableToConnect'],
      ['an unable-to-connect message', new Error('Unable to connect to server'), 'signInPage.unableToConnect'],
      ['an unrecognised message', new Error('kaboom'), 'signInPage.somethingWentWrong'],
      ['a non-Error rejection', 'plain string failure', 'signInPage.somethingWentWrong'],
    ];

    it.each(cases)('maps %s', async (_label, rejection, expected) => {
      mockLoginWithCredentials.mockRejectedValue(rejection);
      render(<SignInPage />);
      submitLogin();
      await expectError(expected);
    });

    it('maps the INVALID_CREDENTIALS code', async () => {
      const err = Object.assign(new Error('nope'), { code: 'INVALID_CREDENTIALS' });
      mockLoginWithCredentials.mockRejectedValue(err);
      render(<SignInPage />);
      submitLogin();
      await expectError('signInPage.invalidCredentials');
    });

    it('maps the USER_ACCOUNT_BLOCKED code', async () => {
      const err = Object.assign(new Error('nope'), { code: 'USER_ACCOUNT_BLOCKED' });
      mockLoginWithCredentials.mockRejectedValue(err);
      render(<SignInPage />);
      submitLogin();
      await expectError('signInPage.accountBlocked');
    });

    it('maps the LOGIN_FAILED code', async () => {
      const err = Object.assign(new Error('nope'), { code: 'LOGIN_FAILED' });
      mockLoginWithCredentials.mockRejectedValue(err);
      render(<SignInPage />);
      submitLogin();
      await expectError('signInPage.loginFailed');
    });

    it('trims the email before authenticating', async () => {
      mockLoginWithCredentials.mockResolvedValue(undefined);
      render(<SignInPage />);
      fireEvent.change(screen.getByLabelText('signInPage.emailOrMobile'), { target: { value: '  user@test.com  ' } });
      fireEvent.change(screen.getByLabelText('signInPage.password'), { target: { value: 'secret' } });
      fireEvent.click(screen.getByRole('button', { name: 'signInPage.login' }));
      await waitFor(() => expect(mockLoginWithCredentials).toHaveBeenCalledWith('user@test.com', 'secret'));
    });

    it('links the inputs to the error message once login fails', async () => {
      mockLoginWithCredentials.mockRejectedValue(new Error('kaboom'));
      render(<SignInPage />);
      submitLogin();
      await expectError('signInPage.somethingWentWrong');
      expect(screen.getByLabelText('signInPage.emailOrMobile')).toHaveAttribute('aria-describedby', 'signin-error');
      expect(screen.getByLabelText('signInPage.emailOrMobile')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('forgot-password web view', () => {
    it('warns instead of opening when offline', () => {
      (useNetwork as any).mockReturnValue({ isOffline: true });
      render(<SignInPage />);
      fireEvent.click(screen.getByRole('button', { name: 'signInPage.forgotPassword' }));
      expect(authWebviewService.openForgotPassword).not.toHaveBeenCalled();
      expect(screen.getByTestId('ion-toast')).toHaveTextContent('signInPage.checkInternet');
    });

    it('stays silent when the user cancels the browser', async () => {
      (authWebviewService.openForgotPassword as any).mockRejectedValue(new Error('User cancelled'));
      render(<SignInPage />);
      fireEvent.click(screen.getByRole('button', { name: 'signInPage.forgotPassword' }));
      await waitFor(() => expect(authWebviewService.openForgotPassword).toHaveBeenCalled());
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('reports an unopenable form', async () => {
      (authWebviewService.openForgotPassword as any).mockRejectedValue(new Error('form not configured'));
      render(<SignInPage />);
      fireEvent.click(screen.getByRole('button', { name: 'signInPage.forgotPassword' }));
      await expectError('signInPage.unableToOpen');
    });

    it('reports an unexpected failure', async () => {
      (authWebviewService.openForgotPassword as any).mockRejectedValue(new Error('boom'));
      render(<SignInPage />);
      fireEvent.click(screen.getByRole('button', { name: 'signInPage.forgotPassword' }));
      await expectError('signInPage.somethingWentWrong');
    });

    it('reports a non-Error rejection', async () => {
      (authWebviewService.openForgotPassword as any).mockRejectedValue({ reason: 'weird' });
      render(<SignInPage />);
      fireEvent.click(screen.getByRole('button', { name: 'signInPage.forgotPassword' }));
      await expectError('signInPage.somethingWentWrong');
    });
  });

  describe('registration web view', () => {
    it('warns instead of opening when offline', () => {
      (useNetwork as any).mockReturnValue({ isOffline: true });
      render(<SignInPage />);
      fireEvent.click(screen.getByRole('button', { name: 'signInPage.createAccount' }));
      expect(authWebviewService.openRegistration).not.toHaveBeenCalled();
      expect(screen.getByTestId('ion-toast')).toHaveTextContent('signInPage.checkInternet');
    });

    it('stays silent when the user cancels the browser', async () => {
      (authWebviewService.openRegistration as any).mockRejectedValue(new Error('cancelled by user'));
      render(<SignInPage />);
      fireEvent.click(screen.getByRole('button', { name: 'signInPage.createAccount' }));
      await waitFor(() => expect(authWebviewService.openRegistration).toHaveBeenCalled());
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('reports an unopenable registration form', async () => {
      (authWebviewService.openRegistration as any).mockRejectedValue(new Error('config missing'));
      render(<SignInPage />);
      fireEvent.click(screen.getByRole('button', { name: 'signInPage.createAccount' }));
      await expectError('signInPage.unableToOpenRegistration');
    });

    it('reports an unexpected failure', async () => {
      (authWebviewService.openRegistration as any).mockRejectedValue(new Error('boom'));
      render(<SignInPage />);
      fireEvent.click(screen.getByRole('button', { name: 'signInPage.createAccount' }));
      await expectError('signInPage.somethingWentWrong');
    });

    it('reports a non-Error rejection', async () => {
      (authWebviewService.openRegistration as any).mockRejectedValue(42);
      render(<SignInPage />);
      fireEvent.click(screen.getByRole('button', { name: 'signInPage.createAccount' }));
      await expectError('signInPage.somethingWentWrong');
    });
  });

  describe('Google sign-in', () => {
    const clickGoogle = () => fireEvent.click(screen.getByRole('button', { name: 'signInPage.signInWithGoogle' }));

    it('stays silent when the native chooser is cancelled by message', async () => {
      mockLoginWithGoogle.mockRejectedValue(new Error('The user canceled the sign-in flow'));
      render(<SignInPage />);
      clickGoogle();
      await waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalled());
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('stays silent when the native chooser reports status 12501', async () => {
      mockLoginWithGoogle.mockRejectedValue(new Error('Sign in failed: 12501'));
      render(<SignInPage />);
      clickGoogle();
      await waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalled());
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('stays silent for a plain object carrying code 12501', async () => {
      mockLoginWithGoogle.mockRejectedValue({ code: 12501 });
      render(<SignInPage />);
      clickGoogle();
      await waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalled());
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('reports a generic failure for a non-object rejection', async () => {
      mockLoginWithGoogle.mockRejectedValue('rejected');
      render(<SignInPage />);
      clickGoogle();
      await expectError('signInPage.googleSignInFailed');
    });

    it('reports a deleted account', async () => {
      mockLoginWithGoogle.mockRejectedValue(new Error('USER_ACCOUNT_DELETED'));
      render(<SignInPage />);
      clickGoogle();
      await expectError('signInPage.accountDeleted');
    });
  });

  describe('connectivity toasts', () => {
    it('announces that the connection is back and can be dismissed', async () => {
      (useNetwork as any).mockReturnValue({ isOffline: true });
      const { rerender } = render(<SignInPage />);
      expect(screen.queryByTestId('ion-toast')).toBeNull();

      (useNetwork as any).mockReturnValue({ isOffline: false });
      rerender(<SignInPage />);
      await waitFor(() => expect(screen.getByTestId('ion-toast')).toHaveTextContent('signInPage.backOnline'));

      fireEvent.click(screen.getByTestId('toast-dismiss'));
      expect(screen.queryByTestId('ion-toast')).toBeNull();
    });

    it('does not announce anything when the app starts online', () => {
      render(<SignInPage />);
      expect(screen.queryByTestId('ion-toast')).toBeNull();
    });
  });
});
