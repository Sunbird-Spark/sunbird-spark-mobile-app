import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEditProfile } from './useEditProfile';
import type { TriggerCaptcha } from './useEditProfile';
import type { UserProfile } from '../types/userTypes';

vi.mock('../services/OtpService', () => ({
  otpService: {
    generate: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock('../services/UserService', () => ({
  userService: {
    updateUser: vi.fn(),
  },
}));

import { otpService } from '../services/OtpService';
import { userService } from '../services/UserService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockProfile: UserProfile = {
  firstName: 'John',
  lastName: 'Doe',
  phone: '9876543210',
  email: 'john@example.com',
  recoveryEmail: 'alt@example.com',
} as UserProfile;

const noopCaptcha: TriggerCaptcha = (cb) => cb(undefined);

describe('useEditProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs editData from profile on mount', async () => {
    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.editData.fullName).toBe('John Doe');
    });
    expect(result.current.editData.mobileNumber).toBe('9876543210');
    expect(result.current.editData.emailId).toBe('john@example.com');
    expect(result.current.editData.alternateEmailId).toBe('alt@example.com');
  });

  it('detects a modified OTP field and sends OTP', async () => {
    vi.mocked(otpService.generate).mockResolvedValue({ data: {}, status: 200, headers: {} });

    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.emailId).toBe('john@example.com'));

    act(() => {
      result.current.handleFieldChange('emailId', 'new@example.com');
    });

    await act(async () => {
      await result.current.handleVerifyDetails();
    });

    expect(otpService.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ key: 'new@example.com', type: 'email' }),
      }),
    );
    expect(result.current.otpStatus).toBe('sent');
    expect(result.current.activeOtpField).toBe('emailId');
  });

  it('does not open OTP when only name changed — saves directly', async () => {
    vi.mocked(userService.updateUser).mockResolvedValue({ data: {}, status: 200, headers: {} });

    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.fullName).toBe('John Doe'));

    act(() => {
      result.current.handleFieldChange('fullName', 'Jane Doe');
    });

    let shouldOpenOtp: boolean | undefined;
    await act(async () => {
      shouldOpenOtp = await result.current.handleVerifyDetails();
    });

    expect(shouldOpenOtp).toBe(false);
    expect(userService.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Jane', lastName: 'Doe' }),
    );
  });

  it('starts countdown timer after OTP is sent', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(otpService.generate).mockResolvedValue({ data: {}, status: 200, headers: {} });

      const { result } = renderHook(
        () => useEditProfile('user1', mockProfile, noopCaptcha),
        { wrapper: createWrapper() },
      );

      // Flush the profile useEffect
      await act(async () => { vi.runAllTicks(); });

      act(() => {
        result.current.handleFieldChange('mobileNumber', '1111111111');
      });

      await act(async () => {
        await result.current.handleVerifyDetails();
      });

      expect(result.current.timer).toBe(60);

      act(() => { vi.advanceTimersByTime(5000); });

      expect(result.current.timer).toBe(55);
    } finally {
      vi.useRealTimers();
    }
  });

  it('enforces resend limit of 4', async () => {
    vi.mocked(otpService.generate).mockResolvedValue({ data: {}, status: 200, headers: {} });

    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.mobileNumber).toBe('9876543210'));

    act(() => {
      result.current.handleFieldChange('mobileNumber', '1111111111');
    });

    // Initial send
    await act(async () => { await result.current.handleVerifyDetails(); });

    // Reset timer to 0 and resend 4 times (the max)
    for (let i = 0; i < 4; i++) {
      act(() => { result.current.resetOtpState(); });
      // Re-send to set activeOtpField back
      await act(async () => { await result.current.handleVerifyDetails(); });
    }

    // resendCount itself is incremented by handleResendOtp — test that directly
    // First let's do the proper resend flow
    act(() => { result.current.resetOtpState(); });
    await act(async () => { await result.current.handleVerifyDetails(); });

    expect(result.current.resendCount).toBe(0);

    // Resend up to the limit
    for (let i = 0; i < 4; i++) {
      await act(async () => { await result.current.handleResendOtp(); });
    }

    expect(result.current.resendCount).toBe(4);

    // A 5th resend should be a no-op
    const callsBefore = vi.mocked(otpService.generate).mock.calls.length;
    await act(async () => { await result.current.handleResendOtp(); });
    expect(vi.mocked(otpService.generate).mock.calls.length).toBe(callsBefore);
  });

  it('verifies OTP and sends update payload with changed fields', async () => {
    vi.mocked(otpService.generate).mockResolvedValue({ data: {}, status: 200, headers: {} });
    vi.mocked(otpService.verify).mockResolvedValue({ data: {}, status: 200, headers: {} });
    vi.mocked(userService.updateUser).mockResolvedValue({ data: {}, status: 200, headers: {} });

    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.mobileNumber).toBe('9876543210'));

    act(() => {
      result.current.handleFieldChange('mobileNumber', '1111111111');
      result.current.handleFieldChange('fullName', 'Jane Doe');
    });

    await act(async () => { await result.current.handleVerifyDetails(); });

    act(() => {
      ['1', '2', '3', '4', '5', '6'].forEach((d, i) => result.current.handleOtpChange(i, d));
    });

    let success: boolean | undefined;
    await act(async () => { success = await result.current.handleSubmitOtp(); });

    expect(success).toBe(true);
    expect(otpService.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ key: '1111111111', type: 'phone' }),
      }),
    );
    expect(userService.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user1', phone: '1111111111', firstName: 'Jane', lastName: 'Doe' }),
    );
  });

  it('sets error state when OTP generate fails', async () => {
    vi.mocked(otpService.generate).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.emailId).toBe('john@example.com'));

    act(() => { result.current.handleFieldChange('emailId', 'new@example.com'); });

    await act(async () => { await result.current.handleVerifyDetails(); });

    expect(result.current.otpStatus).toBe('error');
    expect(result.current.otpError).toBeTruthy();
  });

  it('sets error state when OTP verify fails', async () => {
    vi.mocked(otpService.generate).mockResolvedValue({ data: {}, status: 200, headers: {} });
    vi.mocked(otpService.verify).mockRejectedValue(new Error('invalid otp'));

    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.emailId).toBe('john@example.com'));

    act(() => { result.current.handleFieldChange('emailId', 'new@example.com'); });
    await act(async () => { await result.current.handleVerifyDetails(); });

    act(() => {
      ['1', '2', '3', '4', '5', '6'].forEach((d, i) => result.current.handleOtpChange(i, d));
    });

    let success: boolean | undefined;
    await act(async () => { success = await result.current.handleSubmitOtp(); });

    expect(success).toBe(false);
    expect(result.current.otpStatus).toBe('error');
    expect(result.current.otpError).toBeTruthy();
  });

  it('sets error state when updateUser fails after OTP verify', async () => {
    vi.mocked(otpService.generate).mockResolvedValue({ data: {}, status: 200, headers: {} });
    vi.mocked(otpService.verify).mockResolvedValue({ data: {}, status: 200, headers: {} });
    vi.mocked(userService.updateUser).mockRejectedValue(new Error('update failed'));

    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.mobileNumber).toBe('9876543210'));

    act(() => { result.current.handleFieldChange('mobileNumber', '1111111111'); });
    await act(async () => { await result.current.handleVerifyDetails(); });

    act(() => {
      ['1', '2', '3', '4', '5', '6'].forEach((d, i) => result.current.handleOtpChange(i, d));
    });

    let success: boolean | undefined;
    await act(async () => { success = await result.current.handleSubmitOtp(); });

    expect(success).toBe(false);
    expect(result.current.otpStatus).toBe('error');
    expect(result.current.otpError).toBeTruthy();
  });

  it('clears interval on unmount while timer is running', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(otpService.generate).mockResolvedValue({ data: {}, status: 200, headers: {} });
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

      const { result, unmount } = renderHook(
        () => useEditProfile('user1', mockProfile, noopCaptcha),
        { wrapper: createWrapper() },
      );

      await act(async () => { vi.runAllTicks(); });

      act(() => { result.current.handleFieldChange('mobileNumber', '1111111111'); });
      await act(async () => { await result.current.handleVerifyDetails(); });

      expect(result.current.timer).toBe(60);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns false immediately when otpStatus is sending', async () => {
    // Make generate hang so status stays 'sending'
    vi.mocked(otpService.generate).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.emailId).toBe('john@example.com'));

    act(() => { result.current.handleFieldChange('emailId', 'new@example.com'); });

    // Kick off first call (won't complete)
    act(() => { void result.current.handleVerifyDetails(); });

    // While status is 'sending', a second call should return false immediately
    let result2: boolean | undefined;
    await act(async () => { result2 = await result.current.handleVerifyDetails(); });

    expect(result2).toBe(false);
  });

  it('rejects non-digit input in handleOtpChange', async () => {
    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    act(() => { result.current.handleOtpChange(0, 'a'); });

    expect(result.current.otpValue[0]).toBe('');
  });

  it('returns false from handleSubmitOtp when OTP is incomplete', async () => {
    vi.mocked(otpService.generate).mockResolvedValue({ data: {}, status: 200, headers: {} });

    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.emailId).toBe('john@example.com'));
    act(() => { result.current.handleFieldChange('emailId', 'new@example.com'); });
    await act(async () => { await result.current.handleVerifyDetails(); });

    // Only fill 3 of 6 digits
    act(() => { ['1', '2', '3'].forEach((d, i) => result.current.handleOtpChange(i, d)); });

    let success: boolean | undefined;
    await act(async () => { success = await result.current.handleSubmitOtp(); });

    expect(success).toBe(false);
    expect(otpService.verify).not.toHaveBeenCalled();
  });

  it('errors when alternateEmailId equals primary emailId', async () => {
    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.emailId).toBe('john@example.com'));

    // Set alternate email to same value as primary
    act(() => { result.current.handleFieldChange('alternateEmailId', 'john@example.com'); });

    await act(async () => { await result.current.handleVerifyDetails(); });

    expect(result.current.otpStatus).toBe('error');
    expect(result.current.otpError).toMatch(/different/i);
    expect(otpService.generate).not.toHaveBeenCalled();
  });

  it('skips name save when userId is null', async () => {
    vi.mocked(userService.updateUser).mockResolvedValue({ data: {}, status: 200, headers: {} });

    const { result } = renderHook(
      () => useEditProfile(null, mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.fullName).toBe('John Doe'));

    act(() => { result.current.handleFieldChange('fullName', 'Jane Doe'); });

    let shouldOpenOtp: boolean | undefined;
    await act(async () => { shouldOpenOtp = await result.current.handleVerifyDetails(); });

    expect(shouldOpenOtp).toBe(false);
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  it('does not include name in update payload when name is unchanged during OTP flow', async () => {
    vi.mocked(otpService.generate).mockResolvedValue({ data: {}, status: 200, headers: {} });
    vi.mocked(otpService.verify).mockResolvedValue({ data: {}, status: 200, headers: {} });
    vi.mocked(userService.updateUser).mockResolvedValue({ data: {}, status: 200, headers: {} });

    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.emailId).toBe('john@example.com'));

    // Only change email, not name
    act(() => { result.current.handleFieldChange('emailId', 'new@example.com'); });
    await act(async () => { await result.current.handleVerifyDetails(); });

    act(() => {
      ['1', '2', '3', '4', '5', '6'].forEach((d, i) => result.current.handleOtpChange(i, d));
    });

    await act(async () => { await result.current.handleSubmitOtp(); });

    expect(userService.updateUser).toHaveBeenCalledWith(
      expect.not.objectContaining({ firstName: expect.anything() }),
    );
  });

  it('does not include alternateEmail in payload when recoveryEmail changed via OTP', async () => {
    vi.mocked(otpService.generate).mockResolvedValue({ data: {}, status: 200, headers: {} });
    vi.mocked(otpService.verify).mockResolvedValue({ data: {}, status: 200, headers: {} });
    vi.mocked(userService.updateUser).mockResolvedValue({ data: {}, status: 200, headers: {} });

    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.editData.alternateEmailId).toBe('alt@example.com'));

    act(() => { result.current.handleFieldChange('alternateEmailId', 'new-alt@example.com'); });
    await act(async () => { await result.current.handleVerifyDetails(); });

    act(() => {
      ['1', '2', '3', '4', '5', '6'].forEach((d, i) => result.current.handleOtpChange(i, d));
    });

    await act(async () => { await result.current.handleSubmitOtp(); });

    expect(userService.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ recoveryEmail: 'new-alt@example.com' }),
    );
  });

  it('does not reset editData when profile is undefined', () => {
    const { result } = renderHook(
      () => useEditProfile('user1', undefined, noopCaptcha),
      { wrapper: createWrapper() },
    );

    act(() => { result.current.handleFieldChange('fullName', 'Some Name'); });
    act(() => { result.current.resetEditData(); });

    // No profile to restore from — editData remains as the user typed
    expect(result.current.editData.fullName).toBe('Some Name');
  });

  it('timer counts down to zero and stops', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(otpService.generate).mockResolvedValue({ data: {}, status: 200, headers: {} });

      const { result } = renderHook(
        () => useEditProfile('user1', mockProfile, noopCaptcha),
        { wrapper: createWrapper() },
      );

      await act(async () => { vi.runAllTicks(); });

      act(() => { result.current.handleFieldChange('mobileNumber', '1111111111'); });
      await act(async () => { await result.current.handleVerifyDetails(); });

      expect(result.current.timer).toBe(60);

      // Advance past the full countdown
      act(() => { vi.advanceTimersByTime(65000); });

      expect(result.current.timer).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('handleResendOtp is no-op when activeOtpField is null', async () => {
    const { result } = renderHook(
      () => useEditProfile('user1', mockProfile, noopCaptcha),
      { wrapper: createWrapper() },
    );

    // No OTP sent yet — activeOtpField is null
    await act(async () => { await result.current.handleResendOtp(); });

    expect(otpService.generate).not.toHaveBeenCalled();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });
});
