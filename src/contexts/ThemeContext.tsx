import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_CONFIG } from '../config/languages';
import {
  THEMES,
  FONTS,
  TEMPLATES,
  DEFAULT_THEME_ID,
  DEFAULT_FONT_ID,
  DEFAULT_TEMPLATE_ID,
  THEME_STORAGE_KEY,
  FONT_STORAGE_KEY,
  TEMPLATE_STORAGE_KEY,
  applyTheme,
  applyFont,
  applyTemplate,
  type ThemeSeed,
  type FontOption,
  type TemplateOption,
} from '../theme/themes';

interface ThemeContextValue {
  themeId: string;
  fontId: string;
  templateId: string;
  themes: ThemeSeed[];
  fonts: FontOption[];
  templates: TemplateOption[];
  setThemeId: (id: string) => void;
  setFontId: (id: string) => void;
  setTemplateId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const readStored = (key: string, fallback: string): string => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

const isKnownTemplateId = (v: string): boolean => TEMPLATES.some((t) => t.id === v);

const SCRIPT_LOCALES = new Set(['ar', 'hi']);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [themeId, setThemeIdState] = useState<string>(() => readStored(THEME_STORAGE_KEY, DEFAULT_THEME_ID));
  const [fontId, setFontIdState] = useState<string>(() => readStored(FONT_STORAGE_KEY, DEFAULT_FONT_ID));
  const [templateId, setTemplateIdState] = useState<string>(() => {
    const v = readStored(TEMPLATE_STORAGE_KEY, DEFAULT_TEMPLATE_ID);
    return isKnownTemplateId(v) ? v : DEFAULT_TEMPLATE_ID;
  });

  useEffect(() => {
    const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];
    applyTheme(theme);
  }, [themeId]);

  /** Font is owned here. Watches both user font choice AND active language —
   *  script locales (ar/hi) require their own font; otherwise honor user pick.
   *  Re-fires on language change so leaving Arabic restores Satisfy / etc. */
  useEffect(() => {
    const lang = i18n.language;
    if (SCRIPT_LOCALES.has(lang)) {
      const langCfg = LANGUAGE_CONFIG.find(l => l.code === lang);
      if (langCfg) {
        document.documentElement.style.setProperty('--ion-font-family', langCfg.font);
        return;
      }
    }
    const font = FONTS.find(f => f.id === fontId) ?? FONTS[0];
    applyFont(font);
  }, [fontId, i18n.language]);

  useEffect(() => {
    applyTemplate(templateId);
  }, [templateId]);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    try { localStorage.setItem(THEME_STORAGE_KEY, id); } catch { /* ignore */ }
  }, []);

  const setFontId = useCallback((id: string) => {
    setFontIdState(id);
    try { localStorage.setItem(FONT_STORAGE_KEY, id); } catch { /* ignore */ }
  }, []);

  /** Picking a template cascades its preset color + font to the active state.
   *  After this, the user can still override color or font independently. */
  const setTemplateId = useCallback((id: string) => {
    const tpl = TEMPLATES.find(t => t.id === id);
    setTemplateIdState(id);
    try { localStorage.setItem(TEMPLATE_STORAGE_KEY, id); } catch { /* ignore */ }
    if (tpl) {
      if (THEMES.some(t => t.id === tpl.presetThemeId)) {
        setThemeIdState(tpl.presetThemeId);
        try { localStorage.setItem(THEME_STORAGE_KEY, tpl.presetThemeId); } catch { /* ignore */ }
      }
      if (FONTS.some(f => f.id === tpl.presetFontId)) {
        setFontIdState(tpl.presetFontId);
        try { localStorage.setItem(FONT_STORAGE_KEY, tpl.presetFontId); } catch { /* ignore */ }
      }
    }
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    themeId, fontId, templateId,
    themes: THEMES, fonts: FONTS, templates: TEMPLATES,
    setThemeId, setFontId, setTemplateId,
  }), [themeId, fontId, templateId, setThemeId, setFontId, setTemplateId]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

const NOOP_THEME_VALUE: ThemeContextValue = {
  themeId: DEFAULT_THEME_ID,
  fontId: DEFAULT_FONT_ID,
  templateId: DEFAULT_TEMPLATE_ID,
  themes: THEMES,
  fonts: FONTS,
  templates: TEMPLATES,
  setThemeId: () => { /* no-op outside provider */ },
  setFontId: () => { /* no-op outside provider */ },
  setTemplateId: () => { /* no-op outside provider */ },
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  return ctx ?? NOOP_THEME_VALUE;
};
