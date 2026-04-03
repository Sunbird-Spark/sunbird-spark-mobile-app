import React from 'react';
import { useTranslation } from 'react-i18next';
import { OnboardingField } from '../../types/onboardingTypes';
import { resolveLabel } from '../../utils/formLocaleResolver';

interface OptionChipProps {
  field: OnboardingField;
  isSelected: boolean;
  onClick: () => void;
}

const OptionChip: React.FC<OptionChipProps> = ({ field, isSelected, onClick }) => {
  const { i18n } = useTranslation();
  return (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={isSelected}
    className={`onboarding-chip ${isSelected ? 'onboarding-chip--selected' : 'onboarding-chip--default'}`}
  >
    <span className="onboarding-chip__label">{resolveLabel(field.label, i18n.language)}</span>
    {isSelected && (
      <svg className="onboarding-chip__check" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" fill="white" />
        <path d="M6 10L9 13L14 7" stroke="#376673" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </button>
  );
};

export default OptionChip;
