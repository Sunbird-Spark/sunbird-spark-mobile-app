/**
 * Theme seeds — 6 values per theme (matches portal).
 * - 3 primary HSL (hue/saturation/lightness)
 * - 2 chip HSL (hue/saturation; lightness varies per token at consume site)
 * - 1 icon hue (saturation/lightness fixed for readability)
 *
 * Derived elsewhere (no per-theme field needed):
 *  - Swatch    = hsl(primaryH primaryS% primaryL%)            — see ThemeSelector
 *  - Progress  = hsl(chipH 75% 76%)                            — see variables.css
 */
export interface ThemeSeed {
  id: string;
  label: string;
  primaryH: number;
  primaryS: number;
  primaryL: number;
  chipH: number;
  chipS: number;
  iconH: number;
}

/**
 * Shared catalog — same ids + same HSL across all 3 repos (mobile, portal,
 * Keycloak). Mirror of portal COLOR_PALETTES in
 * `sunbird-spark-portal/frontend/src/theme/themes.ts` and Keycloak THEME_MAP
 * in `…/keycloak-21.1.2/themes/sunbird/login/template.ftl`.
 */
export const THEMES: ThemeSeed[] = [
  { id: 'terracotta', label: 'Terracotta', primaryH: 12, primaryS: 50, primaryL: 45, chipH: 45, chipS: 100, iconH: 28 },
  { id: 'blue', label: 'Blue', primaryH: 217, primaryS: 71, primaryL: 46, chipH: 217, chipS: 71, iconH: 200 },
  { id: 'teal', label: 'Teal', primaryH: 180, primaryS: 38, primaryL: 38, chipH: 180, chipS: 38, iconH: 170 },
  { id: 'purple', label: 'Purple', primaryH: 270, primaryS: 55, primaryL: 45, chipH: 270, chipS: 55, iconH: 280 },
  { id: 'green', label: 'Green', primaryH: 145, primaryS: 45, primaryL: 35, chipH: 145, chipS: 45, iconH: 155 },
  { id: 'indigo', label: 'Indigo', primaryH: 235, primaryS: 65, primaryL: 48, chipH: 235, chipS: 65, iconH: 220 },
  { id: 'rose', label: 'Rose', primaryH: 345, primaryS: 60, primaryL: 45, chipH: 345, chipS: 60, iconH: 335 },
  { id: 'amber', label: 'Amber', primaryH: 35, primaryS: 80, primaryL: 45, chipH: 35, chipS: 80, iconH: 25 },
];

export interface FontOption {
  id: string;
  label: string;
  family: string;
}

/** Shared font catalog — same ids across mobile, portal, Keycloak. */
export const FONTS: FontOption[] = [
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif" },
  { id: 'rubik', label: 'Rubik', family: "'Rubik', sans-serif" },
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
  { id: 'satisfy', label: 'Satisfy', family: "'Satisfy', cursive" },
  { id: 'lora', label: 'Lora', family: "'Lora', serif" },
];

/**
 * Template bundles. Each template applies a preset color + font + radius scale.
 * After picking a template, the user can still override color or font from the
 * ThemeSelector — the template attr stays the same but the color/font drift.
 *
 * To add a NEW template:
 *   1. Append an entry below with `presetThemeId` (must exist in THEMES) and
 *      `presetFontId` (must exist in FONTS).
 *   2. If the new template needs its own radius scale, add a matching
 *      `html[data-template="<id>"] { --r-sm/-md/-lg ... }` block in
 *      `src/theme/overrides.css`. Otherwise it reuses :root defaults.
 */
export interface TemplateOption {
  id: string;
  label: string;
  description: string;
  presetThemeId: string;
  presetFontId: string;
}

export const TEMPLATES: TemplateOption[] = [
  { id: 'classic', label: 'Classic', description: 'Warm, rounded', presetThemeId: 'terracotta', presetFontId: 'rubik' },
  { id: 'modern', label: 'Modern', description: 'Sharp, bold', presetThemeId: 'rose', presetFontId: 'inter' },
];

export const DEFAULT_THEME_ID = 'terracotta';
export const DEFAULT_FONT_ID = 'rubik';
export const DEFAULT_TEMPLATE_ID: string = 'classic';
export const THEME_STORAGE_KEY = 'sunbird-theme';
export const FONT_STORAGE_KEY = 'sunbird-font';
export const TEMPLATE_STORAGE_KEY = 'sunbird-template';

export const applyTheme = (theme: ThemeSeed): void => {
  const root = document.documentElement;
  root.style.setProperty('--sunbird-spark-theme-primary-h', String(theme.primaryH));
  root.style.setProperty('--sunbird-spark-theme-primary-s', `${theme.primaryS}%`);
  root.style.setProperty('--sunbird-spark-theme-primary-l', `${theme.primaryL}%`);
  root.style.setProperty('--sunbird-spark-theme-chip-h', String(theme.chipH));
  root.style.setProperty('--sunbird-spark-theme-chip-s', `${theme.chipS}%`);
  root.style.setProperty('--sunbird-spark-theme-icon-h', String(theme.iconH));
};

export const applyFont = (font: FontOption): void => {
  document.documentElement.style.setProperty('--ion-font-family', font.family);
};

export const applyTemplate = (id: string): void => {
  document.documentElement.setAttribute('data-template', id);
};

/** Derive preview swatch from primary HSL. */
export const themePreviewColor = (theme: ThemeSeed): string =>
  `hsl(${theme.primaryH} ${theme.primaryS}% ${theme.primaryL}%)`;
