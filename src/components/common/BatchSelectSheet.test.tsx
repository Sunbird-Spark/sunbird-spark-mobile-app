import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BatchSelectSheet from './BatchSelectSheet';
import type { BatchSelectSheetProps } from './BatchSelectSheet';

vi.mock('@ionic/react', () => ({
  IonModal: ({ isOpen, children }: any) => (isOpen ? <div data-testid="ion-modal">{children}</div> : null),
  IonSpinner: () => <div data-testid="ion-spinner" />,
}));

vi.mock('./BatchSelectSheet.css', () => ({}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const TWO_BATCHES = [
  { identifier: 'b1', name: 'Batch One' },
  { identifier: 'b2', name: 'Batch Two' },
];

const renderSheet = (overrides: Partial<BatchSelectSheetProps> = {}) => {
  const props: BatchSelectSheetProps = {
    isOpen: true,
    onClose: vi.fn(),
    batches: TWO_BATCHES,
    loading: false,
    selectedBatchId: '',
    onSelect: vi.fn(),
    onConfirm: vi.fn(),
    confirming: false,
    ...overrides,
  };
  return { props, ...render(<BatchSelectSheet {...props} />) };
};

const cta = () => screen.getByRole('button', { name: 'collection.joinTheBatch' });

describe('BatchSelectSheet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the confirm CTA when open and nothing when closed', () => {
    const { unmount } = renderSheet();
    expect(cta()).toBeInTheDocument();
    unmount();

    renderSheet({ isOpen: false });
    expect(screen.queryByTestId('ion-modal')).not.toBeInTheDocument();
  });

  it('disables the CTA until a batch is selected', () => {
    const { unmount } = renderSheet();
    expect(cta()).toBeDisabled();
    unmount();

    renderSheet({ selectedBatchId: 'b1' });
    expect(cta()).toBeEnabled();
  });

  describe('single-batch auto-select', () => {
    it('pre-selects the only batch so the CTA does not open greyed out', () => {
      const onSelect = vi.fn();
      renderSheet({ batches: [{ identifier: 'only', name: 'Only Batch' }], onSelect });
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('only');
    });

    it('does not auto-select when there is more than one batch', () => {
      const onSelect = vi.fn();
      renderSheet({ onSelect });
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('does not override a selection the user already made', () => {
      const onSelect = vi.fn();
      renderSheet({ batches: [{ identifier: 'only' }], selectedBatchId: 'only', onSelect });
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('does not auto-select while the sheet is closed', () => {
      const onSelect = vi.fn();
      renderSheet({ isOpen: false, batches: [{ identifier: 'only' }], onSelect });
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  it('reports the chosen batch on change', () => {
    const onSelect = vi.fn();
    renderSheet({ onSelect });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b2' } });
    expect(onSelect).toHaveBeenCalledWith('b2');
  });

  it('confirms once when enabled and never when disabled', () => {
    const onConfirm = vi.fn();
    const { unmount } = renderSheet({ selectedBatchId: 'b1', onConfirm });
    fireEvent.click(cta());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    unmount();

    const blocked = vi.fn();
    renderSheet({ onConfirm: blocked });
    fireEvent.click(cta());
    expect(blocked).not.toHaveBeenCalled();
  });

  it('shows a spinner and blocks re-submission while confirming', () => {
    renderSheet({ selectedBatchId: 'b1', confirming: true });
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '' })).toBeDisabled();
  });

  it('closes via the close button', () => {
    const onClose = vi.fn();
    renderSheet({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('batch-list states', () => {
    it('shows a spinner while loading and keeps the CTA disabled', () => {
      renderSheet({ loading: true, batches: [] });
      expect(screen.getByTestId('ion-spinner')).toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(cta()).toBeDisabled();
    });

    it('shows the list error and keeps the CTA disabled', () => {
      renderSheet({ error: 'batch list boom', batches: [] });
      expect(screen.getByText('batch list boom')).toBeInTheDocument();
      expect(cta()).toBeDisabled();
    });

    it('shows the empty state and keeps the CTA disabled', () => {
      renderSheet({ batches: [] });
      expect(screen.getByText('collection.noBatchesAvailable')).toBeInTheDocument();
      expect(cta()).toBeDisabled();
    });
  });

  it('surfaces an enrol failure', () => {
    renderSheet({ selectedBatchId: 'b1', confirmError: 'enrol rejected' });
    expect(screen.getByText('enrol rejected')).toBeInTheDocument();
  });

  it('accepts an overridden CTA label and title', () => {
    renderSheet({ ctaLabel: 'Join The Path Batch', title: 'Path Batches' });
    expect(screen.getByRole('button', { name: 'Join The Path Batch' })).toBeInTheDocument();
    expect(screen.getByText('Path Batches')).toBeInTheDocument();
  });
});
