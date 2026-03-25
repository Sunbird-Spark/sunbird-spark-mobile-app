import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  it('renders the correct number of segments', () => {
    const { container } = render(
      <ProgressBar totalSteps={3} currentStep={1} />
    );
    const segments = container.querySelectorAll('.onboarding-progress__segment');
    expect(segments).toHaveLength(3);
  });

  it('marks completed segments correctly', () => {
    const { container } = render(
      <ProgressBar totalSteps={3} currentStep={2} />
    );
    const completed = container.querySelectorAll('.onboarding-progress__segment--completed');
    const remaining = container.querySelectorAll('.onboarding-progress__segment--remaining');
    expect(completed).toHaveLength(2);
    expect(remaining).toHaveLength(1);
  });

  it('displays the step counter', () => {
    render(<ProgressBar totalSteps={3} currentStep={2} />);
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('does not show back button when showBack is false', () => {
    const { container } = render(
      <ProgressBar totalSteps={3} currentStep={1} showBack={false} />
    );
    expect(container.querySelector('.onboarding-progress__back')).not.toBeInTheDocument();
  });

  it('shows back button when showBack is true', () => {
    const { container } = render(
      <ProgressBar totalSteps={3} currentStep={2} showBack={true} onBack={vi.fn()} />
    );
    expect(container.querySelector('.onboarding-progress__back')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    const { container } = render(
      <ProgressBar totalSteps={3} currentStep={2} showBack={true} onBack={onBack} />
    );
    fireEvent.click(container.querySelector('.onboarding-progress__back')!);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('disables back button when isSubmitting is true', () => {
    const { container } = render(
      <ProgressBar totalSteps={3} currentStep={2} showBack={true} onBack={vi.fn()} isSubmitting={true} />
    );
    expect(container.querySelector('.onboarding-progress__back')).toBeDisabled();
  });
});
