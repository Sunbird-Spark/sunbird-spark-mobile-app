import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonModal,
} from '@ionic/react';
import { chevronBackOutline } from 'ionicons/icons';
import './PersonalDetailsPage.css';

const OTP_LENGTH = 6;

const PersonalDetailsPage: React.FC = () => {
    const [formData] = useState({
        fullName: 'Prachi Desai',
        mobileNumber: '',
        emailId: 'prachi@gmail.com',
        alternateEmailId: '',
        district: 'Bengaluru',
        state: 'Karnataka',
    });

    const [editData, setEditData] = useState<Record<string, string>>({ ...formData });
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isOtpOpen, setIsOtpOpen] = useState(false);
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [timer, setTimer] = useState(240); // 4 minutes = 240 seconds
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const openEdit = () => {
        setEditData({ ...formData });
        setIsEditOpen(true);
    };

    const handleChange = (field: string, value: string) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    /* ── OTP timer ── */
    const startTimer = useCallback(() => {
        setTimer(240);
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

    useEffect(() => {
        if (isOtpOpen) {
            setOtp(Array(OTP_LENGTH).fill(''));
            startTimer();
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isOtpOpen, startTimer]);

    const formatTime = (s: number) => {
        const m = String(Math.floor(s / 60)).padStart(2, '0');
        const sec = String(s % 60).padStart(2, '0');
        return `${m}:${sec}`;
    };

    /* ── OTP input handlers ── */
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // digits only
        const next = [...otp];
        next[index] = value.slice(-1); // single char
        setOtp(next);
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleResend = () => {
        setOtp(Array(OTP_LENGTH).fill(''));
        startTimer();
        inputRefs.current[0]?.focus();
    };

    const handleVerifyClick = () => {
        setIsEditOpen(false);
        setIsOtpOpen(true);
    };

    const fields = [
        { key: 'fullName', label: 'Full Name', type: 'text' },
        { key: 'mobileNumber', label: 'Mobile Number', type: 'text' },
        { key: 'emailId', label: 'Email ID', type: 'email' },
        { key: 'alternateEmailId', label: 'Alternate Email ID', type: 'email' },
        { key: 'district', label: 'District', type: 'text' },
        { key: 'state', label: 'State', type: 'text' },
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
                    <IonTitle className="pd-title">Personal Details</IonTitle>
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
                onDidDismiss={() => setIsEditOpen(false)}
                className="pd-edit-modal"
            >
                <IonPage>
                    <IonHeader className="ion-no-border">
                        <IonToolbar className="pd-modal-toolbar">
                            <IonButtons slot="end">
                                <button className="pd-modal-close-btn" onClick={() => setIsEditOpen(false)}>
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
                                        value={editData[f.key]}
                                        onChange={e => handleChange(f.key, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </IonContent>

                    <div className="pd-modal-footer">
                        <button className="pd-verify-btn" onClick={handleVerifyClick}>
                            Verify the Details
                        </button>
                    </div>
                </IonPage>
            </IonModal>

            {/* ── OTP Verification bottom-sheet modal ── */}
            <IonModal
                isOpen={isOtpOpen}
                onDidDismiss={() => setIsOtpOpen(false)}
                className="pd-otp-modal"
            >
                <IonPage>
                    <IonHeader className="ion-no-border">
                        <IonToolbar className="pd-modal-toolbar">
                            <IonButtons slot="end">
                                <button className="pd-modal-close-btn" onClick={() => setIsOtpOpen(false)}>
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
                            <h2 className="otp-title">Enter the code</h2>
                            <p className="otp-subtitle">
                                Enter the 6 digit code sent to your phone number and complete the verification
                            </p>

                            <p className="otp-validity">OTP is valid for 30 minutes</p>

                            {/* 6-digit OTP boxes */}
                            <div className="otp-inputs">
                                {otp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => { inputRefs.current[idx] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className="otp-box"
                                        value={digit}
                                        onChange={e => handleOtpChange(idx, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                                    />
                                ))}
                            </div>

                            {/* Timer + Resend */}
                            <div className="otp-timer-row">
                                <span className="otp-timer">{formatTime(timer)}</span>
                                <button
                                    className="otp-resend"
                                    onClick={handleResend}
                                    disabled={timer > 0}
                                >
                                    Resend OTP
                                </button>
                            </div>
                        </div>
                    </IonContent>

                    <div className="pd-modal-footer">
                        <button className="pd-verify-btn pd-submit-btn">Submit</button>
                    </div>
                </IonPage>
            </IonModal>
        </IonPage>
    );
};

export default PersonalDetailsPage;
