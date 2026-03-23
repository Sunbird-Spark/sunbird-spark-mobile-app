import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './RatingDialog.css';

interface RatingDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (rating: number) => void;
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

import ratingPopupCheck from '../../assets/rating-popup-check.svg';

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
    <div className="rating-dialog-overlay">
      <div
        className="rating-dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rating-dialog-title"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="rating-dialog-close-btn"
          aria-label={t('close')}
        >
          <CloseIcon />
        </button>

        {/* Seal badge */}
        <img
          src={ratingPopupCheck}
          alt=""
          className="rating-dialog-badge"
        />

        {/* Title */}
        <h2 id="rating-dialog-title" className="rating-dialog-title">
          {t('rateYourExperience')}
        </h2>

        {/* Subtitle */}
        <p className="rating-dialog-subtitle">
          {t('howWasLearningExperience')}
        </p>

        {/* Star rating */}
        <div className="rating-dialog-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="rating-dialog-star-btn"
              aria-label={`${t('rate')} ${star} ${star > 1 ? t('stars') : t('star')}`}
            >
              <StarIcon filled={star <= rating} />
            </button>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0}
          className="rating-dialog-submit-btn"
        >
          {t('submit')}
        </button>
      </div>
    </div>
  );
};

export default RatingDialog;
