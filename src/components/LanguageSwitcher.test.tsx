import { fireEvent, render, screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LanguageSwitcher from './LanguageSwitcher';

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonApp: ({ children }: any) => <div>{children}</div>,
  IonRouterOutlet: ({ children }: any) => <div>{children}</div>,
  IonPage: ({ children }: any) => <div>{children}</div>,
  IonHeader: ({ children }: any) => <header>{children}</header>,
  IonToolbar: ({ children }: any) => <div>{children}</div>,
  IonTitle: ({ children }: any) => <div>{children}</div>,
  IonContent: ({ children }: any) => <div>{children}</div>,
  IonButton: ({ children }: any) => <button>{children}</button>,
  IonIcon: () => <span />,
  IonSpinner: () => <span />,
  IonCard: ({ children }: any) => <div>{children}</div>,
  IonCardHeader: ({ children }: any) => <div>{children}</div>,
  IonCardTitle: ({ children }: any) => <div>{children}</div>,
  IonCardContent: ({ children }: any) => <div>{children}</div>,
  IonText: ({ children }: any) => <span>{children}</span>,
  IonGrid: ({ children }: any) => <div>{children}</div>,
  IonRow: ({ children }: any) => <div>{children}</div>,
  IonCol: ({ children }: any) => <div>{children}</div>,
  IonBadge: ({ children }: any) => <span>{children}</span>,
  IonPopover: ({ children, isOpen }: any) => (isOpen ? <div>{children}</div> : null),
  IonImg: ({ src, alt }: any) => <img src={src} alt={alt} />,
  IonProgressBar: () => <span />,
  IonPopover: ({ children }: any) => <div>{children}</div>,
  IonImg: ({ src, alt }: any) => <img src={src} alt={alt} />,
  useIonRouter: () => ({ push: vi.fn() }),
    children,
    onIonChange,
    value,
    interface: interfaceType,
    placeholder,
    color,
  }: unknown) => (
    <select
      data-testid="language-select"
      onChange={(e) => onIonChange({ detail: { value: e.target.value } })}
      value={value}
      data-interface={interfaceType}
      data-placeholder={placeholder}
      data-color={color}
    >
      {children}
    </select>
  ),
  IonSelectOption: ({ children, value }: unknown) => <option value={value}>{children}</option>,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

describe('LanguageSwitcher', () => {
  const mockChangeLanguage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with English as current language', () => {
    (useTranslation as unknown).mockReturnValue({
      i18n: {
        language: 'en',
        changeLanguage: mockChangeLanguage,
      },
    });

    render(<LanguageSwitcher />);

    const select = screen.getByTestId('language-select');
    expect(select).toBeDefined();
    expect((select as HTMLSelectElement).value).toBe('en');
    expect(select.getAttribute('data-color')).toBe('primary');
  });

  it('renders with Hindi as current language', () => {
    (useTranslation as unknown).mockReturnValue({
      i18n: {
        language: 'hi',
        changeLanguage: mockChangeLanguage,
      },
    });

    render(<LanguageSwitcher />);

    const select = screen.getByTestId('language-select');
    expect(select).toBeDefined();
    expect((select as HTMLSelectElement).value).toBe('hi');
  });

  it('displays all available languages', () => {
    (useTranslation as unknown).mockReturnValue({
      i18n: {
        language: 'en',
        changeLanguage: mockChangeLanguage,
      },
    });

    render(<LanguageSwitcher />);

    expect(screen.getByText('English'));
    expect(screen.getByText('हिन्दी'));
  });

  it('changes language when option is selected', () => {
    (useTranslation as unknown).mockReturnValue({
      i18n: {
        language: 'en',
        changeLanguage: mockChangeLanguage,
      },
    });

    render(<LanguageSwitcher />);

    const select = screen.getByTestId('language-select');
    fireEvent.change(select, { target: { value: 'hi' } });

    expect(mockChangeLanguage).toHaveBeenCalledWith('hi');
  });

  it('applies custom color prop', () => {
    (useTranslation as unknown).mockReturnValue({
      i18n: {
        language: 'en',
        changeLanguage: mockChangeLanguage,
      },
    });

    render(<LanguageSwitcher color="secondary" />);

    const select = screen.getByTestId('language-select');
    expect(select).toBeDefined();
    expect(select.getAttribute('data-color')).toBe('secondary');
  });

  it('applies custom interface prop', () => {
    (useTranslation as unknown).mockReturnValue({
      i18n: {
        language: 'en',
        changeLanguage: mockChangeLanguage,
      },
    });

    render(<LanguageSwitcher interface="action-sheet" />);

    const select = screen.getByTestId('language-select');
    expect(select).toBeDefined();
    expect(select.getAttribute('data-interface')).toBe('action-sheet');
  });
});
