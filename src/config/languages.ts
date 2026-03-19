export interface LanguageConfig {
  label: string;
  code: string;
  font: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGE_CONFIG: LanguageConfig[] = [
  { label: 'English', code: 'en', font: "'Rubik', sans-serif", dir: 'ltr' },
  { label: 'French', code: 'fr', font: "'Rubik', sans-serif", dir: 'ltr' },
  { label: 'Portuguese', code: 'pt', font: "'Rubik', sans-serif", dir: 'ltr' },
  { label: 'Arabic', code: 'ar', font: "'Noto Sans Arabic', sans-serif", dir: 'rtl' },
];

export const DEFAULT_LANGUAGE = LANGUAGE_CONFIG[0];
