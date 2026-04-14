/** A label can be a plain string or a locale object (e.g. { en: "Hello", fr: "Bonjour" }) */
export type LocaleString = string | Record<string, string>;

export interface OnboardingField {
  id: string;
  index: number;
  label: LocaleString;
  nextScreenId?: string;
  requiresTextInput?: boolean;
}

export interface OnboardingScreen {
  title: LocaleString;
  selectionType: 'single';
  nextScreenId?: string;
  fields: OnboardingField[];
}

export interface OnboardingFormData {
  isEnabled: boolean;
  initialScreenId: string;
  screens: Record<string, OnboardingScreen>;
}
