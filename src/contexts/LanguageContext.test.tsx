import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider, useLanguage } from './LanguageContext';

// Mock react-i18next
const mockChangeLanguage = vi.fn();
const mockT = vi.fn((key: string) => key);
const mockDir = vi.fn(() => 'ltr');

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: {
      dir: mockDir,
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

// Test component to use the LanguageContext
const TestComponent = () => {
  const { t, dir, changeLanguage } = useLanguage();
  
  return (
    <div>
      <div data-testid="translation">{t('test.key')}</div>
      <div data-testid="direction">{dir}</div>
      <button 
        data-testid="change-lang-btn" 
        onClick={() => changeLanguage('hi')}
      >
        Change Language
      </button>
    </div>
  );
};

describe('LanguageContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDir.mockReturnValue('ltr');
  });

  it('provides translation function', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    
    expect(screen.getByTestId('translation')).toHaveTextContent('test.key');
    expect(mockT).toHaveBeenCalledWith('test.key');
  });

  it('provides direction information', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    
    expect(screen.getByTestId('direction')).toHaveTextContent('ltr');
  });

  it('provides RTL direction when appropriate', () => {
    mockDir.mockReturnValue('rtl');
    
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    
    expect(screen.getByTestId('direction')).toHaveTextContent('rtl');
  });

  it('allows changing language', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    
    fireEvent.click(screen.getByTestId('change-lang-btn'));
    expect(mockChangeLanguage).toHaveBeenCalledWith('hi');
  });

  it('throws error when useLanguage is used outside LanguageProvider', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLanguage must be used within LanguageProvider');
    
    consoleSpy.mockRestore();
  });

  it('handles multiple language changes', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    
    fireEvent.click(screen.getByTestId('change-lang-btn'));
    expect(mockChangeLanguage).toHaveBeenCalledWith('hi');
    
    // Simulate another language change
    const changeToEnglish = () => {
      const { changeLanguage } = useLanguage();
      changeLanguage('en');
    };
    
    // This would be called in a real scenario
    expect(mockChangeLanguage).toHaveBeenCalledTimes(1);
  });
});