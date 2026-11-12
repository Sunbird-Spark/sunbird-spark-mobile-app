import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

let mockExecuteRecaptcha: ((action: string) => Promise<string>) | undefined;

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children }: any) => <div>{children}</div>,
  IonToolbar: ({ children }: any) => <div>{children}</div>,
  IonTitle: ({ children, className }: any) => <h1 className={className}>{children}</h1>,
  IonContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonButtons: ({ children, slot }: any) => <div data-slot={slot}>{children}</div>,
  IonBackButton: () => <button data-testid="ion-back-button" />,
  // Ionic can fire onDidDismiss for reasons outside our control (backdrop tap,
  // hardware back), so expose it independently of the open state.
  IonModal: ({ children, isOpen, onDidDismiss, className }: any) => (
    <div data-testid={`modal-${className}`}>
      <button data-testid={`dismiss-${className}`} onClick={onDidDismiss}>dismiss</button>
      {isOpen ? <div role="dialog" data-class={className}>{children}</div> : null}
    </div>
  ),
  IonToast: ({ isOpen, message, onDidDismiss }: any) =>
    isOpen ? (
      <div data-testid="ion-toast">
        {message}
        <button data-testid="toast-dismiss" onClick={onDidDismiss}>x</button>
      </div>
    ) : null,
}));

vi.mock('ionicons/icons', () => ({ chevronBackOutline: 'chevron-back' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, arg?: any) =>
      arg && typeof arg === 'object' ? `${key}:${JSON.stringify(arg)}` : key,
  }),
}));
vi.mock('react-google-recaptcha-v3', () => ({
  GoogleReCaptchaProvider: ({ children }: any) => <>{children}</>,
  useGoogleReCaptcha: () => ({ executeRecaptcha: mockExecuteRecaptcha }),
}));
vi.mock('./PersonalDetailsPage.css', () => ({}));

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useUser', () => ({ useUser: vi.fn() }));
vi.mock('../hooks/useEditProfile', () => ({ useEditProfile: vi.fn(), TriggerCaptcha: undefined }));
vi.mock('../hooks/useSystemSetting', () => ({ useSystemSetting: vi.fn() }));
vi.mock('../hooks/useTelemetry', () => ({ useTelemetry: vi.fn() }));
vi.mock('../providers/NetworkProvider', () => ({ useNetwork: vi.fn() }));
vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));

import PersonalDetailsPage from './PersonalDetailsPage';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../hooks/useUser';
import { useEditProfile } from '../hooks/useEditProfile';
import { useSystemSetting } from '../hooks/useSystemSetting';
import { useTelemetry } from '../hooks/useTelemetry';
import { useNetwork } from '../providers/NetworkProvider';

const editFns = {
  handleFieldChange: vi.fn(),
  handleVerifyDetails: vi.fn(),
  handleOtpChange: vi.fn(),
  handleSubmitOtp: vi.fn(),
  handleResendOtp: vi.fn(),
  resetOtpState: vi.fn(),
  resetEditData: vi.fn(),
};

const mockAudit = vi.fn();

const setEditHook = (overrides: Record<string, unknown> = {}) => {
  (useEditProfile as any).mockReturnValue({
    editData: { fullName: 'Test User', mobileNumber: '1234567890', emailId: 'a@b.com', alternateEmailId: '' },
    otpValue: Array(6).fill(''),
    otpStatus: 'idle',
    otpError: null,
    timer: 0,
    resendCount: 0,
    activeOtpField: null,
    ...editFns,
    ...overrides,
  });
};

const openEdit = () => fireEvent.click(screen.getByRole('button', { name: 'editProfile' }));
const openOtp = async () => {
  openEdit();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'verifyDetails' }));
  });
};
const otpBox = (n: number) => screen.getByLabelText(`digit ${n}`);

