import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';

// Mock Ionic components
jest.mock('@ionic/react', () => ({
    IonSelect: ({ children, onIonChange, value, interface: interfaceType, placeholder, color }: any) => (
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
    IonSelectOption: ({ children, value }: any) => (
        <option value={value}>{children}</option>
    ),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
    useTranslation: jest.fn(),
}));

describe('LanguageSwitcher', () => {
    const mockChangeLanguage = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders with English as current language', () => {
        (useTranslation as jest.Mock).mockReturnValue({
            i18n: {
                language: 'en',
                changeLanguage: mockChangeLanguage,
            },
        });

        render(<LanguageSwitcher />);

        const select = screen.getByTestId('language-select');
        expect(select).toBeInTheDocument();
        expect(select).toHaveValue('en');
    });

    it('renders with Hindi as current language', () => {
        (useTranslation as jest.Mock).mockReturnValue({
            i18n: {
                language: 'hi',
                changeLanguage: mockChangeLanguage,
            },
        });

        render(<LanguageSwitcher />);

        const select = screen.getByTestId('language-select');
        expect(select).toHaveValue('hi');
    });

    it('displays all available languages', () => {
        (useTranslation as jest.Mock).mockReturnValue({
            i18n: {
                language: 'en',
                changeLanguage: mockChangeLanguage,
            },
        });

        render(<LanguageSwitcher />);

        expect(screen.getByText('English')).toBeInTheDocument();
        expect(screen.getByText('हिन्दी')).toBeInTheDocument();
    });

    it('changes language when option is selected', () => {
        (useTranslation as jest.Mock).mockReturnValue({
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
        (useTranslation as jest.Mock).mockReturnValue({
            i18n: {
                language: 'en',
                changeLanguage: mockChangeLanguage,
            },
        });

        render(<LanguageSwitcher color="secondary" />);

        const select = screen.getByTestId('language-select');
        expect(select).toHaveAttribute('data-color', 'secondary');
    });

    it('applies custom interface prop', () => {
        (useTranslation as jest.Mock).mockReturnValue({
            i18n: {
                language: 'en',
                changeLanguage: mockChangeLanguage,
            },
        });

        render(<LanguageSwitcher interface="action-sheet" />);

        const select = screen.getByTestId('language-select');
        expect(select).toHaveAttribute('data-interface', 'action-sheet');
    });
});
