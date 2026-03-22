import { useState, useRef, useCallback, useEffect, startTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { otpService } from '../services/OtpService';
import { userService } from '../services/UserService';
import type { UserProfile } from '../types/userTypes';
import type { OtpType } from '../types/otpTypes';

export type TriggerCaptcha = (callback: (token?: string) => void) => void;

export type OtpStatus = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error';

const OTP_LENGTH = 6;
const OTP_COUNTDOWN = 60;
const MAX_RESEND = 4;

const OTP_FIELD_MAP: Record<string, { type: OtpType; profileKey: keyof UserProfile }> = {
  mobileNumber: { type: 'phone', profileKey: 'phone' },
  emailId: { type: 'email', profileKey: 'email' },
  alternateEmailId: { type: 'email', profileKey: 'recoveryEmail' },
};

export const useEditProfile = (
  userId: string | null,
  profile: UserProfile | undefined,
  triggerCaptcha: TriggerCaptcha,
) => {
  const queryClient = useQueryClient();

  const [editData, setEditData] = useState<Record<string, string>>({
    fullName: '',
    mobileNumber: '',
    emailId: '',
    alternateEmailId: '',
  });

  const [otpValue, setOtpValue] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpStatus, setOtpStatus] = useState<OtpStatus>('idle');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [activeOtpField, setActiveOtpField] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync editData when profile loads
  useEffect(() => {
    if (profile) {
      startTransition(() => {
        setEditData({
          fullName: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
          mobileNumber: (profile.phone as string) ?? '',
          emailId: (profile.email as string) ?? '',
          alternateEmailId: (profile.recoveryEmail as string) ?? '',
        });
      });
    }
  }, [profile]);

  const startTimer = useCallback(() => {
    setTimer(OTP_COUNTDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const getCaptchaToken = useCallback((): Promise<string | undefined> =>
    new Promise(resolve => triggerCaptcha(token => resolve(token))), [triggerCaptcha]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  const getOriginalValue = useCallback((field: string): string => {
    const config = OTP_FIELD_MAP[field];
    if (!config) return '';
    return (profile?.[config.profileKey] as string) ?? '';
  }, [profile]);

  const getFirstModifiedOtpField = useCallback((): string | null => {
    return Object.keys(OTP_FIELD_MAP).find(field => {
      const original = getOriginalValue(field);
      return editData[field] !== '' && editData[field] !== original;
    }) ?? null;
  }, [editData, getOriginalValue]);

  const hasNameChanged = useCallback((): boolean => {
    const original = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
    return editData.fullName.trim() !== original.trim();
  }, [editData.fullName, profile]);

  const sendOtp = useCallback(async (field: string): Promise<boolean> => {
    const config = OTP_FIELD_MAP[field];
    if (!config) return false;

    // Cross-field email validation
    if (field === 'alternateEmailId' && editData.alternateEmailId === editData.emailId) {
      setOtpStatus('error');
      setOtpError('Primary and alternate email must be different.');
      return false;
    }

    setOtpStatus('sending');
    setOtpError(null);

    try {
      const captchaToken = await getCaptchaToken();
      await otpService.generate({
        request: { key: editData[field], type: config.type, captchaToken },
      });
      setActiveOtpField(field);
      setOtpStatus('sent');
      startTimer();
      return true;
    } catch {
      setOtpStatus('error');
      setOtpError('Failed to send OTP. Please try again.');
      return false;
    }
  }, [editData, startTimer, getCaptchaToken]);

  // Returns true if OTP modal should open, false if saved directly (name only)
  const handleVerifyDetails = useCallback(async (): Promise<boolean> => {
    if (otpStatus === 'sending') return false;

    const otpField = getFirstModifiedOtpField();
    if (otpField) {
      return await sendOtp(otpField);
    }

    // Only name changed — save directly
    if (hasNameChanged() && userId) {
      const parts = editData.fullName.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');
      await userService.updateUser({ userId, firstName, lastName });
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
    }

    return false;
  }, [getFirstModifiedOtpField, sendOtp, hasNameChanged, userId, editData, queryClient, otpStatus]);

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    setOtpValue(prev => {
      const next = [...prev];
      next[index] = value.slice(-1);
      return next;
    });
  }, []);

  // Returns true on successful verify + save
  const handleSubmitOtp = useCallback(async (): Promise<boolean> => {
    if (!activeOtpField) return false;
    const config = OTP_FIELD_MAP[activeOtpField];
    const otp = otpValue.join('');
    if (otp.length < OTP_LENGTH) return false;

    setOtpStatus('verifying');
    setOtpError(null);

    try {
      await otpService.verify({
        request: { key: editData[activeOtpField], type: config.type, otp },
      });
    } catch {
      setOtpStatus('error');
      setOtpError('Invalid OTP. Please try again.');
      return false;
    }

    try {
      // Build delta — only fields that changed
      const payload: Record<string, unknown> = { userId };
      if (hasNameChanged()) {
        const parts = editData.fullName.trim().split(' ');
        payload.firstName = parts[0];
        payload.lastName = parts.slice(1).join(' ');
      }
      if (activeOtpField === 'mobileNumber') payload.phone = editData.mobileNumber;
      if (activeOtpField === 'emailId') payload.email = editData.emailId;
      if (activeOtpField === 'alternateEmailId') payload.recoveryEmail = editData.alternateEmailId;

      await userService.updateUser(payload);
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });

      setOtpStatus('verified');
      setOtpValue(Array(OTP_LENGTH).fill(''));
      return true;
    } catch {
      setOtpStatus('error');
      setOtpError('Profile update failed. Please try again.');
      return false;
    }
  }, [activeOtpField, otpValue, editData, userId, hasNameChanged, queryClient]);

  const handleResendOtp = useCallback(async () => {
    if (resendCount >= MAX_RESEND || !activeOtpField) return;
    setResendCount(prev => prev + 1);
    setOtpValue(Array(OTP_LENGTH).fill(''));
    await sendOtp(activeOtpField);
  }, [resendCount, activeOtpField, sendOtp]);

  const resetOtpState = useCallback(() => {
    setOtpStatus('idle');
    setOtpValue(Array(OTP_LENGTH).fill(''));
    setOtpError(null);
    setActiveOtpField(null);
    setResendCount(0);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(0);
  }, []);

  return {
    editData,
    otpValue,
    otpStatus,
    otpError,
    timer,
    resendCount,
    activeOtpField,
    handleFieldChange,
    handleVerifyDetails,
    handleOtpChange,
    handleSubmitOtp,
    handleResendOtp,
    resetOtpState,
  };
};
