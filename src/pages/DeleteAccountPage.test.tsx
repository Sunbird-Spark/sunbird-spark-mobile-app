import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRouterPush = vi.fn();
const mockInteract = vi.fn();

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children }: any) => <div>{children}</div>,
  IonToolbar: ({ children }: any) => <div>{children}</div>,
  IonTitle: ({ children, className }: any) => <h1 className={className}>{children}</h1>,
  IonButtons: ({ children, slot }: any) => <div data-slot={slot}>{children}</div>,
  IonContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonIcon: ({ icon }: any) => <span data-testid="ion-icon" data-icon={icon} />,
  IonModal: ({ isOpen, children }: any) => (isOpen ? <div role="dialog">{children}</div> : null),
  IonAlert: ({ isOpen, header, message, buttons }: any) =>
    isOpen ? (
      <div role="alertdialog" aria-label={header}>
        <p>{message}</p>
        {(buttons ?? []).map((b: any, i: number) => (
          <button key={i} data-role={b.role} onClick={() => b.handler?.()}>{b.text}</button>
        ))}
      </div>
    ) : null,
  IonToast: ({ isOpen, message }: any) => (isOpen ? <div data-testid="ion-toast">{message}</div> : null),
  useIonRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('ionicons/icons', () => ({ chevronBackOutline: 'chevron-back' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('./PersonalDetailsPage.css', () => ({}));
vi.mock('./DeleteAccountPage.css', () => ({}));

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useUser', () => ({ useUser: vi.fn() }));
vi.mock('../hooks/useSystemSetting', () => ({ useSystemSetting: vi.fn() }));
vi.mock('../hooks/useDeleteAccount', () => ({
  useDeleteAccount: vi.fn(),
  OTP_LENGTH: 6,
  MAX_RESEND: 4,
}));
vi.mock('../hooks/useInteract', () => ({ default: () => ({ interact: mockInteract }) }));
vi.mock('../providers/NetworkProvider', () => ({ useNetwork: vi.fn() }));
vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));

import DeleteAccountPage from './DeleteAccountPage';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../hooks/useUser';
import { useSystemSetting } from '../hooks/useSystemSetting';
import { useDeleteAccount } from '../hooks/useDeleteAccount';
import { useNetwork } from '../providers/NetworkProvider';
import useImpression from '../hooks/useImpression';

const hookFns = {
  handleEmailChange: vi.fn(),
  toggleCondition: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
  handleOtpChange: vi.fn(),
  handleVerifyAndDelete: vi.fn().mockResolvedValue(undefined),
  handleResendOtp: vi.fn().mockResolvedValue(undefined),
  resetOtpModal: vi.fn(),
  dismissConfirmAlert: vi.fn(),
  confirmDirectDelete: vi.fn().mockResolvedValue(undefined),
};

const baseHook = (overrides: Record<string, unknown> = {}) => ({
  email: '',
  emailError: null,
  isCheckingEmail: false,
  checkedConditions: new Set<number>(),
  allChecked: false,
  otpValue: Array(6).fill(''),
  otpStatus: 'idle',
  otpError: null,
  pageError: null,
  timer: 0,
  resendCount: 0,
  maxAttemptsReached: false,
  showOtpModal: false,
  showConfirmAlert: false,
  isDeleting: false,
  otpContact: null,
  ...hookFns,
  ...overrides,
});

/** Marks every condition checked so the submit button becomes enabled. */
const allConditionsChecked = {
  checkedConditions: new Set([0, 1, 2, 3, 4, 5, 6]),
  allChecked: true,
};

const setHook = (overrides: Record<string, unknown> = {}) => {
  (useDeleteAccount as any).mockReturnValue(baseHook(overrides));
};

const setSkipOtp = (skip: boolean) => {
  (useSystemSetting as any).mockReturnValue(
    skip ? { data: { data: { response: { value: 'false' } } } } : { data: undefined },
  );
};

describe('DeleteAccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookFns.onSubmit.mockResolvedValue(undefined);
    hookFns.confirmDirectDelete.mockResolvedValue(undefined);
    (useAuth as any).mockReturnValue({ userId: 'u1', isAuthenticated: true });
    (useUser as any).mockReturnValue({ data: { organisations: [], roles: [] } });
    (useNetwork as any).mockReturnValue({ isOffline: false });
    setSkipOtp(false);
    setHook();
  });

  describe('page setup', () => {
    it('records an impression for the delete-account page', () => {
      render(<DeleteAccountPage />);
      expect(useImpression).toHaveBeenCalledWith({ pageid: 'DeleteAccountPage', env: 'profile' });
    });

    it('sets the document title', () => {
      render(<DeleteAccountPage />);
      expect(document.title).toBe('deleteAccount');
    });

    it('passes the user id and OTP toggle to useDeleteAccount', () => {
      setSkipOtp(true);
      render(<DeleteAccountPage />);
      expect(useDeleteAccount).toHaveBeenCalledWith('u1', true);
    });

    it('navigates back to the profile page from the back button', () => {
      render(<DeleteAccountPage />);
      fireEvent.click(screen.getByRole('button', { name: 'back' }));
      expect(mockRouterPush).toHaveBeenCalledWith('/profile', 'back', 'pop');
    });
  });

  describe('access guards', () => {
    it('redirects unauthenticated users to sign-in', () => {
      (useAuth as any).mockReturnValue({ userId: null, isAuthenticated: false });
      render(<DeleteAccountPage />);
      expect(mockRouterPush).toHaveBeenCalledWith('/sign-in', 'root', 'replace');
    });

    it('does not redirect an authenticated learner', () => {
      render(<DeleteAccountPage />);
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('redirects ORG_ADMIN users (role objects on organisations) back to profile', () => {
      (useUser as any).mockReturnValue({
        data: { organisations: [{ roles: [{ role: 'ORG_ADMIN' }] }], roles: [] },
      });
      render(<DeleteAccountPage />);
      expect(mockRouterPush).toHaveBeenCalledWith('/profile', 'back', 'pop');
    });

    it('redirects ORG_ADMIN users (plain string roles) back to profile', () => {
      (useUser as any).mockReturnValue({ data: { roles: ['ORG_ADMIN'] } });
      render(<DeleteAccountPage />);
      expect(mockRouterPush).toHaveBeenCalledWith('/profile', 'back', 'pop');
    });

    it('does not redirect for a non-admin role', () => {
      (useUser as any).mockReturnValue({ data: { roles: ['PUBLIC'] } });
      render(<DeleteAccountPage />);
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('email confirmation field', () => {
    it('is rendered when OTP verification is required', () => {
      render(<DeleteAccountPage />);
      expect(screen.getByLabelText('deleteAccountEmailLabel')).toBeInTheDocument();
    });

    it('is hidden when the backend disables OTP verification', () => {
      setSkipOtp(true);
      render(<DeleteAccountPage />);
      expect(screen.queryByLabelText('deleteAccountEmailLabel')).toBeNull();
    });

    it('forwards typed input to handleEmailChange', () => {
      render(<DeleteAccountPage />);
      fireEvent.change(screen.getByLabelText('deleteAccountEmailLabel'), {
        target: { value: 'me@example.com' },
      });
      expect(hookFns.handleEmailChange).toHaveBeenCalledWith('me@example.com');
    });

    it('shows the email error as an alert and marks the field invalid', () => {
      setHook({ emailError: 'emailMismatch' });
      render(<DeleteAccountPage />);
      const input = screen.getByLabelText('deleteAccountEmailLabel');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'da-email-error');
      expect(screen.getByRole('alert')).toHaveTextContent('emailMismatch');
    });

    it('has no describedby when there is no error', () => {
      render(<DeleteAccountPage />);
      expect(screen.getByLabelText('deleteAccountEmailLabel')).not.toHaveAttribute('aria-describedby');
    });

    it('locks the field while the email is being checked', () => {
      setHook({ isCheckingEmail: true });
      render(<DeleteAccountPage />);
      expect(screen.getByLabelText('deleteAccountEmailLabel')).toBeDisabled();
    });

    it('locks the field while the OTP modal is open', () => {
      setHook({ showOtpModal: true, otpContact: { key: 'a@b.com', type: 'email' } });
      render(<DeleteAccountPage />);
      expect(screen.getByLabelText('deleteAccountEmailLabel')).toBeDisabled();
    });

    it('locks the field while an OTP is being sent', () => {
      setHook({ otpStatus: 'sending-otp' });
      render(<DeleteAccountPage />);
      expect(screen.getByLabelText('deleteAccountEmailLabel')).toBeDisabled();
    });
  });

  describe('conditions checklist', () => {
    it('renders every condition with a label bound to its checkbox', () => {
      render(<DeleteAccountPage />);
      for (let i = 1; i <= 7; i++) {
        expect(screen.getByLabelText(`deleteCondition${i}`)).toHaveAttribute('type', 'checkbox');
      }
    });

    it('reflects already-checked conditions from the hook', () => {
      setHook({ checkedConditions: new Set([0, 3]) });
      render(<DeleteAccountPage />);
      expect(screen.getByLabelText('deleteCondition1')).toBeChecked();
      expect(screen.getByLabelText('deleteCondition4')).toBeChecked();
      expect(screen.getByLabelText('deleteCondition2')).not.toBeChecked();
    });

    it('toggles a condition by its index', () => {
      render(<DeleteAccountPage />);
      fireEvent.click(screen.getByLabelText('deleteCondition3'));
      expect(hookFns.toggleCondition).toHaveBeenCalledWith(2);
    });

    it('disables the checkboxes while deletion is in flight', () => {
      setHook({ ...allConditionsChecked, isDeleting: true });
      render(<DeleteAccountPage />);
      expect(screen.getByLabelText('deleteCondition1')).toBeDisabled();
    });
  });

  describe('submit gating', () => {
    const submitBtn = () => screen.getByRole('button', { name: /deleteAccount|verifying/ });

    it('is disabled until all conditions are accepted', () => {
      setHook({ email: 'me@example.com' });
      render(<DeleteAccountPage />);
      expect(submitBtn()).toBeDisabled();
    });

    it('is disabled on the OTP path when the email is blank', () => {
      setHook({ ...allConditionsChecked, email: '   ' });
      render(<DeleteAccountPage />);
      expect(submitBtn()).toBeDisabled();
    });

    it('is enabled with no email when OTP verification is skipped', () => {
      setSkipOtp(true);
      setHook(allConditionsChecked);
      render(<DeleteAccountPage />);
      expect(submitBtn()).toBeEnabled();
    });

    it('is disabled and labelled offline when the device is offline', () => {
      (useNetwork as any).mockReturnValue({ isOffline: true });
      setHook({ ...allConditionsChecked, email: 'me@example.com' });
      render(<DeleteAccountPage />);
      const btn = screen.getByRole('button', { name: 'deleteAccountOfflineButton' });
      expect(btn).toBeDisabled();
    });

    it('shows the verifying label while the email is being checked', () => {
      setHook({ ...allConditionsChecked, email: 'me@example.com', isCheckingEmail: true });
      render(<DeleteAccountPage />);
      expect(screen.getByRole('button', { name: 'verifying' })).toBeDisabled();
    });

    it('is disabled while deletion is in flight', () => {
      setHook({ ...allConditionsChecked, email: 'me@example.com', isDeleting: true });
      render(<DeleteAccountPage />);
      expect(submitBtn()).toBeDisabled();
    });

    it('calls onSubmit when the form is complete and online', async () => {
      setHook({ ...allConditionsChecked, email: 'me@example.com' });
      render(<DeleteAccountPage />);
      fireEvent.click(submitBtn());
      await waitFor(() => expect(hookFns.onSubmit).toHaveBeenCalledTimes(1));
      expect(screen.queryByTestId('ion-toast')).toBeNull();
    });
  });

  describe('page-level error', () => {
    it('renders the page error as an alert', () => {
      setHook({ pageError: 'deleteAccountFailed' });
      render(<DeleteAccountPage />);
      expect(screen.getByRole('alert')).toHaveTextContent('deleteAccountFailed');
    });

    it('renders nothing when there is no page error', () => {
      const { container } = render(<DeleteAccountPage />);
      expect(container.querySelector('.da-page-error')).toBeNull();
    });
  });
});
