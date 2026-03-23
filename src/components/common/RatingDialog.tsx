import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface PlayerMetadata {
  identifier?: string;
  objectType?: string;
  contentType?: string;
  primaryCategory?: string;
  pkgVersion?: number | string;
  versionKey?: string;
  [key: string]: unknown;
}

interface RatingDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (rating: number) => void;
  playerMetadata?: PlayerMetadata;
}

/** Feather-style X icon */
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/** Feather-style star icon */
const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="27"
    height="27"
    viewBox="0 0 24 24"
    fill={filled ? '#AB4A2C' : '#D4D4D4'}
    stroke={filled ? '#AB4A2C' : '#D4D4D4'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const SEAL_BADGE_SRC = '/assets/rating-popup-check.svg';

const RatingDialog = ({ open, onClose, onSubmit }: RatingDialogProps) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);

  if (!open) return null;

  const handleSubmit = () => {
    onSubmit?.(rating);
    setRating(0);
    onClose();
  };

  const handleClose = () => {
    setRating(0);
    onClose();
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 0,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rating-dialog-title"
        style={{
          background: '#FFFFFF',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
          height: '100%',
          position: 'relative',
          padding: '1.5rem',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Close rating dialog"
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: 'none',
            border: 'none',
            color: '#AB4A2C',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <CloseIcon />
        </button>

        {/* Seal badge */}
        <img
          src={SEAL_BADGE_SRC}
          alt=""
          style={{ width: '80px', height: '80px', marginBottom: '0.75rem' }}
        />

        {/* Title */}
        <h2
          id="rating-dialog-title"
          style={{
            fontFamily: 'Rubik, sans-serif',
            fontWeight: 500,
            fontSize: '1.25rem',
            lineHeight: 1.3,
            letterSpacing: 0,
            color: '#222222',
            margin: '0 0 0.25rem 0',
          }}
        >
          {t('rateYourExperience')}
        </h2>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: 'Rubik, sans-serif',
            fontWeight: 400,
            fontSize: '0.875rem',
            lineHeight: '1.5rem',
            letterSpacing: 0,
            color: '#222222',
            margin: '0 0 1.5rem 0',
          }}
        >
          {t('howWasLearningExperience')}
        </p>

        {/* Star rating */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              aria-label={`${t('rate')} ${star} ${star > 1 ? t('stars') : t('star')}`}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.25rem',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.15s',
              }}
            >
              <StarIcon filled={star <= rating} />
            </button>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0}
          style={{
            background: '#AB4A2C',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '0.5rem',
            fontFamily: 'Rubik, sans-serif',
            fontWeight: 500,
            fontSize: '1rem',
            padding: '0.625rem 2.5rem',
            cursor: rating === 0 ? 'not-allowed' : 'pointer',
            opacity: rating === 0 ? 0.4 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {t('submit')}
        </button>
      </div>
    </div>
  );
};

export default RatingDialog;
