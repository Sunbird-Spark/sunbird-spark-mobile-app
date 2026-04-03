import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { axe } from 'jest-axe';
import { FAQSection } from './FAQSection';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../hooks/useFaqData', () => ({
  useFaqData: vi.fn(),
}));

import { useFaqData } from '../../hooks/useFaqData';

const mockFaqData = {
  general: [
    { title: 'What is Sunbird?', description: '<p>Sunbird is a learning platform.</p>' },
    { title: 'How do I enroll?', description: '<p>Click the enroll button.</p>' },
  ],
};

describe('FAQSection — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useFaqData as any).mockReturnValue({
      faqData: mockFaqData,
      isLoading: false,
      isError: false,
    });
  });

  it('renders nothing when there is an error', () => {
    (useFaqData as any).mockReturnValue({ faqData: null, isLoading: false, isError: true });
    const { container } = render(<FAQSection />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when faq list is empty', () => {
    (useFaqData as any).mockReturnValue({
      faqData: { general: [] },
      isLoading: false,
      isError: false,
    });
    const { container } = render(<FAQSection />);
    expect(container.firstChild).toBeNull();
  });

  it('FAQ buttons have aria-expanded=false when collapsed', () => {
    render(<FAQSection />);
    const buttons = screen.getAllByRole('button');
    // First item is expanded by default (expandedIndex=0), second is collapsed
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'false');
  });

  it('FAQ buttons have aria-expanded=true when expanded', () => {
    render(<FAQSection />);
    const buttons = screen.getAllByRole('button');
    // First item starts expanded (expandedIndex=0)
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
  });

  it('each FAQ button has aria-controls pointing to its answer panel', () => {
    render(<FAQSection />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('aria-controls', 'faq-answer-0');
    expect(buttons[1]).toHaveAttribute('aria-controls', 'faq-answer-1');
  });

  it('answer panel has the id referenced by aria-controls', () => {
    render(<FAQSection />);
    // First item is expanded by default
    expect(document.getElementById('faq-answer-0')).toBeInTheDocument();
  });

  it('toggles aria-expanded on button click', () => {
    render(<FAQSection />);
    const buttons = screen.getAllByRole('button');

    // First is expanded — click to collapse
    fireEvent.click(buttons[0]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');

    // Click again to expand
    fireEvent.click(buttons[0]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
  });

  it('clicking collapsed item expands it and sets aria-expanded=true', () => {
    render(<FAQSection />);
    const buttons = screen.getAllByRole('button');

    // Second item starts collapsed
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(buttons[1]);
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'true');
  });

  it('all answer panels are always in the DOM (toggled via hidden attribute)', () => {
    render(<FAQSection />);
    // Both panels exist in DOM regardless of expanded state
    expect(document.getElementById('faq-answer-0')).toBeInTheDocument();
    expect(document.getElementById('faq-answer-1')).toBeInTheDocument();
  });

  it('collapsed answer panel has hidden attribute', () => {
    render(<FAQSection />);
    // Second item starts collapsed (expandedIndex=0)
    expect(document.getElementById('faq-answer-1')).toHaveAttribute('hidden');
  });

  it('expanded answer panel does not have hidden attribute', () => {
    render(<FAQSection />);
    // First item starts expanded (expandedIndex=0)
    expect(document.getElementById('faq-answer-0')).not.toHaveAttribute('hidden');
  });

  it('has no axe violations', async () => {
    const { container } = render(<FAQSection />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
