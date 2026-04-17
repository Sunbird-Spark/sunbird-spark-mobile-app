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

vi.mock('./DissolveLoader', () => ({
  DissolveLoader: ({ message }: { message?: string }) => (
    <div data-testid="dissolve-loader" data-message={message} />
  ),
}));

describe('PageLoader — loading state', () => {
  it('renders DissolveLoader when no error', () => {
    render(<PageLoader />);
    expect(screen.getByTestId('dissolve-loader')).toBeInTheDocument();
  });

  it('passes message to DissolveLoader', () => {
    render(<PageLoader message="Please wait" />);
    expect(screen.getByTestId('dissolve-loader')).toHaveAttribute('data-message', 'Please wait');
  });

  it('passes t("loading") as default message to DissolveLoader', () => {
    render(<PageLoader />);
    expect(screen.getByTestId('dissolve-loader')).toHaveAttribute('data-message', 'loading');
  });

  it('does not render error UI when no error', () => {
    const { container } = render(<PageLoader />);
    expect(container.querySelector('.page-loader-error-title')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('PageLoader — error state', () => {
  it('does not render DissolveLoader when error is present', () => {
    render(<PageLoader error="Something went wrong" />);
    expect(screen.queryByTestId('dissolve-loader')).not.toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<PageLoader error="Network failure" />);
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });

  it('shows error title via i18n key', () => {
    render(<PageLoader error="Oops" />);
    expect(screen.getByText('pageLoader.somethingWentWrong')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const onRetry = vi.fn();
    render(<PageLoader error="Failed" onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: 'retry' })).toBeInTheDocument();
  });

  it('does not render retry button without onRetry', () => {
    render(<PageLoader error="Failed" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<PageLoader error="Failed" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('logo container is aria-hidden in error state', () => {
    const { container } = render(<PageLoader error="Oops" />);
    expect(container.querySelector('.page-loader-logo-container')).toHaveAttribute('aria-hidden', 'true');
  });
});

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

  it('aria-label uses t("loading") as default', () => {
    render(<PageLoader />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'loading');
  });

  it('aria-label reflects error state', () => {
    render(<PageLoader error="Network error" />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-label', 'pageLoader.somethingWentWrong');
  });

  it('retry button has aria-label', () => {
    render(<PageLoader error="Failed" onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'retry' })).toBeInTheDocument();
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

describe('PageLoader — fullPage prop', () => {
  it('applies .page-loader class by default (fullPage=true)', () => {
    const { container } = render(<PageLoader />);
    expect(container.firstChild).toHaveClass('page-loader');
    expect(container.firstChild).not.toHaveClass('page-loader--inline');
  });

  it('applies .page-loader--inline when fullPage=false', () => {
    const { container } = render(<PageLoader fullPage={false} />);
    expect(container.firstChild).toHaveClass('page-loader');
    expect(container.firstChild).toHaveClass('page-loader--inline');
  });
});
