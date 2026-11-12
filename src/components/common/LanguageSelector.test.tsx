import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockChangeLanguage = vi.fn();
let currentLanguage = 'en';

vi.mock('@ionic/react', () => ({
  IonPopover: ({ isOpen, children, event, onDidDismiss, className }: any) =>
    isOpen ? (
      <div data-testid="language-popover" className={className} data-has-event={String(!!event)}>
        {children}
        <button data-testid="popover-dismiss" onClick={onDidDismiss}>dismiss</button>
      </div>
    ) : null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: currentLanguage, changeLanguage: mockChangeLanguage },
  }),
}));

vi.mock('./LanguageSelector.css', () => ({}));

import { LanguageSelector } from './LanguageSelector';

const openPopover = () => fireEvent.click(screen.getByTestId('language-selector-button'));

describe('LanguageSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLanguage = 'en';
    localStorage.clear();
    document.documentElement.dir = '';
    document.documentElement.style.removeProperty('--ion-font-family');
  });

  it('renders an accessible trigger button', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: 'Select Language' })).toBeInTheDocument();
  });

  it('keeps the popover closed until the trigger is clicked', () => {
    render(<LanguageSelector />);
    expect(screen.queryByTestId('language-popover')).toBeNull();
  });

  it('opens the popover anchored to the click event', () => {
    render(<LanguageSelector />);
    openPopover();
    const popover = screen.getByTestId('language-popover');
    expect(popover).toBeInTheDocument();
    expect(popover).toHaveAttribute('data-has-event', 'true');
  });

  it('lists every configured language', () => {
    render(<LanguageSelector />);
    openPopover();
    ['English', 'French', 'Portuguese', 'Arabic'].forEach(label => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('highlights the active language and not the others', () => {
    currentLanguage = 'fr';
    render(<LanguageSelector />);
    openPopover();
    expect((screen.getByRole('button', { name: 'French' }) as HTMLElement).style.color).toBe(
      'var(--ion-color-primary)',
    );
    expect((screen.getByRole('button', { name: 'English' }) as HTMLElement).style.color).not.toBe(
      'var(--ion-color-primary)',
    );
  });

  it('changes the i18n language when an option is picked', () => {
    render(<LanguageSelector />);
    openPopover();
    fireEvent.click(screen.getByRole('button', { name: 'Portuguese' }));
    expect(mockChangeLanguage).toHaveBeenCalledWith('pt');
  });

  it('persists the choice for the app and for the QuML player', () => {
    render(<LanguageSelector />);
    openPopover();
    fireEvent.click(screen.getByRole('button', { name: 'Arabic' }));
    expect(localStorage.getItem('appLanguage')).toBe('ar');
    expect(localStorage.getItem('app-language')).toBe('ar');
  });

  it('closes the popover after a language is picked', () => {
    render(<LanguageSelector />);
    openPopover();
    fireEvent.click(screen.getByRole('button', { name: 'French' }));
    expect(screen.queryByTestId('language-popover')).toBeNull();
  });

  it('closes the popover when it is dismissed', () => {
    render(<LanguageSelector />);
    openPopover();
    fireEvent.click(screen.getByTestId('popover-dismiss'));
    expect(screen.queryByTestId('language-popover')).toBeNull();
  });

  it('applies the ltr direction and font of the current language', () => {
    render(<LanguageSelector />);
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.style.getPropertyValue('--ion-font-family')).toBe(
      "'Rubik', sans-serif",
    );
  });

  it('applies the rtl direction and font for Arabic', () => {
    currentLanguage = 'ar';
    render(<LanguageSelector />);
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.style.getPropertyValue('--ion-font-family')).toBe(
      "'Noto Sans Arabic', sans-serif",
    );
  });

  it('falls back to the first configured language for an unknown code', () => {
    currentLanguage = 'zz';
    render(<LanguageSelector />);
    openPopover();
    expect(document.documentElement.dir).toBe('ltr');
    expect((screen.getByRole('button', { name: 'English' }) as HTMLElement).style.color).toBe(
      'var(--ion-color-primary)',
    );
  });
});
