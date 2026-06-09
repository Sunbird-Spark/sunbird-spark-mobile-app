import React, { useState } from 'react';
import { IonPopover } from '@ionic/react';
import { useTheme } from '../../contexts/ThemeContext';
import { themePreviewColor } from '../../theme/themes';
import './ThemeSelector.css';

/** Color palette glyph — theme selector icon. */
const ThemeBrushIcon: React.FC = () => (
  <svg
    width="1.1875rem"
    height="1.1875rem"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.96-4.04-9-9-9zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
      fill="var(--ion-color-primary)"
    />
  </svg>
);

export const ThemeSelector: React.FC = () => {
  const { themeId, fontId, templateId, themes, fonts, templates, setThemeId, setFontId, setTemplateId } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | undefined>();
  const popoverRef = React.useRef<HTMLIonPopoverElement>(null);

  const handleOpen = (e: React.MouseEvent) => {
    setPopoverEvent(e.nativeEvent);
    setIsOpen(true);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="theme-selector-button"
        aria-label="Select theme and font"
        data-testid="theme-selector-button"
      >
        <ThemeBrushIcon />
      </button>

      <IonPopover
        ref={popoverRef}
        isOpen={isOpen}
        event={popoverEvent}
        onDidDismiss={() => setIsOpen(false)}
        side="bottom"
        alignment="end"
        className="theme-selector-popover"
      >
        <div className="theme-selector-panel">
          <div className="theme-selector-section-label">Theme</div>
          <div className="theme-selector-swatches">
            {themes.map((t) => {
              const isActive = t.id === themeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`theme-selector-swatch${isActive ? ' theme-selector-swatch--active' : ''}`}
                  style={{ background: themePreviewColor(t) }}
                  onClick={() => setThemeId(t.id)}
                  aria-label={t.label}
                  aria-pressed={isActive}
                  title={t.label}
                />
              );
            })}
          </div>

          <div className="theme-selector-divider" />

          <div className="theme-selector-section-label">Template</div>
          <div className="theme-selector-templates">
            {templates.map(tpl => {
              const isActive = tpl.id === templateId;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  className={`theme-selector-template${isActive ? ' theme-selector-template--active' : ''}`}
                  onClick={() => setTemplateId(tpl.id)}
                  aria-pressed={isActive}
                >
                  <span className="theme-selector-template__name">{tpl.label}</span>
                  <span className="theme-selector-template__desc">{tpl.description}</span>
                </button>
              );
            })}
          </div>

          <div className="theme-selector-divider" />

          <div className="theme-selector-section-label">Font</div>
          <div className="theme-selector-fonts">
            {fonts.map(f => {
              const isActive = f.id === fontId;
              return (
                <button
                  key={f.id}
                  type="button"
                  className="theme-selector-font-option"
                  style={{
                    fontFamily: f.family,
                    color: isActive ? 'var(--ion-color-primary)' : 'var(--ion-color-dark, var(--color-222222, #222222))',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  onClick={() => setFontId(f.id)}
                  aria-pressed={isActive}
                  aria-label={f.label}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </IonPopover>
    </>
  );
};
