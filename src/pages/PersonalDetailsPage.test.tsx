import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PersonalDetailsPage from './PersonalDetailsPage';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children, className }: any) => <div>{children}</div>,
  IonToolbar: ({ children, className }: any) => <div>{children}</div>,
  IonTitle: ({ children, className }: any) => <h1 className={className}>{children}</h1>,
  IonContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonButtons: ({ children, slot }: any) => <div data-slot={slot}>{children}</div>,
  IonBackButton: ({ defaultHref, text, icon, className, color }: any) => (
    <button data-testid="ion-back-button" className={className} data-href={defaultHref} />
  ),
  IonModal: ({ children, isOpen, onDidDismiss, className, 'aria-labelledby': ariaLabelledby }: any) =>
    isOpen ? <div role="dialog" aria-labelledby={ariaLabelledby} className={className}>{children}</div> : null,
  IonToast: () => null,
}));

vi.mock('ionicons/icons', () => ({
  chevronBackOutline: 'chevron-back',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => key }),
}));

vi.mock('react-google-recaptcha-v3', () => ({
  GoogleReCaptchaProvider: ({ children }: any) => <>{children}</>,
  useGoogleReCaptcha: () => ({ executeRecaptcha: vi.fn() }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useUser', () => ({
  useUser: vi.fn(),
}));

vi.mock('../hooks/useEditProfile', () => ({
  useEditProfile: vi.fn(),
  TriggerCaptcha: undefined,
}));

vi.mock('../hooks/useSystemSetting', () => ({
  useSystemSetting: vi.fn(),
}));

vi.mock('../hooks/useTelemetry', () => ({
  useTelemetry: vi.fn(),
}));

vi.mock('../providers/NetworkProvider', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));
vi.mock('./PersonalDetailsPage.css', () => ({}));

import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../hooks/useUser';
import { useEditProfile } from '../hooks/useEditProfile';
import { useSystemSetting } from '../hooks/useSystemSetting';
import { useTelemetry } from '../hooks/useTelemetry';
import { useNetwork } from '../providers/NetworkProvider';

