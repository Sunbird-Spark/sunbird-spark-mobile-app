export interface LanguageConfig {
  label: string;
  code: string;
  font: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGE_CONFIG: LanguageConfig[] = [
  { label: 'English', code: 'en', font: "'Rubik', sans-serif", dir: 'ltr' },
  { label: 'हिन्दी', code: 'hi', font: "'Noto Sans Devanagari', sans-serif", dir: 'ltr' },
  { label: 'العربية', code: 'ar', font: "'Noto Sans Arabic', sans-serif", dir: 'rtl' },
  { label: 'Français', code: 'fr', font: "'Rubik', sans-serif", dir: 'ltr' },
  { label: 'Português', code: 'pt', font: "'Rubik', sans-serif", dir: 'ltr' },
];

export const DEFAULT_LANGUAGE = LANGUAGE_CONFIG[0];
