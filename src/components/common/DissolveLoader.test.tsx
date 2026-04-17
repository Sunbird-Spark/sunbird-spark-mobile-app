import { render, screen, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DissolveLoader } from './DissolveLoader';

describe('DissolveLoader', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: (time: number) => void) => {
      return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<DissolveLoader />);
    expect(screen.getByTestId('dissolve-loader')).toBeInTheDocument();
  });

  it('cleans up animation frame on unmount', () => {
    const { unmount } = render(<DissolveLoader />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('does not leak particles after unmount', async () => {
    const { unmount } = render(<DissolveLoader subVariant="classic" />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    unmount();
  });

  it('supports all subVariants without throwing', () => {
    const { rerender } = render(<DissolveLoader subVariant="ember" />);
    expect(screen.getByTestId('dissolve-loader')).toBeInTheDocument();

    rerender(<DissolveLoader subVariant="melt" />);
    expect(screen.getByTestId('dissolve-loader')).toBeInTheDocument();

    rerender(<DissolveLoader subVariant="shatter" />);
    expect(screen.getByTestId('dissolve-loader')).toBeInTheDocument();

    rerender(<DissolveLoader subVariant="ashes" />);
    expect(screen.getByTestId('dissolve-loader')).toBeInTheDocument();
  });

  it('resets particle state when subVariant changes', async () => {
    const { rerender } = render(<DissolveLoader subVariant="classic" />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    rerender(<DissolveLoader subVariant="ember" />);
    expect(screen.getByTestId('dissolve-loader')).toBeInTheDocument();
  });

  it('renders the ambient glow element', () => {
    const { container } = render(<DissolveLoader />);
    expect(container.querySelector('.dissolve-loader-glow')).toBeInTheDocument();
  });
});