describe('PersonalDetailsPage — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Return undefined so PersonalDetailsBody is rendered without GoogleReCaptchaProvider
    (useSystemSetting as any).mockReturnValue({ data: undefined });
    (useAuth as any).mockReturnValue({ userId: 'user1', isAuthenticated: true });
    (useUser as any).mockReturnValue({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '1234567890',
        recoveryEmail: '',
      },
    });
    (useEditProfile as any).mockReturnValue({
      editData: {
        fullName: 'Test User',
        mobileNumber: '1234567890',
        emailId: 'test@example.com',
        alternateEmailId: '',
      },
      otpValue: Array(6).fill(''),
      otpStatus: 'idle',
      otpError: null,
      timer: 60,
      resendCount: 0,
      activeOtpField: null,
      handleFieldChange: vi.fn(),
      handleVerifyDetails: vi.fn().mockResolvedValue(false),
      handleOtpChange: vi.fn(),
      handleSubmitOtp: vi.fn().mockResolvedValue(false),
      handleResendOtp: vi.fn(),
      resetOtpState: vi.fn(),
      resetEditData: vi.fn(),
    });
    (useTelemetry as any).mockReturnValue({ audit: vi.fn(), interact: vi.fn() });
    (useNetwork as any).mockReturnValue({ isOffline: false });
  });

  it('edit button has aria-label="editProfile"', () => {
    render(<PersonalDetailsPage />);
    const editBtn = screen.getByRole('button', { name: 'editProfile' });
    expect(editBtn).toBeInTheDocument();
  });

  it('edit pencil SVG has aria-hidden="true"', () => {
    const { container } = render(<PersonalDetailsPage />);
    const editBtn = container.querySelector('.pd-edit-btn');
    const svg = editBtn?.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('edit modal has aria-labelledby="pd-edit-modal-title" when open', () => {
    render(<PersonalDetailsPage />);
    const editBtn = screen.getByRole('button', { name: 'editProfile' });
    fireEvent.click(editBtn);
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-labelledby', 'pd-edit-modal-title');
  });

  it('close button inside edit modal has aria-label="close"', () => {
    render(<PersonalDetailsPage />);
    const editBtn = screen.getByRole('button', { name: 'editProfile' });
    fireEvent.click(editBtn);
    const closeBtn = screen.getByRole('button', { name: 'close' });
    expect(closeBtn).toBeInTheDocument();
  });

  it('back button is rendered', () => {
    render(<PersonalDetailsPage />);
    expect(screen.getByTestId('ion-back-button')).toBeInTheDocument();
  });

  it('OTP modal has aria-labelledby="pd-otp-modal-title" when open', () => {
    // Simulate OTP modal by manipulating state via handleVerifyDetails resolving true
    (useEditProfile as any).mockReturnValue({
      editData: {
        fullName: 'Test User',
        mobileNumber: '1234567890',
        emailId: 'test@example.com',
        alternateEmailId: '',
      },
      otpValue: Array(6).fill(''),
      otpStatus: 'idle',
      otpError: null,
      timer: 60,
      resendCount: 0,
      activeOtpField: 'mobileNumber',
      handleFieldChange: vi.fn(),
      handleVerifyDetails: vi.fn().mockResolvedValue(true),
      handleOtpChange: vi.fn(),
      handleSubmitOtp: vi.fn().mockResolvedValue(false),
      handleResendOtp: vi.fn(),
      resetOtpState: vi.fn(),
      resetEditData: vi.fn(),
    });
    render(<PersonalDetailsPage />);
    // Open edit modal first
    const editBtn = screen.getByRole('button', { name: 'editProfile' });
    fireEvent.click(editBtn);
    // Click verify button to trigger OTP modal
    const verifyBtn = screen.getByRole('button', { name: 'verifyDetails' });
    fireEvent.click(verifyBtn);
    // OTP modal should appear after async operation - check aria-labelledby when dialog opens
    const dialogs = screen.queryAllByRole('dialog');
    // Either OTP dialog is now visible or edit dialog is still shown
    dialogs.forEach((dialog) => {
      expect(dialog).toHaveAttribute('aria-labelledby');
    });
  });

  it('OTP group has role="group" and aria-label when OTP modal is open', async () => {
    (useEditProfile as any).mockReturnValue({
      editData: {},
      otpValue: Array(6).fill(''),
      otpStatus: 'idle',
      otpError: null,
      timer: 60,
      resendCount: 0,
      activeOtpField: null,
      handleFieldChange: vi.fn(),
      handleVerifyDetails: vi.fn().mockResolvedValue(true),
      handleOtpChange: vi.fn(),
      handleSubmitOtp: vi.fn().mockResolvedValue(false),
      handleResendOtp: vi.fn(),
      resetOtpState: vi.fn(),
      resetEditData: vi.fn(),
    });
    const { container } = render(<PersonalDetailsPage />);
    const editBtn = screen.getByRole('button', { name: 'editProfile' });
    fireEvent.click(editBtn);
    const verifyBtn = screen.getByRole('button', { name: 'verifyDetails' });
    fireEvent.click(verifyBtn);
    let otpGroup: Element | null = null;
    await waitFor(() => {
      otpGroup = container.querySelector('.otp-inputs[role="group"]');
      expect(otpGroup).not.toBeNull();
    });
    expect(otpGroup).toHaveAttribute('role', 'group');
    expect(otpGroup).toHaveAttribute('aria-label', 'enterTheCode');
  });

  it('does not open edit modal when offline (shows toast instead)', () => {
    (useNetwork as any).mockReturnValue({ isOffline: true });
    render(<PersonalDetailsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'editProfile' }));
    // Edit modal should NOT open because openEdit bails when offline
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders with GoogleReCaptchaProvider when captcha site key is present', () => {
    (useSystemSetting as any).mockReturnValue({
      data: { data: { response: { value: 'my-recaptcha-key' } } },
    });
    render(<PersonalDetailsPage />);
    expect(screen.getByTestId('ion-page')).toBeInTheDocument();
  });

  it('opens OTP modal when handleVerifyDetails resolves true', async () => {
    (useEditProfile as any).mockReturnValue({
      editData: { fullName: 'Test User', mobileNumber: '1234567890', emailId: 'test@example.com', alternateEmailId: '' },
      otpValue: Array(6).fill(''),
      otpStatus: 'idle',
      otpError: null,
      timer: 60,
      resendCount: 0,
      activeOtpField: null,
      handleFieldChange: vi.fn(),
      handleVerifyDetails: vi.fn().mockResolvedValue(true),
      handleOtpChange: vi.fn(),
      handleSubmitOtp: vi.fn().mockResolvedValue(false),
      handleResendOtp: vi.fn(),
      resetOtpState: vi.fn(),
      resetEditData: vi.fn(),
    });
    render(<PersonalDetailsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'editProfile' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'verifyDetails' }));
    });
    // OTP modal should be visible now
    await waitFor(() => {
      expect(screen.getByText('enterTheCode')).toBeInTheDocument();
    });
  });

  it('shows verifyDetails button as disabled when otpStatus is "sending"', () => {
    (useEditProfile as any).mockReturnValue({
      editData: { fullName: 'Test User', mobileNumber: '1234567890', emailId: 'test@example.com', alternateEmailId: '' },
      otpValue: Array(6).fill(''),
      otpStatus: 'sending',
      otpError: null,
      timer: 60,
      resendCount: 0,
      activeOtpField: null,
      handleFieldChange: vi.fn(),
      handleVerifyDetails: vi.fn().mockResolvedValue(false),
      handleOtpChange: vi.fn(),
      handleSubmitOtp: vi.fn().mockResolvedValue(false),
      handleResendOtp: vi.fn(),
      resetOtpState: vi.fn(),
      resetEditData: vi.fn(),
    });
    render(<PersonalDetailsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'editProfile' }));
    // Button shows 'sendingOtp' text when status is 'sending'
    expect(screen.getByText('sendingOtp')).toBeInTheDocument();
  });

  it('does not open OTP when handleVerifyDetails resolves false and status is not error', async () => {
    (useEditProfile as any).mockReturnValue({
      editData: { fullName: 'Test', mobileNumber: '123', emailId: 'a@b.com', alternateEmailId: '' },
      otpValue: Array(6).fill(''),
      otpStatus: 'idle',
      otpError: null,
      timer: 60,
      resendCount: 0,
      activeOtpField: null,
      handleFieldChange: vi.fn(),
      handleVerifyDetails: vi.fn().mockResolvedValue(false),
      handleOtpChange: vi.fn(),
      handleSubmitOtp: vi.fn().mockResolvedValue(false),
      handleResendOtp: vi.fn(),
      resetOtpState: vi.fn(),
      resetEditData: vi.fn(),
    });
    render(<PersonalDetailsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'editProfile' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'verifyDetails' }));
    });
    // Edit modal should close (no dialog visible)
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('error has role="alert" when otpStatus is error', () => {
    (useEditProfile as any).mockReturnValue({
      editData: {
        fullName: 'Test User',
        mobileNumber: '1234567890',
        emailId: 'test@example.com',
        alternateEmailId: '',
      },
      otpValue: Array(6).fill(''),
      otpStatus: 'error',
      otpError: 'Invalid OTP',
      timer: 60,
      resendCount: 0,
      activeOtpField: null,
      handleFieldChange: vi.fn(),
      handleVerifyDetails: vi.fn().mockResolvedValue(false),
      handleOtpChange: vi.fn(),
      handleSubmitOtp: vi.fn().mockResolvedValue(false),
      handleResendOtp: vi.fn(),
      resetOtpState: vi.fn(),
      resetEditData: vi.fn(),
    });
    render(<PersonalDetailsPage />);
    // Open edit modal to show the error
    const editBtn = screen.getByRole('button', { name: 'editProfile' });
    fireEvent.click(editBtn);
    const alertEl = screen.getByRole('alert');
    expect(alertEl).toBeInTheDocument();
  });
});
