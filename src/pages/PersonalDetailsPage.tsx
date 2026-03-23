import React, { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonModal,
    IonToast,
} from '@ionic/react';
import { chevronBackOutline } from 'ionicons/icons';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../hooks/useUser';
import { useEditProfile, TriggerCaptcha } from '../hooks/useEditProfile';
import { useSystemSetting } from '../hooks/useSystemSetting';
import './PersonalDetailsPage.css';

const OTP_LENGTH = 6;

// ── Inner component — consumes the v3 reCAPTCHA context ────────────────────
const PersonalDetailsBody: React.FC = () => {
    const { t } = useTranslation();
    const { userId } = useAuth();
    const { data: profile } = useUser(userId);
    const { executeRecaptcha } = useGoogleReCaptcha();

    const triggerCaptcha = useCallback<TriggerCaptcha>((callback) => {
        if (!executeRecaptcha) {
            callback(null);
            return;
        }
        executeRecaptcha('otp_request')
            .then(token => callback(token))
            .catch(() => callback(null));
    }, [executeRecaptcha]);

    const {
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
        resetEditData,
    } = useEditProfile(userId, profile, triggerCaptcha);

    const [isEditOpen, setIsEditOpen] = React.useState(false);
    const [isOtpOpen, setIsOtpOpen] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const transitioningToOtp = useRef(false);

    const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
    const formData = {
        fullName,
        mobileNumber: (profile?.phone as string) ?? '',
        emailId: (profile?.email as string) ?? '',
        alternateEmailId: (profile?.recoveryEmail as string) ?? '',
    };

    const OTP_FIELD_LABELS: Record<string, string> = {
        mobileNumber: t('mobileNumber'),
        emailId: t('emailId'),
        alternateEmailId: t('alternateEmailId'),
    };

    const openEdit = () => {
        resetEditData();
        setIsEditOpen(true);
    };

    const closeEdit = () => {
        setIsEditOpen(false);
        if (!transitioningToOtp.current) {
            resetOtpState();
        }
        transitioningToOtp.current = false;
    };

    const closeOtp = () => {
        setIsOtpOpen(false);
        resetOtpState();
    };

    const formatTime = (s: number) => {
        const m = String(Math.floor(s / 60)).padStart(2, '0');
        const sec = String(s % 60).padStart(2, '0');
        return `${m}:${sec}`;
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpInputChange = (index: number, value: string) => {
        handleOtpChange(index, value);
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleVerifyClick = async () => {
        const shouldOpenOtp = await handleVerifyDetails();
        if (shouldOpenOtp) {
            transitioningToOtp.current = true;
            setIsEditOpen(false);
            setIsOtpOpen(true);
        } else if (otpStatus !== 'error') {
            setIsEditOpen(false);
        }
    };

    const handleSubmitClick = async () => {
        const success = await handleSubmitOtp();
        if (success) {
            setIsOtpOpen(false);
            const label = activeOtpField ? OTP_FIELD_LABELS[activeOtpField] : null;
            if (label) setToastMessage(t('fieldUpdatedSuccessfully', { field: label }));
        }
    };

    const handleResendClick = async () => {
        await handleResendOtp();
        inputRefs.current[0]?.focus();
    };

    const fields = [
        { key: 'fullName', label: t('fullName'), type: 'text' },
        { key: 'mobileNumber', label: t('mobileNumber'), type: 'text' },
        { key: 'emailId', label: t('emailId'), type: 'email' },
        { key: 'alternateEmailId', label: t('alternateEmailId'), type: 'email' },
    ];

    return (
        <IonPage className="personal-details-page">
            {/* ── Header ── */}
            <IonHeader className="pd-header ion-no-border">
                <IonToolbar className="pd-toolbar">
                    <IonButtons slot="start">
                        <IonBackButton
                            defaultHref="/profile"
                            text=""
                            icon={chevronBackOutline}
                            className="pd-back-btn"
                        />
                    </IonButtons>
                    <IonTitle className="pd-title">{t('personalDetails')}</IonTitle>
                    <IonButtons slot="end">
                        <button className="pd-edit-btn" onClick={openEdit}>
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10.5472 1.00861C10.9092 1.0474 11.2023 1.21546 11.435 1.39214C11.6763 1.57916 11.9435 1.8446 12.2106 2.11435L12.3572 2.26259C12.633 2.53234 12.8915 2.79521 13.0811 3.03997C13.2879 3.30541 13.4775 3.64756 13.4775 4.09054C13.4775 4.53353 13.2879 4.87567 13.0811 5.14112C12.8915 5.38588 12.633 5.64874 12.3572 5.9185L6.16053 12.1185C6.02264 12.2547 5.85027 12.4409 5.61757 12.5693C5.39349 12.6977 5.14355 12.7529 4.96257 12.7985L2.71319 13.3604L2.70456 13.3613L2.67016 13.3708C2.54089 13.4027 2.35123 13.4527 2.18748 13.469C2.0065 13.4863 1.61865 13.4923 1.29977 13.1743C0.980886 12.8563 0.989534 12.4667 1.00677 12.2892C1.02401 12.1211 1.07571 11.9307 1.10156 11.8031L1.67903 9.5158C1.72212 9.32964 1.77384 9.07971 1.90311 8.85218C2.03239 8.62552 2.22201 8.44971 2.35129 8.3144L8.55646 2.11435C8.82363 1.8446 9.09082 1.57916 9.33213 1.39214C9.5993 1.19047 9.94401 1 10.3835 1L10.5472 1.00861Z" stroke="var(--color-a14f34, #A14F34)" strokeWidth="2" />
                                <path d="M8.229 2.79765L10.8145 1.07397L13.4 3.65948L11.6763 6.24499L8.229 2.79765Z" fill="var(--color-a14f34, #A14F34)" />
                            </svg>
                        </button>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            {/* ── Read-only content ── */}
            <IonContent className="pd-content">
                <div className="pd-form-container">
                    {fields.map((f, i) => (
                        <div className="pd-form-group" key={i}>
                            <label className="pd-label">{f.label}</label>
                            <input type={f.type} className="pd-input" value={(formData as any)[f.key]} readOnly />
                        </div>
                    ))}
                </div>
            </IonContent>

            {/* ── Edit bottom-sheet modal ── */}
            <IonModal
                isOpen={isEditOpen}
                onDidDismiss={closeEdit}
                className="pd-edit-modal"
            >
                <div className="pd-modal-root">
                    <IonHeader className="ion-no-border">
                        <IonToolbar className="pd-modal-toolbar">
                            <IonButtons slot="end">
                                <button className="pd-modal-close-btn" onClick={closeEdit}>
                                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L9 9" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M9 1L1 9" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </IonButtons>
                        </IonToolbar>
                    </IonHeader>

                    <IonContent className="pd-modal-content">
                        <div className="pd-modal-form">
                            {fields.map(f => (
                                <div className="pd-form-group" key={f.key}>
                                    <label className="pd-label">{f.label}</label>
                                    <input
                                        type={f.type}
                                        className="pd-input"
                                        value={editData[f.key] ?? ''}
                                        onChange={e => handleFieldChange(f.key, e.target.value)}
                                    />
                                </div>
                            ))}
                            {otpStatus === 'error' && otpError && (
                                <p className="pd-error">{otpError}</p>
                            )}
                        </div>
                    </IonContent>

                    <div className="pd-modal-footer">
                        <button
                            className="pd-verify-btn"
                            onClick={handleVerifyClick}
                            disabled={otpStatus === 'sending'}
                        >
                            {otpStatus === 'sending' ? t('sendingOtp') : t('verifyDetails')}
                        </button>
                    </div>
                </div>
            </IonModal>

            {/* ── OTP Verification bottom-sheet modal ── */}
            <IonModal
                isOpen={isOtpOpen}
                onDidDismiss={closeOtp}
                className="pd-otp-modal"
            >
                <div className="pd-modal-root">
                    <IonHeader className="ion-no-border">
                        <IonToolbar className="pd-modal-toolbar">
                            <IonButtons slot="end">
                                <button className="pd-modal-close-btn" onClick={closeOtp}>
                                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L9 9" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M9 1L1 9" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </IonButtons>
                        </IonToolbar>
                    </IonHeader>

                    <IonContent className="pd-modal-content">
                        <div className="otp-body">
                            <h2 className="otp-title">{t('enterTheCode')}</h2>
                            <p className="otp-subtitle">
                                {t('otpSubtitle')}
                            </p>

                            <p className="otp-validity">{t('otpValidity')}</p>

                            <div className="otp-inputs">
                                {otpValue.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => { inputRefs.current[idx] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className="otp-box"
                                        value={digit}
                                        onChange={e => handleOtpInputChange(idx, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                                    />
                                ))}
                            </div>

                            {otpStatus === 'error' && otpError && (
                                <p className="pd-error">{otpError}</p>
                            )}

                            <div className="otp-timer-row">
                                <span className="otp-timer">{formatTime(timer)}</span>
                                <button
                                    className="otp-resend"
                                    onClick={handleResendClick}
                                    disabled={timer > 0 || resendCount >= 4 || otpStatus === 'verifying'}
                                >
                                    {t('resendOtp')}
                                </button>
                            </div>
                        </div>
                    </IonContent>

                    <div className="pd-modal-footer">
                        <button
                            className="pd-verify-btn pd-submit-btn"
                            onClick={handleSubmitClick}
                            disabled={otpValue.join('').length < OTP_LENGTH || otpStatus === 'verifying'}
                        >
                            {otpStatus === 'verifying' ? t('verifying') : t('submit')}
                        </button>
                    </div>
                </div>
            </IonModal>

            <IonToast
                isOpen={!!toastMessage}
                onDidDismiss={() => setToastMessage('')}
                message={toastMessage}
                duration={3000}
                position="bottom"
            />
        </IonPage>
    );
};

// ── Outer component — resolves the site key and provides reCAPTCHA context ──
const PersonalDetailsPage: React.FC = () => {
    const { data: captchaSetting } = useSystemSetting('portal_google_recaptcha_site_key');
    const captchaSiteKey = (captchaSetting?.data as any)?.response?.value ?? '';

    if (!captchaSiteKey) {
    
        return <PersonalDetailsBody />;
    }

    return (
        <GoogleReCaptchaProvider reCaptchaKey={captchaSiteKey}>
            <PersonalDetailsBody />
        </GoogleReCaptchaProvider>
    );
};

export default PersonalDetailsPage;