describe('PersonalDetailsPage — edit and OTP flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteRecaptcha = vi.fn().mockResolvedValue('captcha-token');
    editFns.handleVerifyDetails.mockResolvedValue(false);
    editFns.handleSubmitOtp.mockResolvedValue(false);
    editFns.handleResendOtp.mockResolvedValue(undefined);
    (useSystemSetting as any).mockReturnValue({ data: undefined });
    (useAuth as any).mockReturnValue({ userId: 'user1', isAuthenticated: true });
    (useUser as any).mockReturnValue({
      data: { firstName: 'Test', lastName: 'User', phone: '1234567890', email: 'a@b.com', recoveryEmail: '' },
    });
    (useTelemetry as any).mockReturnValue({ audit: mockAudit, interact: vi.fn() });
    (useNetwork as any).mockReturnValue({ isOffline: false });
    setEditHook();
  });

  describe('reCAPTCHA bridge handed to useEditProfile', () => {
    const triggerCaptcha = () => (useEditProfile as any).mock.calls[0][2];

    it('resolves a token and hands it to the caller', async () => {
      render(<PersonalDetailsPage />);
      const callback = vi.fn();
      await act(async () => { triggerCaptcha()(callback); });
      expect(mockExecuteRecaptcha).toHaveBeenCalledWith('otp_request');
      expect(callback).toHaveBeenCalledWith('captcha-token');
    });

    it('hands back null when reCAPTCHA is not available', async () => {
      mockExecuteRecaptcha = undefined;
      render(<PersonalDetailsPage />);
      const callback = vi.fn();
      await act(async () => { triggerCaptcha()(callback); });
      expect(callback).toHaveBeenCalledWith(null);
    });

    it('hands back null when reCAPTCHA execution fails', async () => {
      mockExecuteRecaptcha = vi.fn().mockRejectedValue(new Error('captcha down'));
      render(<PersonalDetailsPage />);
      const callback = vi.fn();
      await act(async () => { triggerCaptcha()(callback); });
      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('edit sheet', () => {
    it('resets the draft before opening', () => {
      render(<PersonalDetailsPage />);
      openEdit();
      expect(editFns.resetEditData).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('forwards edits to handleFieldChange keyed by field', () => {
      const { container } = render(<PersonalDetailsPage />);
      openEdit();
      fireEvent.change(container.querySelector('#pd-field-fullName')!, { target: { value: 'New Name' } });
      expect(editFns.handleFieldChange).toHaveBeenCalledWith('fullName', 'New Name');
    });

    it('clears the OTP state when closed by the close button', () => {
      render(<PersonalDetailsPage />);
      openEdit();
      fireEvent.click(screen.getByRole('button', { name: 'close' }));
      expect(editFns.resetOtpState).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('clears the OTP state when dismissed by Ionic', () => {
      render(<PersonalDetailsPage />);
      openEdit();
      fireEvent.click(screen.getByTestId('dismiss-pd-edit-modal'));
      expect(editFns.resetOtpState).toHaveBeenCalledTimes(1);
    });

    it('keeps the OTP state when the sheet closes because the OTP step is opening', async () => {
      editFns.handleVerifyDetails.mockResolvedValue(true);
      render(<PersonalDetailsPage />);
      await openOtp();
      fireEvent.click(screen.getByTestId('dismiss-pd-edit-modal'));
      expect(editFns.resetOtpState).not.toHaveBeenCalled();
    });

    it('refuses to verify and warns when the network drops while the sheet is open', async () => {
      const { rerender } = render(<PersonalDetailsPage />);
      openEdit();
      (useNetwork as any).mockReturnValue({ isOffline: true });
      rerender(<PersonalDetailsPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'verifyDetails' }));
      });
      expect(editFns.handleVerifyDetails).not.toHaveBeenCalled();
      expect(screen.getByTestId('ion-toast')).toHaveTextContent('profileOfflineEditMessage');
    });

    it('shows the offline warning toast and dismisses it', () => {
      (useNetwork as any).mockReturnValue({ isOffline: true });
      render(<PersonalDetailsPage />);
      openEdit();
      expect(screen.getByTestId('ion-toast')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('toast-dismiss'));
      expect(screen.queryByTestId('ion-toast')).toBeNull();
    });

    it('keeps the sheet open when verification errors out', async () => {
      setEditHook({ otpStatus: 'error', otpError: 'Invalid mobile number' });
      render(<PersonalDetailsPage />);
      await openOtp();
      expect(screen.getByRole('dialog')).toHaveAttribute('data-class', 'pd-edit-modal');
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid mobile number');
    });
  });

  describe('OTP sheet', () => {
    beforeEach(() => {
      editFns.handleVerifyDetails.mockResolvedValue(true);
    });

    it('forwards a typed digit and advances focus', async () => {
      render(<PersonalDetailsPage />);
      await openOtp();
      fireEvent.change(otpBox(1), { target: { value: '4' } });
      expect(editFns.handleOtpChange).toHaveBeenCalledWith(0, '4');
      expect(document.activeElement).toBe(otpBox(2));
    });

    it('does not advance focus past the last digit', async () => {
      render(<PersonalDetailsPage />);
      await openOtp();
      otpBox(6).focus();
      fireEvent.change(otpBox(6), { target: { value: '4' } });
      expect(editFns.handleOtpChange).toHaveBeenCalledWith(5, '4');
      expect(document.activeElement).toBe(otpBox(6));
    });

    it('steps focus back on backspace in an empty box', async () => {
      render(<PersonalDetailsPage />);
      await openOtp();
      otpBox(4).focus();
      fireEvent.keyDown(otpBox(4), { key: 'Backspace' });
      expect(document.activeElement).toBe(otpBox(3));
    });

    it('keeps focus on backspace when the box still holds a digit', async () => {
      setEditHook({ otpValue: ['1', '2', '3', '4', '', ''], activeOtpField: 'mobileNumber' });
      render(<PersonalDetailsPage />);
      await openOtp();
      otpBox(4).focus();
      fireEvent.keyDown(otpBox(4), { key: 'Backspace' });
      expect(document.activeElement).toBe(otpBox(4));
    });

    it('resends the code and refocuses the first box', async () => {
      render(<PersonalDetailsPage />);
      await openOtp();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'resendOtp' }));
      });
      expect(editFns.handleResendOtp).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(document.activeElement).toBe(otpBox(1)));
    });

    it('blocks resending until the countdown expires', async () => {
      setEditHook({ timer: 45, activeOtpField: 'mobileNumber' });
      render(<PersonalDetailsPage />);
      await openOtp();
      expect(screen.getByRole('button', { name: 'resendOtp' })).toBeDisabled();
      expect(screen.getByText('00:45')).toBeInTheDocument();
    });

    it('clears the OTP state when closed', async () => {
      render(<PersonalDetailsPage />);
      await openOtp();
      fireEvent.click(screen.getByRole('button', { name: 'close' }));
      expect(editFns.resetOtpState).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('closes, confirms and audits on a successful submission', async () => {
      setEditHook({
        otpValue: ['1', '2', '3', '4', '5', '6'],
        activeOtpField: 'mobileNumber',
        handleSubmitOtp: vi.fn().mockResolvedValue(true),
        handleVerifyDetails: vi.fn().mockResolvedValue(true),
      });
      render(<PersonalDetailsPage />);
      await openOtp();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'submit' }));
      });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByTestId('ion-toast')).toHaveTextContent('fieldUpdatedSuccessfully');
      expect(mockAudit).toHaveBeenCalledWith({
        edata: { props: ['profileDetails'], state: 'Updated' },
        object: { id: 'user1', type: 'User', ver: '1' },
      });
    });

    it('audits without a toast when no field was flagged as updated', async () => {
      setEditHook({
        otpValue: ['1', '2', '3', '4', '5', '6'],
        activeOtpField: null,
        handleSubmitOtp: vi.fn().mockResolvedValue(true),
        handleVerifyDetails: vi.fn().mockResolvedValue(true),
      });
      render(<PersonalDetailsPage />);
      await openOtp();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'submit' }));
      });
      expect(screen.queryByTestId('ion-toast')).toBeNull();
      expect(mockAudit).toHaveBeenCalledTimes(1);
    });

    it('keeps the sheet open and audits nothing when submission fails', async () => {
      setEditHook({
        otpValue: ['1', '2', '3', '4', '5', '6'],
        activeOtpField: 'emailId',
        handleSubmitOtp: vi.fn().mockResolvedValue(false),
        handleVerifyDetails: vi.fn().mockResolvedValue(true),
      });
      render(<PersonalDetailsPage />);
      await openOtp();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'submit' }));
      });
      expect(screen.getByRole('dialog')).toHaveAttribute('data-class', 'pd-otp-modal');
      expect(mockAudit).not.toHaveBeenCalled();
    });

    it('disables submit until the code is complete', async () => {
      render(<PersonalDetailsPage />);
      await openOtp();
      expect(screen.getByRole('button', { name: 'submit' })).toBeDisabled();
    });

    it('shows a verifying label while the code is checked', async () => {
      setEditHook({
        otpValue: ['1', '2', '3', '4', '5', '6'],
        otpStatus: 'verifying',
        handleVerifyDetails: vi.fn().mockResolvedValue(true),
      });
      render(<PersonalDetailsPage />);
      await openOtp();
      expect(screen.getByRole('button', { name: 'verifying' })).toBeDisabled();
    });
  });
});
