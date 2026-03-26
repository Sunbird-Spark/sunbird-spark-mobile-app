export interface OnboardingField {
  id: string;
  index: number;
  label: string;
  nextScreenId?: string;
  requiresTextInput?: boolean;
}

export interface OnboardingScreen {
  title: string;
  selectionType: 'single';
  nextScreenId?: string;
  fields: OnboardingField[];
}

export interface OnboardingFormData {
  isEnabled: boolean;
  initialScreenId: string;
  screens: Record<string, OnboardingScreen>;
}
