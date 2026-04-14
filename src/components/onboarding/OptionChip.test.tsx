import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OptionChip from './OptionChip';
import { OnboardingField } from '../../types/onboardingTypes';

const mockField: OnboardingField = {
  id: 'english',
  index: 0,
  label: 'English',
};

describe('OptionChip', () => {
  it('renders the field label', () => {
    render(<OptionChip field={mockField} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('applies default style when not selected', () => {
    const { container } = render(
      <OptionChip field={mockField} isSelected={false} onClick={vi.fn()} />
    );
    expect(container.querySelector('.onboarding-chip--default')).toBeInTheDocument();
    expect(container.querySelector('.onboarding-chip--selected')).not.toBeInTheDocument();
  });

  it('applies selected style when selected', () => {
    const { container } = render(
      <OptionChip field={mockField} isSelected={true} onClick={vi.fn()} />
    );
    expect(container.querySelector('.onboarding-chip--selected')).toBeInTheDocument();
    expect(container.querySelector('.onboarding-chip--default')).not.toBeInTheDocument();
  });

  it('shows checkmark icon when selected', () => {
    const { container } = render(
      <OptionChip field={mockField} isSelected={true} onClick={vi.fn()} />
    );
    expect(container.querySelector('.onboarding-chip__check')).toBeInTheDocument();
  });

  it('does not show checkmark when not selected', () => {
    const { container } = render(
      <OptionChip field={mockField} isSelected={false} onClick={vi.fn()} />
    );
    expect(container.querySelector('.onboarding-chip__check')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<OptionChip field={mockField} isSelected={false} onClick={onClick} />);
    fireEvent.click(screen.getByText('English'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // ── Accessibility Tests ──

  it('has role="radio" for radiogroup semantics', () => {
    render(<OptionChip field={mockField} isSelected={false} onClick={vi.fn()} />);
    const btn = screen.getByRole('radio');
    expect(btn).toBeInTheDocument();
  });

  it('has aria-checked="false" when not selected', () => {
    render(<OptionChip field={mockField} isSelected={false} onClick={vi.fn()} />);
    const btn = screen.getByRole('radio');
    expect(btn).toHaveAttribute('aria-checked', 'false');
  });

  it('has aria-checked="true" when selected', () => {
    render(<OptionChip field={mockField} isSelected={true} onClick={vi.fn()} />);
    const btn = screen.getByRole('radio');
    expect(btn).toHaveAttribute('aria-checked', 'true');
  });

  it('check SVG is hidden from screen readers when selected', () => {
    const { container } = render(
      <OptionChip field={mockField} isSelected={true} onClick={vi.fn()} />
    );
    const checkSvg = container.querySelector('.onboarding-chip__check');
    expect(checkSvg).toHaveAttribute('aria-hidden', 'true');
  });
});
