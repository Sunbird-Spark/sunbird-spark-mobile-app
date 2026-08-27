import React from 'react';
import type { LPTFunction } from './lpTFunction';

interface LPCertificateCardProps {
  unlocked: boolean;
  certPreviewUrl?: string;
  onView?: () => void;
  /** Shown alongside the certificate preview action once unlocked — opens the Path Completion summary screen. */
  onViewSummary?: () => void;
  t: LPTFunction;
}

/** Locked/unlocked certificate card shown below the ledger on the Overview screen. */
export const LPCertificateCard: React.FC<LPCertificateCardProps> = ({ unlocked, certPreviewUrl, onView, onViewSummary, t }) => {
  return (
    <div className={`lp-cert-card${unlocked ? ' lp-cert-card--unlocked' : ''}`}>
      <div className="lp-cert-card-icon" aria-hidden="true">
        {unlocked ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="var(--ion-color-success)" />
            <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="10" width="16" height="10" rx="2" stroke="var(--color-757575, #757575)" strokeWidth="1.5" />
            <path d="M8 10V7a4 4 0 018 0v3" stroke="var(--color-757575, #757575)" strokeWidth="1.5" />
          </svg>
        )}
      </div>
      <div className="lp-cert-card-body">
        <span className="lp-cert-card-title">{t('learningPath.certificate')}</span>
        <span className="lp-cert-card-subtitle">
          {unlocked ? t('learningPath.certificateUnlocked') : t('learningPath.certificateLocked')}
        </span>
      </div>
      {unlocked && (
        <div className="lp-cert-card-actions">
          {certPreviewUrl && (
            <button type="button" className="lp-cert-card-view-btn" onClick={onView}>
              {t('learningPath.viewCertificate')}
            </button>
          )}
          {onViewSummary && (
            <button type="button" className="lp-cert-card-summary-btn" onClick={onViewSummary}>
              {t('learningPath.viewCompletionSummary')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LPCertificateCard;
