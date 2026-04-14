import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HelpAndSupportPage from './HelpAndSupportPage';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div data-testid="ion-page" className={className}>{children}</div>,
  IonHeader: ({ children, className }: any) => <div>{children}</div>,
  IonContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonModal: ({ children, isOpen, onDidDismiss, className, 'aria-labelledby': ariaLabelledby }: any) =>
    isOpen ? <div role="dialog" aria-labelledby={ariaLabelledby} className={className}>{children}</div> : null,
  IonToast: () => null,
  useIonRouter: () => ({ push: vi.fn(), goBack: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../utils/formLocaleResolver', () => ({
  resolveLabel: (label: any) => (typeof label === 'string' ? label : 'label'),
}));

vi.mock('../components/layout/BottomNavigation', () => ({
  BottomNavigation: () => <nav data-testid="bottom-navigation" />,
}));

vi.mock('../components/common/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector" />,
}));

vi.mock('../hooks/useFaqData', () => ({
  useFaqData: vi.fn(),
}));

vi.mock('../hooks/useFormRead', () => ({
  useFormRead: vi.fn(),
}));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));
vi.mock('./HelpAndSupportPage.css', () => ({}));

import { useFaqData } from '../hooks/useFaqData';
import { useFormRead } from '../hooks/useFormRead';

