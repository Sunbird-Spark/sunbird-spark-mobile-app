import React from 'react';

interface ProgressBarProps {
  totalSteps: number;
  currentStep: number;
  onBack?: () => void;
  showBack?: boolean;
  isSubmitting?: boolean;
  backLabel?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  totalSteps,
  currentStep,
  onBack,
  showBack = false,
  isSubmitting = false,
  backLabel = 'Go back',
}) => {
  return (
    <div className="onboarding-progress">
      {showBack && (
        <button
          type="button"
          className="onboarding-progress__back"
          onClick={onBack}
          disabled={isSubmitting}
          aria-label={backLabel}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <div className="onboarding-progress__segments">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`onboarding-progress__segment ${
              i < currentStep ? 'onboarding-progress__segment--completed' : 'onboarding-progress__segment--remaining'
            }`}
          />
        ))}
      </div>
      <span className="onboarding-progress__label">
        {currentStep}/{totalSteps}
      </span>
    </div>
  );
};

export default ProgressBar;
