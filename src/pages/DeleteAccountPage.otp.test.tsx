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
  IonModal: ({ isOpen, children, canDismiss }: any) =>
    isOpen ? <div role="dialog" data-can-dismiss={String(canDismiss)}>{children}</div> : null,
  IonAlert: ({ isOpen, header, message, buttons, onDidDismiss }: any) =>
    isOpen ? (
      <div role="alertdialog" aria-label={header}>
        <p>{message}</p>
        {(buttons ?? []).map((b: any, i: number) => (
          <button key={i} data-role={b.role} onClick={() => b.handler?.()}>{b.text}</button>
        ))}
        <button data-testid="alert-backdrop-dismiss" onClick={onDidDismiss}>backdrop</button>
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

/** Hook state with the OTP modal open, since that is what this file exercises. */
const setOtpHook = (overrides: Record<string, unknown> = {}) => {
  (useDeleteAccount as any).mockReturnValue({
    email: 'me@example.com',
    emailError: null,
    isCheckingEmail: false,
    checkedConditions: new Set([0, 1, 2, 3, 4, 5, 6]),
    allChecked: true,
    otpValue: Array(6).fill(''),
    otpStatus: 'otp-sent',
    otpError: null,
    pageError: null,
    timer: 0,
    resendCount: 0,
    maxAttemptsReached: false,
    showOtpModal: true,
    showConfirmAlert: false,
    isDeleting: false,
    otpContact: { key: 'me@example.com', type: 'email' },
    ...hookFns,
    ...overrides,
  });
};

const otpBox = (n: number) => screen.getByLabelText(`digit ${n}`);
const confirmBtn = () => screen.getByRole('button', { name: /confirmDeletion|verifying/ });

describe('DeleteAccountPage — OTP modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookFns.handleResendOtp.mockResolvedValue(undefined);
    hookFns.handleVerifyAndDelete.mockResolvedValue(undefined);
    hookFns.confirmDirectDelete.mockResolvedValue(undefined);
    (useAuth as any).mockReturnValue({ userId: 'u1', isAuthenticated: true });
    (useUser as any).mockReturnValue({ data: { organisations: [], roles: [] } });
    (useNetwork as any).mockReturnValue({ isOffline: false });
    (useSystemSetting as any).mockReturnValue({ data: undefined });
    setOtpHook();
  });

  it('is not rendered while showOtpModal is false', () => {
    setOtpHook({ showOtpModal: false });
    render(<DeleteAccountPage />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders six OTP inputs labelled by position', () => {
    const { container } = render(<DeleteAccountPage />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(container.querySelectorAll('.otp-box')).toHaveLength(6);
    expect(otpBox(1)).toHaveAttribute('maxlength', '1');
    expect(container.querySelector('.otp-inputs')).toHaveAttribute('aria-label', 'enterTheCode');
  });

  it('shows contact-specific instructions for an email contact', () => {
    render(<DeleteAccountPage />);
    expect(screen.getByText('deleteAccountOtpInstructions_email')).toBeInTheDocument();
  });

  it('shows contact-specific instructions for a phone contact', () => {
    setOtpHook({ otpContact: { key: '9999999999', type: 'phone' } });
    render(<DeleteAccountPage />);
    expect(screen.getByText('deleteAccountOtpInstructions_phone')).toBeInTheDocument();
  });

  it('renders empty instructions when there is no OTP contact', () => {
    setOtpHook({ otpContact: null });
    const { container } = render(<DeleteAccountPage />);
    expect(container.querySelector('.da-otp-instructions')?.textContent).toBe('');
  });

  it('renders the OTP error as an alert', () => {
    setOtpHook({ otpError: 'otpWrong_email' });
    render(<DeleteAccountPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('otpWrong_email');
  });

  it('shows the digits supplied by the hook', () => {
    setOtpHook({ otpValue: ['1', '2', '3', '', '', ''] });
    render(<DeleteAccountPage />);
    expect(otpBox(1)).toHaveValue('1');
    expect(otpBox(3)).toHaveValue('3');
    expect(otpBox(4)).toHaveValue('');
  });

  describe('digit entry and focus movement', () => {
    it('forwards the typed digit to the hook and advances focus', () => {
      render(<DeleteAccountPage />);
      fireEvent.change(otpBox(1), { target: { value: '7' } });
      expect(hookFns.handleOtpChange).toHaveBeenCalledWith(0, '7');
      expect(document.activeElement).toBe(otpBox(2));
    });

    it('does not advance focus past the final box', () => {
      render(<DeleteAccountPage />);
      otpBox(6).focus();
      fireEvent.change(otpBox(6), { target: { value: '9' } });
      expect(hookFns.handleOtpChange).toHaveBeenCalledWith(5, '9');
      expect(document.activeElement).toBe(otpBox(6));
    });

    it('does not advance focus when the box is cleared', () => {
      setOtpHook({ otpValue: ['1', '', '', '', '', ''] });
      render(<DeleteAccountPage />);
      otpBox(1).focus();
      fireEvent.change(otpBox(1), { target: { value: '' } });
      expect(hookFns.handleOtpChange).toHaveBeenCalledWith(0, '');
      expect(document.activeElement).toBe(otpBox(1));
    });

    it('moves focus back on backspace in an empty box', () => {
      render(<DeleteAccountPage />);
      otpBox(3).focus();
      fireEvent.keyDown(otpBox(3), { key: 'Backspace' });
      expect(document.activeElement).toBe(otpBox(2));
    });

    it('keeps focus on backspace when the box still has a digit', () => {
      setOtpHook({ otpValue: ['1', '2', '3', '', '', ''] });
      render(<DeleteAccountPage />);
      otpBox(3).focus();
      fireEvent.keyDown(otpBox(3), { key: 'Backspace' });
      expect(document.activeElement).toBe(otpBox(3));
    });

    it('keeps focus on backspace in the first box', () => {
      render(<DeleteAccountPage />);
      otpBox(1).focus();
      fireEvent.keyDown(otpBox(1), { key: 'Backspace' });
      expect(document.activeElement).toBe(otpBox(1));
    });

    it('ignores non-backspace keys', () => {
      render(<DeleteAccountPage />);
      otpBox(3).focus();
      fireEvent.keyDown(otpBox(3), { key: 'ArrowLeft' });
      expect(document.activeElement).toBe(otpBox(3));
    });

    it('disables the inputs once the attempt limit is reached', () => {
      setOtpHook({ maxAttemptsReached: true });
      render(<DeleteAccountPage />);
      expect(otpBox(1)).toBeDisabled();
    });
  });

  describe('timer and resend', () => {
    it('formats the remaining time as mm:ss', () => {
      setOtpHook({ timer: 65 });
      const { container } = render(<DeleteAccountPage />);
      expect(container.querySelector('.otp-timer')?.textContent).toBe('01:05');
    });

    it('formats an expired timer as 00:00', () => {
      const { container } = render(<DeleteAccountPage />);
      expect(container.querySelector('.otp-timer')?.textContent).toBe('00:00');
    });

    it('disables resend while the timer is still running', () => {
      setOtpHook({ timer: 30 });
      render(<DeleteAccountPage />);
      expect(screen.getByRole('button', { name: 'resendOtp' })).toBeDisabled();
    });

    it('enables resend once the timer expires', () => {
      render(<DeleteAccountPage />);
      expect(screen.getByRole('button', { name: 'resendOtp' })).toBeEnabled();
    });

    it('reports the resend cap once it is reached', () => {
      setOtpHook({ resendCount: 4 });
      render(<DeleteAccountPage />);
      expect(screen.getByRole('button', { name: 'maxResendReached' })).toBeDisabled();
    });

    it('reports offline instead of resending when there is no network', () => {
      (useNetwork as any).mockReturnValue({ isOffline: true });
      render(<DeleteAccountPage />);
      expect(screen.getByRole('button', { name: 'resendOffline' })).toBeDisabled();
    });

    it('disables resend while an OTP is being verified', () => {
      setOtpHook({ otpStatus: 'verifying-otp' });
      render(<DeleteAccountPage />);
      expect(screen.getByRole('button', { name: 'resendOtp' })).toBeDisabled();
    });

    it('resends and returns focus to the first box when no digits were entered', async () => {
      render(<DeleteAccountPage />);
      fireEvent.click(screen.getByRole('button', { name: 'resendOtp' }));
      await waitFor(() => expect(hookFns.handleResendOtp).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(document.activeElement).toBe(otpBox(1)));
    });

    it('resends without stealing focus when digits are already entered', async () => {
      setOtpHook({ otpValue: ['1', '', '', '', '', ''] });
      render(<DeleteAccountPage />);
      const resend = screen.getByRole('button', { name: 'resendOtp' });
      resend.focus();
      fireEvent.click(resend);
      await waitFor(() => expect(hookFns.handleResendOtp).toHaveBeenCalledTimes(1));
      expect(document.activeElement).not.toBe(otpBox(1));
    });
  });

  describe('confirm deletion', () => {
    it('is disabled until all six digits are entered', () => {
      setOtpHook({ otpValue: ['1', '2', '3', '4', '5', ''] });
      render(<DeleteAccountPage />);
      expect(confirmBtn()).toBeDisabled();
    });

    it('is enabled with a complete code and triggers verification + deletion', async () => {
      setOtpHook({ otpValue: ['1', '2', '3', '4', '5', '6'] });
      render(<DeleteAccountPage />);
      expect(confirmBtn()).toBeEnabled();
      fireEvent.click(confirmBtn());
      await waitFor(() => expect(hookFns.handleVerifyAndDelete).toHaveBeenCalledTimes(1));
    });

    it('is disabled once the attempt limit is reached', () => {
      setOtpHook({ otpValue: ['1', '2', '3', '4', '5', '6'], maxAttemptsReached: true });
      render(<DeleteAccountPage />);
      expect(confirmBtn()).toBeDisabled();
    });

    it('shows a verifying label while the OTP is checked', () => {
      setOtpHook({ otpValue: ['1', '2', '3', '4', '5', '6'], otpStatus: 'verifying-otp' });
      render(<DeleteAccountPage />);
      expect(screen.getByRole('button', { name: 'verifying' })).toBeDisabled();
    });

    it('shows a verifying label while the account is being deleted', () => {
      setOtpHook({ otpValue: ['1', '2', '3', '4', '5', '6'], isDeleting: true });
      render(<DeleteAccountPage />);
      expect(screen.getByRole('button', { name: 'verifying' })).toBeDisabled();
    });
  });

  describe('closing the modal', () => {
    it('resets the OTP state when closed', () => {
      render(<DeleteAccountPage />);
      fireEvent.click(screen.getByRole('button', { name: 'close' }));
      expect(hookFns.resetOtpModal).toHaveBeenCalledTimes(1);
    });

    it('hides the close button and blocks dismissal while deleting', () => {
      setOtpHook({ isDeleting: true });
      render(<DeleteAccountPage />);
      expect(screen.queryByRole('button', { name: 'close' })).toBeNull();
      expect(screen.getByRole('dialog')).toHaveAttribute('data-can-dismiss', 'false');
    });
  });
});

describe('DeleteAccountPage — direct confirmation alert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookFns.confirmDirectDelete.mockResolvedValue(undefined);
    (useAuth as any).mockReturnValue({ userId: 'u1', isAuthenticated: true });
    (useUser as any).mockReturnValue({ data: { organisations: [], roles: [] } });
    (useNetwork as any).mockReturnValue({ isOffline: false });
    (useSystemSetting as any).mockReturnValue({ data: { data: { response: { value: 'false' } } } });
    setOtpHook({ showOtpModal: false, showConfirmAlert: true, otpContact: null });
  });

  it('is hidden until the hook asks for confirmation', () => {
    setOtpHook({ showOtpModal: false, showConfirmAlert: false });
    render(<DeleteAccountPage />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('shows the confirmation header and message', () => {
    render(<DeleteAccountPage />);
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-label', 'deleteAccountConfirmHeader');
    expect(screen.getByText('deleteAccountConfirmMessage')).toBeInTheDocument();
  });

  it('dismisses without deleting when cancelled', () => {
    const { container } = render(<DeleteAccountPage />);
    fireEvent.click(container.querySelector('[data-role="cancel"]')!);
    expect(hookFns.dismissConfirmAlert).toHaveBeenCalledTimes(1);
    expect(hookFns.confirmDirectDelete).not.toHaveBeenCalled();
  });

  it('clears the confirm state when the alert is dismissed outside of a button', () => {
    render(<DeleteAccountPage />);
    fireEvent.click(screen.getByTestId('alert-backdrop-dismiss'));
    expect(hookFns.dismissConfirmAlert).toHaveBeenCalledTimes(1);
    expect(hookFns.confirmDirectDelete).not.toHaveBeenCalled();
  });

  it('performs the deletion when confirmed', async () => {
    const { container } = render(<DeleteAccountPage />);
    fireEvent.click(container.querySelector('[data-role="destructive"]')!);
    await waitFor(() => expect(hookFns.confirmDirectDelete).toHaveBeenCalledTimes(1));
    expect(hookFns.dismissConfirmAlert).not.toHaveBeenCalled();
  });
});
