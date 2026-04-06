import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import PageLoader from './PageLoader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../constants/assets', () => ({
  ASSETS: {
    SUNBIRD_LOGO: 'sunbird-logo.svg',
  },
}));
vi.mock('./PageLoader.css', () => ({}));

describe('PageLoader — accessibility', () => {
  it('has role="status" when loading', () => {
    render(<PageLoader />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has role="alert" when error is present', () => {
    render(<PageLoader error="Something went wrong" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('aria-label reflects loading message', () => {
    render(<PageLoader message="Please wait" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Please wait');
  });

  it('aria-label uses t("loading") as default when no message prop', () => {
    render(<PageLoader />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'loading');
  });

  it('aria-label reflects error state', () => {
    render(<PageLoader error="Network error" />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-label', 'pageLoader.somethingWentWrong');
  });

  it('logo container is hidden from assistive technology during loading', () => {
    const { container } = render(<PageLoader />);
    const logoContainer = container.querySelector('.page-loader-logo-container');
    expect(logoContainer).toHaveAttribute('aria-hidden', 'true');
  });

  it('logo container is hidden from assistive technology during error', () => {
    const { container } = render(<PageLoader error="Oops" />);
    const logoContainer = container.querySelector('.page-loader-logo-container');
    expect(logoContainer).toHaveAttribute('aria-hidden', 'true');
  });

  it('animated dots are hidden from assistive technology', () => {
    const { container } = render(<PageLoader />);
    const dots = container.querySelector('.page-loader-dots');
    expect(dots).toHaveAttribute('aria-hidden', 'true');
  });

  it('retry button has aria-label', () => {
    const onRetry = vi.fn();
    render(<PageLoader error="Failed" onRetry={onRetry} />);
    const retryBtn = screen.getByRole('button', { name: 'retry' });
    expect(retryBtn).toBeInTheDocument();
  });

  it('retry button calls onRetry when clicked', () => {
    const onRetry = vi.fn();
    render(<PageLoader error="Failed" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations in loading state', async () => {
    const { container } = render(<PageLoader />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in error state', async () => {
    const { container } = render(<PageLoader error="Failed to load" onRetry={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
