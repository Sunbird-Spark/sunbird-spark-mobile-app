import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import FaqDetailPage from './FaqDetailPage';

vi.mock('@ionic/react', () => ({
  IonPage: ({ children, className }: any) => <div className={className}>{children}</div>,
  IonContent: ({ children, className }: any) => <div data-testid="ion-content" className={className}>{children}</div>,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ category: '0' }),
}));

vi.mock('../components/layout/AppHeader', () => ({
  AppHeader: ({ title }: any) => <div data-testid="app-header">{title}</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../hooks/useImpression', () => ({ default: vi.fn() }));
vi.mock('../hooks/useInteract', () => ({ default: () => ({ interact: vi.fn() }) }));

vi.mock('../hooks/useFaqData', () => ({
  useFaqData: vi.fn(),
}));

import { useFaqData } from '../hooks/useFaqData';

const mockFaqData = {
  categories: [
    {
      title: 'General',
      slug: 'general',
      faqs: [
        { question: 'What is this app?', answer: 'A learning platform.' },
        { question: 'How do I enroll?', answer: 'Go to Explore page.' },
      ],
    },
  ],
};

describe('FaqDetailPage — landmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useFaqData as any).mockReturnValue({ faqData: mockFaqData, isLoading: false, isError: false });
  });

  it('renders the page', () => {
    render(<FaqDetailPage />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });

  it('has a <main id="main-content"> landmark', () => {
    const { container } = render(<FaqDetailPage />);
    expect(container.querySelector('main#main-content')).toBeInTheDocument();
  });

  it('FAQ content is inside the main landmark', () => {
    const { container } = render(<FaqDetailPage />);
    const main = container.querySelector('main#main-content')!;
    expect(main.textContent).toContain("General FAQ's");
  });

  it('FAQ questions are rendered inside main', () => {
    const { container } = render(<FaqDetailPage />);
    const main = container.querySelector('main#main-content')!;
    expect(main.textContent).toContain('What is this app?');
  });

  it('FAQ accordion toggle buttons have aria-expanded', () => {
    const { container } = render(<FaqDetailPage />);
    const toggleButtons = container.querySelectorAll('button.fd-faq-question');
    expect(toggleButtons.length).toBeGreaterThan(0);
    toggleButtons.forEach(btn => {
      expect(btn).toHaveAttribute('aria-expanded');
    });
  });

  it('shows loading message inside main when loading', () => {
    (useFaqData as any).mockReturnValue({ faqData: null, isLoading: true, isError: false });
    const { container } = render(<FaqDetailPage />);
    const main = container.querySelector('main#main-content')!;
    expect(main.textContent).toContain('faqSection.loading');
  });

  it('shows error message inside main when error', () => {
    (useFaqData as any).mockReturnValue({ faqData: null, isLoading: false, isError: true });
    const { container } = render(<FaqDetailPage />);
    const main = container.querySelector('main#main-content')!;
    expect(main.textContent).toContain('faqSection.error');
  });

  it('first FAQ toggle button is expanded by default', () => {
    const { container } = render(<FaqDetailPage />);
    const firstToggle = container.querySelector('button.fd-faq-question')!;
    expect(firstToggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('clicking an expanded FAQ toggle collapses it', () => {
    const { container } = render(<FaqDetailPage />);
    const firstToggle = container.querySelector('button.fd-faq-question')!;
    fireEvent.click(firstToggle as HTMLElement);
    expect(firstToggle).toHaveAttribute('aria-expanded', 'false');
  });

  // ── Accessibility Tests ──

  it('FAQ toggle buttons have aria-controls linking to answer panels', () => {
    const { container } = render(<FaqDetailPage />);
    const toggleButtons = container.querySelectorAll('button.fd-faq-question');
    toggleButtons.forEach((btn, idx) => {
      expect(btn).toHaveAttribute('aria-controls', `faq-answer-${idx}`);
    });
  });

  it('FAQ answer panels have matching id for aria-controls', () => {
    const { container } = render(<FaqDetailPage />);
    const answerPanels = container.querySelectorAll('.fd-faq-answer');
    answerPanels.forEach((panel, idx) => {
      expect(panel).toHaveAttribute('id', `faq-answer-${idx}`);
    });
  });

  it('chevron icons are hidden from screen readers', () => {
    const { container } = render(<FaqDetailPage />);
    const chevrons = container.querySelectorAll('.fd-faq-chevron');
    chevrons.forEach(chevron => {
      expect(chevron).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('clicking "yes" feedback shows thank-you message', () => {
    const { container } = render(<FaqDetailPage />);
    // First FAQ is expanded (index 0), feedback row is visible
    const yesBtn = container.querySelector('.fd-feedback-yes') as HTMLElement;
    expect(yesBtn).toBeInTheDocument();
    fireEvent.click(yesBtn);
    expect(container.querySelector('.fd-feedback-thanks')).toBeInTheDocument();
  });

  it('clicking "no" feedback shows the feedback form', () => {
    const { container } = render(<FaqDetailPage />);
    const noBtn = container.querySelector('.fd-feedback-no') as HTMLElement;
    expect(noBtn).toBeInTheDocument();
    fireEvent.click(noBtn);
    expect(container.querySelector('.fd-feedback-form')).toBeInTheDocument();
  });

  it('clicking cancel from feedback form returns to feedback row', () => {
    const { container } = render(<FaqDetailPage />);
    const noBtn = container.querySelector('.fd-feedback-no') as HTMLElement;
    fireEvent.click(noBtn);
    const cancelBtn = container.querySelector('.fd-feedback-cancel') as HTMLElement;
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);
    // Back to feedback row
    expect(container.querySelector('.fd-feedback-row')).toBeInTheDocument();
  });

  it('submitting feedback shows thank-you and hides form', () => {
    const { container } = render(<FaqDetailPage />);
    const noBtn = container.querySelector('.fd-feedback-no') as HTMLElement;
    fireEvent.click(noBtn);
    const textarea = container.querySelector('.fd-feedback-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Great improvement!' } });
    const submitBtn = container.querySelector('.fd-feedback-submit') as HTMLElement;
    fireEvent.click(submitBtn);
    expect(container.querySelector('.fd-feedback-thanks')).toBeInTheDocument();
  });

  it('renders default title when category is not found', () => {
    (useFaqData as any).mockReturnValue({
      faqData: { categories: [] },
      isLoading: false,
      isError: false,
    });
    render(<FaqDetailPage />);
    expect(screen.getByText("FAQ's")).toBeInTheDocument();
  });

  it('feedback submit button is disabled when textarea is empty', () => {
    const { container } = render(<FaqDetailPage />);
    const noBtn = container.querySelector('.fd-feedback-no') as HTMLElement;
    fireEvent.click(noBtn);
    const submitBtn = container.querySelector('.fd-feedback-submit') as HTMLButtonElement;
    expect(submitBtn).toBeDisabled();
  });
});
