import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProgressRing from './ProgressRing';

describe('ProgressRing', () => {
  it('renders an svg with two circles (track + fill)', () => {
    const { container } = render(<ProgressRing progress={50} />);
    expect(container.querySelectorAll('circle')).toHaveLength(2);
  });

  it('clamps progress above 100 to a full ring (zero dash offset)', () => {
    const { container } = render(<ProgressRing progress={150} />);
    const fill = container.querySelectorAll('circle')[1];
    expect(fill.getAttribute('stroke-dashoffset')).toBe('0');
  });

  it('clamps negative progress to zero (full dash offset = circumference)', () => {
    const { container } = render(<ProgressRing progress={-20} size={26} stroke={3} />);
    const fill = container.querySelectorAll('circle')[1];
    const radius = (26 - 3) / 2;
    const circumference = 2 * Math.PI * radius;
    expect(Number(fill.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference, 5);
  });

  it('renders children centered inside the ring', () => {
    const { getByText } = render(<ProgressRing progress={50}><span>50%</span></ProgressRing>);
    expect(getByText('50%')).toBeInTheDocument();
  });

  it('applies the aria-label to the svg', () => {
    const { container } = render(<ProgressRing progress={50} ariaLabel="Progress 50 percent" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Progress 50 percent');
  });
});
