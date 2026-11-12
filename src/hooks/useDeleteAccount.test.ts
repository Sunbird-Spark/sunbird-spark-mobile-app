import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLogout, mockInteract, mockTelemetry } = vi.hoisted(() => ({
  mockLogout: vi.fn(),
  mockInteract: vi.fn(),
  mockTelemetry: { error: vi.fn(), audit: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../services/OtpService', () => ({
  otpService: { generate: vi.fn(), verify: vi.fn() },
}));

vi.mock('../services/UserService', () => ({
  userService: {
    deleteUser: vi.fn(),
    clearAccount: vi.fn(),
    checkEmailExists: vi.fn(),
  },
}));

vi.mock('../services/network/networkService', () => ({
  networkService: { isConnected: vi.fn() },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

vi.mock('./useTelemetry', () => ({
  useTelemetry: () => mockTelemetry,
}));

vi.mock('./useInteract', () => ({
  default: () => ({ interact: mockInteract }),
}));

import { useDeleteAccount, OTP_LENGTH } from './useDeleteAccount';
import { otpService } from '../services/OtpService';
import { userService } from '../services/UserService';
import { networkService } from '../services/network/networkService';

const USER_ID = 'user-1';
const EMAIL = 'learner@example.com';

function apiOk<T>(data: T) {
  return { data, status: 200, headers: {} };
}

type HookResult = { current: ReturnType<typeof useDeleteAccount> };

const checkAllConditions = (result: HookResult) => {
  act(() => {
    for (let i = 0; i < 7; i++) result.current.toggleCondition(i);
  });
};

const typeOtp = (result: HookResult, otp: string) => {
  act(() => {
    for (let i = 0; i < OTP_LENGTH; i++) result.current.handleOtpChange(i, otp[i]);
  });
};

const render = (userId: string | null = USER_ID, skipOtp = false) =>
  renderHook(() => useDeleteAccount(userId, skipOtp));

/** Drives the hook to the "OTP modal open" state so verify/resend can be tested. */
const reachOtpModal = async (result: HookResult) => {
  vi.mocked(userService.checkEmailExists).mockResolvedValue(
    apiOk({ exists: true, id: USER_ID }),
  );
  vi.mocked(otpService.generate).mockResolvedValue(apiOk({}));
  checkAllConditions(result);
  act(() => { result.current.handleEmailChange(EMAIL); });
  await act(async () => { await result.current.onSubmit(); });
  await waitFor(() => expect(result.current.showOtpModal).toBe(true));
};

describe('useDeleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(networkService.isConnected).mockReturnValue(true);
    vi.mocked(userService.deleteUser).mockResolvedValue(apiOk({}));
    vi.mocked(userService.clearAccount).mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
  });

  describe('initial state', () => {
    it('starts idle with empty email, no conditions checked and a blank OTP', () => {
      const { result } = render();

      expect(result.current.email).toBe('');
      expect(result.current.emailError).toBeNull();
      expect(result.current.allChecked).toBe(false);
      expect(result.current.otpValue).toEqual(Array(OTP_LENGTH).fill(''));
      expect(result.current.otpStatus).toBe('idle');
      expect(result.current.showOtpModal).toBe(false);
      expect(result.current.showConfirmAlert).toBe(false);
      expect(result.current.otpContact).toBeNull();
      expect(result.current.timer).toBe(0);
    });
  });

  describe('email + conditions', () => {
    it('derives otpContact from the typed email', () => {
      const { result } = render();

      act(() => { result.current.handleEmailChange(EMAIL); });

      expect(result.current.email).toBe(EMAIL);
      expect(result.current.otpContact).toEqual({ key: EMAIL, type: 'email' });
    });

    it('clears an existing emailError when the user edits the field', async () => {
      const { result } = render();
      checkAllConditions(result);

      await act(async () => { await result.current.onSubmit(); });
      expect(result.current.emailError).toBe('deleteAccountEmailRequired');

      act(() => { result.current.handleEmailChange('a'); });
      expect(result.current.emailError).toBeNull();
    });

    it('toggles a condition on and off, and reports allChecked only at 7', () => {
      const { result } = render();

      act(() => { result.current.toggleCondition(0); });
      expect(result.current.checkedConditions.has(0)).toBe(true);
      expect(result.current.allChecked).toBe(false);

      act(() => { result.current.toggleCondition(0); });
      expect(result.current.checkedConditions.has(0)).toBe(false);

      checkAllConditions(result);
      expect(result.current.checkedConditions.size).toBe(7);
      expect(result.current.allChecked).toBe(true);
    });
  });

  describe('onSubmit guards', () => {
    it('blocks submission until every condition is accepted', async () => {
      const { result } = render();

      await act(async () => { await result.current.onSubmit(); });

      expect(result.current.pageError).toBe('acceptAllConditions');
      expect(networkService.isConnected).not.toHaveBeenCalled();
      expect(userService.checkEmailExists).not.toHaveBeenCalled();
    });

    it('blocks submission while offline and logs an interact event', async () => {
      vi.mocked(networkService.isConnected).mockReturnValue(false);
      const { result } = render();
      checkAllConditions(result);

      await act(async () => { await result.current.onSubmit(); });

      expect(result.current.pageError).toBe('deleteAccountOffline');
      expect(mockInteract).toHaveBeenCalledWith({
        id: 'delete-account-blocked-offline',
        pageid: 'DeleteAccountPage',
      });
      expect(otpService.generate).not.toHaveBeenCalled();
    });
  });

  describe('onSubmit — skipOtpVerification path', () => {
    it('opens the confirm alert instead of sending an OTP', async () => {
      const { result } = render(USER_ID, true);
      checkAllConditions(result);

      await act(async () => { await result.current.onSubmit(); });

      expect(result.current.showConfirmAlert).toBe(true);
      expect(otpService.generate).not.toHaveBeenCalled();
      expect(userService.checkEmailExists).not.toHaveBeenCalled();
      expect(mockInteract).toHaveBeenCalledWith({
        id: 'delete-account-submit',
        pageid: 'DeleteAccountPage',
      });
    });
  });

  describe('onSubmit — OTP path email validation', () => {
    it('requires an email', async () => {
      const { result } = render();
      checkAllConditions(result);

      await act(async () => { await result.current.onSubmit(); });

      expect(result.current.emailError).toBe('deleteAccountEmailRequired');
      expect(userService.checkEmailExists).not.toHaveBeenCalled();
    });

    it('rejects a malformed email before hitting the API', async () => {
      const { result } = render();
      checkAllConditions(result);
      act(() => { result.current.handleEmailChange('not-an-email'); });

      await act(async () => { await result.current.onSubmit(); });

      expect(result.current.emailError).toBe('deleteAccountEmailInvalid');
      expect(userService.checkEmailExists).not.toHaveBeenCalled();
    });

    it('surfaces "not found" when the account does not exist', async () => {
      vi.mocked(userService.checkEmailExists).mockResolvedValue(apiOk({ exists: false }));
      const { result } = render();
      checkAllConditions(result);
      act(() => { result.current.handleEmailChange(`  ${EMAIL}  `); });

      await act(async () => { await result.current.onSubmit(); });

      // trimmed before being sent to the API
      expect(userService.checkEmailExists).toHaveBeenCalledWith(EMAIL);
      expect(result.current.emailError).toBe('deleteAccountEmailNotFound');
      expect(otpService.generate).not.toHaveBeenCalled();
      expect(result.current.isCheckingEmail).toBe(false);
    });

    it('rejects an email that maps to a different userId', async () => {
      vi.mocked(userService.checkEmailExists).mockResolvedValue(
        apiOk({ exists: true, id: 'someone-else' }),
      );
      const { result } = render();
      checkAllConditions(result);
      act(() => { result.current.handleEmailChange(EMAIL); });

      await act(async () => { await result.current.onSubmit(); });

      expect(result.current.emailError).toBe('deleteAccountEmailMismatch');
      expect(mockTelemetry.error).toHaveBeenCalledWith({
        edata: { err: 'DELETE_ACCOUNT_EMAIL_MISMATCH', errtype: 'USER', stacktrace: '' },
      });
      expect(otpService.generate).not.toHaveBeenCalled();
    });

    it('accepts exists:true without an id (backend privacy config)', async () => {
      vi.mocked(userService.checkEmailExists).mockResolvedValue(apiOk({ exists: true }));
      vi.mocked(otpService.generate).mockResolvedValue(apiOk({}));
      const { result } = render();
      checkAllConditions(result);
      act(() => { result.current.handleEmailChange(EMAIL); });

      await act(async () => { await result.current.onSubmit(); });

      expect(otpService.generate).toHaveBeenCalled();
      expect(result.current.emailError).toBeNull();
    });

    it('surfaces a check failure and records telemetry', async () => {
      vi.mocked(userService.checkEmailExists).mockRejectedValue(new Error('boom'));
      const { result } = render();
      checkAllConditions(result);
      act(() => { result.current.handleEmailChange(EMAIL); });

      await act(async () => { await result.current.onSubmit(); });

      expect(result.current.emailError).toBe('deleteAccountEmailCheckFailed');
      expect(mockTelemetry.error).toHaveBeenCalledWith({
        edata: { err: 'USER_EXISTS_FAILED', errtype: 'SYSTEM', stacktrace: '' },
      });
      expect(result.current.isCheckingEmail).toBe(false);
    });
  });

  describe('onSubmit — OTP generation', () => {
    it('sends the OTP, opens the modal and starts the countdown', async () => {
      const { result } = render();
      await reachOtpModal(result);

      expect(otpService.generate).toHaveBeenCalledWith({
        request: { key: EMAIL, type: 'email', userId: USER_ID },
      });
      expect(result.current.otpStatus).toBe('otp-sent');
      expect(result.current.timer).toBeGreaterThan(0);
      expect(mockInteract).toHaveBeenCalledWith({
        id: 'delete-account-otp-sent',
        pageid: 'DeleteAccountPage',
      });
    });

    it('reports an OTP generation failure and keeps the modal closed', async () => {
      vi.mocked(userService.checkEmailExists).mockResolvedValue(
        apiOk({ exists: true, id: USER_ID }),
      );
      vi.mocked(otpService.generate).mockRejectedValue(new Error('smtp down'));
      const { result } = render();
      checkAllConditions(result);
      act(() => { result.current.handleEmailChange(EMAIL); });

      await act(async () => { await result.current.onSubmit(); });

      expect(result.current.otpStatus).toBe('error');
      expect(result.current.pageError).toBe('otpGenerateFailed');
      expect(result.current.showOtpModal).toBe(false);
      expect(mockTelemetry.error).toHaveBeenCalledWith({
        edata: { err: 'OTP_GENERATE_FAILED', errtype: 'SYSTEM', stacktrace: '' },
      });
    });

    it('errors when there is no userId to send the OTP for', async () => {
      vi.mocked(userService.checkEmailExists).mockResolvedValue(apiOk({ exists: true }));
      const { result } = render(null);
      checkAllConditions(result);
      act(() => { result.current.handleEmailChange(EMAIL); });

      await act(async () => { await result.current.onSubmit(); });

      expect(result.current.pageError).toBe('deleteAccountNoContact');
      expect(otpService.generate).not.toHaveBeenCalled();
    });
  });

  describe('handleOtpChange', () => {
    it('accepts digits and keeps only the last character typed', () => {
      const { result } = render();

      act(() => { result.current.handleOtpChange(0, '12'); });

      expect(result.current.otpValue[0]).toBe('2');
    });

    it('ignores non-numeric input', () => {
      const { result } = render();

      act(() => { result.current.handleOtpChange(1, 'a'); });

      expect(result.current.otpValue[1]).toBe('');
    });
  });

  describe('handleVerifyAndDelete', () => {
    it('blocks verification while offline', async () => {
      const { result } = render();
      await reachOtpModal(result);
      vi.mocked(networkService.isConnected).mockReturnValue(false);

      await act(async () => { await result.current.handleVerifyAndDelete(); });

      expect(result.current.otpError).toBe('deleteAccountOtpOffline');
      expect(otpService.verify).not.toHaveBeenCalled();
      expect(mockInteract).toHaveBeenCalledWith({
        id: 'delete-account-otp-blocked-offline',
        pageid: 'DeleteAccountPage',
      });
    });

    it('rejects an incomplete OTP', async () => {
      const { result } = render();
      await reachOtpModal(result);
      act(() => { result.current.handleOtpChange(0, '1'); });

      await act(async () => { await result.current.handleVerifyAndDelete(); });

      expect(result.current.otpError).toBe('otpIncomplete');
      expect(otpService.verify).not.toHaveBeenCalled();
    });

    it('verifies then deletes the account, cleans up and logs out', async () => {
      vi.mocked(otpService.verify).mockResolvedValue(apiOk({}));
      const { result } = render();
      await reachOtpModal(result);
      typeOtp(result, '123456');

      await act(async () => { await result.current.handleVerifyAndDelete(); });

      expect(otpService.verify).toHaveBeenCalledWith({
        request: { key: EMAIL, type: 'email', otp: '123456', userId: USER_ID },
      });
      expect(userService.deleteUser).toHaveBeenCalledWith(USER_ID);
      expect(userService.clearAccount).toHaveBeenCalled();
      expect(mockTelemetry.audit).toHaveBeenCalledWith({
        edata: { props: ['account'], state: 'Deleted' },
        object: { id: USER_ID, type: 'User', ver: '1' },
      });
      expect(mockLogout).toHaveBeenCalled();
      expect(result.current.showOtpModal).toBe(false);
      expect(result.current.checkedConditions.size).toBe(0);
    });

    it('still logs out when local cleanup fails', async () => {
      vi.mocked(otpService.verify).mockResolvedValue(apiOk({}));
      vi.mocked(userService.clearAccount).mockRejectedValue(new Error('sqlite locked'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = render();
      await reachOtpModal(result);
      typeOtp(result, '123456');

      await act(async () => { await result.current.handleVerifyAndDelete(); });

      expect(mockLogout).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('surfaces a delete failure after a successful OTP verification', async () => {
      vi.mocked(otpService.verify).mockResolvedValue(apiOk({}));
      vi.mocked(userService.deleteUser).mockRejectedValue(new Error('500'));
      const { result } = render();
      await reachOtpModal(result);
      typeOtp(result, '123456');

      await act(async () => { await result.current.handleVerifyAndDelete(); });

      expect(result.current.pageError).toBe('deleteAccountFailed');
      expect(result.current.otpStatus).toBe('error');
      expect(result.current.isDeleting).toBe(false);
      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockTelemetry.error).toHaveBeenCalledWith({
        edata: { err: 'DELETE_ACCOUNT_FAILED', errtype: 'SYSTEM', stacktrace: '' },
      });
    });

    it('locks out after the last attempt (remainingAttempt === 0)', async () => {
      vi.mocked(otpService.verify).mockRejectedValue({
        response: { data: { params: { remainingAttempt: 0 } } },
      });
      const { result } = render();
      await reachOtpModal(result);
      typeOtp(result, '000000');

      await act(async () => { await result.current.handleVerifyAndDelete(); });

      expect(result.current.maxAttemptsReached).toBe(true);
      expect(result.current.otpError).toBe('maxAttemptsReached');

      // subsequent attempts short-circuit without another API call
      vi.mocked(otpService.verify).mockClear();
      await act(async () => { await result.current.handleVerifyAndDelete(); });
      expect(otpService.verify).not.toHaveBeenCalled();
    });

    it('reports remaining attempts and clears the OTP boxes', async () => {
      vi.mocked(otpService.verify).mockRejectedValue({
        response: { data: { result: { remainingAttempt: 2 } } },
      });
      const { result } = render();
      await reachOtpModal(result);
      typeOtp(result, '111111');

      await act(async () => { await result.current.handleVerifyAndDelete(); });

      expect(result.current.remainingAttempts).toBe(2);
      expect(result.current.otpValue).toEqual(Array(OTP_LENGTH).fill(''));
      expect(result.current.otpError).toBe('otpRemainingAttempts');
      expect(result.current.maxAttemptsReached).toBe(false);
    });

    it('maps the wrong-OTP error code to a contact-specific message', async () => {
      vi.mocked(otpService.verify).mockRejectedValue({
        response: { data: { params: { err: 'UOS_OTPVERFY0063' } } },
      });
      const { result } = render();
      await reachOtpModal(result);
      typeOtp(result, '222222');

      await act(async () => { await result.current.handleVerifyAndDelete(); });

      expect(result.current.otpError).toBe('otpWrong_email');
      expect(result.current.otpStatus).toBe('error');
    });

    it('falls back to a generic verify error', async () => {
      vi.mocked(otpService.verify).mockRejectedValue(new Error('network'));
      const { result } = render();
      await reachOtpModal(result);
      typeOtp(result, '333333');

      await act(async () => { await result.current.handleVerifyAndDelete(); });

      expect(result.current.otpError).toBe('otpVerifyFailed');
      expect(mockTelemetry.error).toHaveBeenCalledWith({
        edata: { err: 'OTP_VERIFY_FAILED', errtype: 'SYSTEM', stacktrace: '' },
      });
    });
  });

  describe('handleResendOtp', () => {
    it('blocks a resend while offline', async () => {
      vi.mocked(networkService.isConnected).mockReturnValue(false);
      const { result } = render();

      await act(async () => { await result.current.handleResendOtp(); });

      expect(result.current.otpError).toBe('deleteAccountResendOffline');
      expect(otpService.generate).not.toHaveBeenCalled();
    });

    it('does nothing while the countdown is still running', async () => {
      const { result } = render();
      await reachOtpModal(result);
      vi.mocked(otpService.generate).mockClear();

      await act(async () => { await result.current.handleResendOtp(); });

      expect(otpService.generate).not.toHaveBeenCalled();
      expect(result.current.resendCount).toBe(0);
    });

    it('resends once the countdown has elapsed and bumps resendCount', async () => {
      vi.mocked(otpService.generate).mockResolvedValue(apiOk({}));
      const { result } = render();
      act(() => { result.current.handleEmailChange(EMAIL); });

      await act(async () => { await result.current.handleResendOtp(); });

      expect(result.current.resendCount).toBe(1);
      expect(otpService.generate).toHaveBeenCalledWith({
        request: { key: EMAIL, type: 'email', userId: USER_ID },
      });
      expect(result.current.otpValue).toEqual(Array(OTP_LENGTH).fill(''));
    });
  });

  describe('modal / alert lifecycle', () => {
    it('resetOtpModal clears the OTP modal state', async () => {
      const { result } = render();
      await reachOtpModal(result);
      typeOtp(result, '123456');

      act(() => { result.current.resetOtpModal(); });

      expect(result.current.showOtpModal).toBe(false);
      expect(result.current.otpValue).toEqual(Array(OTP_LENGTH).fill(''));
      expect(result.current.otpStatus).toBe('idle');
      expect(result.current.otpError).toBeNull();
      expect(result.current.timer).toBe(0);
      expect(result.current.resendCount).toBe(0);
      expect(result.current.remainingAttempts).toBeNull();
      expect(result.current.maxAttemptsReached).toBe(false);
    });

    it('dismissConfirmAlert closes the alert without deleting', async () => {
      const { result } = render(USER_ID, true);
      checkAllConditions(result);
      await act(async () => { await result.current.onSubmit(); });
      expect(result.current.showConfirmAlert).toBe(true);

      act(() => { result.current.dismissConfirmAlert(); });

      expect(result.current.showConfirmAlert).toBe(false);
      expect(userService.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe('confirmDirectDelete', () => {
    it('deletes and logs out on the happy path', async () => {
      const { result } = render(USER_ID, true);

      await act(async () => { await result.current.confirmDirectDelete(); });

      expect(result.current.showConfirmAlert).toBe(false);
      expect(userService.deleteUser).toHaveBeenCalledWith(USER_ID);
      expect(mockLogout).toHaveBeenCalled();
    });

    it('refuses to delete while offline', async () => {
      vi.mocked(networkService.isConnected).mockReturnValue(false);
      const { result } = render(USER_ID, true);

      await act(async () => { await result.current.confirmDirectDelete(); });

      expect(result.current.pageError).toBe('deleteAccountOffline');
      expect(userService.deleteUser).not.toHaveBeenCalled();
    });

    it('errors without a userId', async () => {
      const { result } = render(null, true);

      await act(async () => { await result.current.confirmDirectDelete(); });

      expect(result.current.pageError).toBe('deleteAccountFailed');
      expect(userService.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe('unmount', () => {
    it('stops applying state after unmount', async () => {
      let resolveDelete: (() => void) | undefined;
      vi.mocked(userService.deleteUser).mockImplementation(
        () => new Promise((res) => { resolveDelete = () => res(apiOk({})); }),
      );
      const { result, unmount } = render(USER_ID, true);

      let pending: Promise<void> | undefined;
      act(() => { pending = result.current.confirmDirectDelete(); });
      unmount();
      await act(async () => {
        resolveDelete?.();
        await pending;
      });

      // logout still runs, but no post-unmount state writes warned/threw
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