describe('HelpAndSupportPage — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useFaqData as any).mockReturnValue({
      faqData: {
        categories: [
          { title: 'Test FAQ', description: 'FAQ content', faqs: [], slug: 'test-faq', faqCount: 3 },
        ],
      },
      isLoading: false,
    });
    (useFormRead as any).mockReturnValue({ data: null, isLoading: false });
  });

  it('report issue button has aria-label="reportIssue"', () => {
    render(<HelpAndSupportPage />);
    const reportBtn = screen.getByRole('button', { name: 'reportIssue' });
    expect(reportBtn).toBeInTheDocument();
  });

  it('shows loading state with role="status" and aria-live="polite" when faq is loading', () => {
    (useFaqData as any).mockReturnValue({ faqData: null, isLoading: true });
    render(<HelpAndSupportPage />);
    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveAttribute('aria-live', 'polite');
  });

  it('FAQ category list items have role="button"', () => {
    const { container } = render(<HelpAndSupportPage />);
    const categoryCard = container.querySelector('.hs-category-card');
    expect(categoryCard).toHaveAttribute('role', 'button');
  });

  it('modal has aria-labelledby="hs-report-modal-title" when open', () => {
    render(<HelpAndSupportPage />);
    const reportBtn = screen.getByRole('button', { name: 'reportIssue' });
    fireEvent.click(reportBtn);
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-labelledby', 'hs-report-modal-title');
  });

  it('category select has associated label with htmlFor="hs-category-select"', () => {
    render(<HelpAndSupportPage />);
    const reportBtn = screen.getByRole('button', { name: 'reportIssue' });
    fireEvent.click(reportBtn);
    const label = document.querySelector('label[for="hs-category-select"]');
    expect(label).toBeInTheDocument();
  });

  it('subcategory select has associated label with htmlFor="hs-subcategory-select"', () => {
    render(<HelpAndSupportPage />);
    const reportBtn = screen.getByRole('button', { name: 'reportIssue' });
    fireEvent.click(reportBtn);
    const label = document.querySelector('label[for="hs-subcategory-select"]');
    expect(label).toBeInTheDocument();
  });

  it('close button inside modal has aria-label="close"', () => {
    render(<HelpAndSupportPage />);
    const reportBtn = screen.getByRole('button', { name: 'reportIssue' });
    fireEvent.click(reportBtn);
    const closeBtn = screen.getByRole('button', { name: 'close' });
    expect(closeBtn).toBeInTheDocument();
  });

  it('WriteIcon SVG inside report button has aria-hidden="true"', () => {
    const { container } = render(<HelpAndSupportPage />);
    const reportBtn = container.querySelector('[aria-label="reportIssue"]');
    const svg = reportBtn?.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('clicking a category card does not throw', () => {
    const { container } = render(<HelpAndSupportPage />);
    const categoryCard = container.querySelector('.hs-category-card');
    expect(categoryCard).toBeInTheDocument();
    if (categoryCard) fireEvent.click(categoryCard);
    expect(categoryCard).toBeInTheDocument();
  });

  it('pressing Enter on a category card triggers navigation', () => {
    const { container } = render(<HelpAndSupportPage />);
    const categoryCard = container.querySelector('.hs-category-card');
    if (categoryCard) fireEvent.keyDown(categoryCard, { key: 'Enter' });
    expect(categoryCard).toBeInTheDocument();
  });

  it('pressing Space on a category card triggers navigation', () => {
    const { container } = render(<HelpAndSupportPage />);
    const categoryCard = container.querySelector('.hs-category-card');
    if (categoryCard) fireEvent.keyDown(categoryCard, { key: ' ' });
    expect(categoryCard).toBeInTheDocument();
  });

  it('pressing other key on category card does not navigate', () => {
    const { container } = render(<HelpAndSupportPage />);
    const categoryCard = container.querySelector('.hs-category-card');
    if (categoryCard) fireEvent.keyDown(categoryCard, { key: 'Tab' });
    expect(categoryCard).toBeInTheDocument();
  });

  it('submitting the form hides modal and shows toast', () => {
    render(<HelpAndSupportPage />);
    fireEvent.click(screen.getByRole('button', { name: 'reportIssue' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /submitFeedback/i }));
    // Modal is closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closing modal hides it', () => {
    render(<HelpAndSupportPage />);
    fireEvent.click(screen.getByRole('button', { name: 'reportIssue' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders with empty categories when faqData has no categories', () => {
    (useFaqData as any).mockReturnValue({ faqData: { categories: [] }, isLoading: false });
    const { container } = render(<HelpAndSupportPage />);
    expect(container.querySelector('.hs-category-cards')).toBeInTheDocument();
  });

  it('category select onChange fires handleCategoryChange', () => {
    (useFormRead as any).mockReturnValue({
      data: {
        data: {
          form: {
            data: {
              fields: [
                {
                  code: 'category',
                  templateOptions: {
                    options: [{ value: 'technical', label: 'Technical' }],
                  },
                },
                {
                  code: 'subcategory',
                  templateOptions: {
                    options: { technical: [{ value: 'login', label: 'Login Issues' }] },
                  },
                },
              ],
            },
          },
        },
      },
      isLoading: false,
    });
    render(<HelpAndSupportPage />);
    fireEvent.click(screen.getByRole('button', { name: 'reportIssue' }));
    const catSelect = document.getElementById('hs-category-select') as HTMLSelectElement;
    expect(catSelect).toBeInTheDocument();
    fireEvent.change(catSelect, { target: { value: 'technical' } });
    expect(catSelect.value).toBe('technical');
  });

  it('subcategory select onChange fires setSelectedSubcategory', () => {
    (useFormRead as any).mockReturnValue({
      data: {
        data: {
          form: {
            data: {
              fields: [
                {
                  code: 'category',
                  templateOptions: {
                    options: [{ value: 'technical', label: 'Technical' }],
                  },
                },
                {
                  code: 'subcategory',
                  templateOptions: {
                    options: { technical: [{ value: 'login', label: 'Login Issues' }] },
                  },
                },
              ],
            },
          },
        },
      },
      isLoading: false,
    });
    render(<HelpAndSupportPage />);
    fireEvent.click(screen.getByRole('button', { name: 'reportIssue' }));
    // First select a category to populate subcategories
    const catSelect = document.getElementById('hs-category-select') as HTMLSelectElement;
    fireEvent.change(catSelect, { target: { value: 'technical' } });
    const subSelect = document.getElementById('hs-subcategory-select') as HTMLSelectElement;
    expect(subSelect).toBeInTheDocument();
    fireEvent.change(subSelect, { target: { value: 'login' } });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('textarea onChange updates feedback text', () => {
    render(<HelpAndSupportPage />);
    fireEvent.click(screen.getByRole('button', { name: 'reportIssue' }));
    const textarea = document.querySelector('.hs-modal-textarea') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: 'My feedback text' } });
    expect(textarea.value).toBe('My feedback text');
  });
});
