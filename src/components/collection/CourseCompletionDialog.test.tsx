import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CourseCompletionDialog from './CourseCompletionDialog';

// Mock Ionic's modal - it only needs to honour isOpen and expose the dismiss hook.
let dismissModal: (() => void) | undefined;
vi.mock('@ionic/react', () => ({
  IonModal: ({ children, isOpen, onDidDismiss, className }: any) => {
    dismissModal = onDidDismiss;
    if (!isOpen) return null;
    return <div data-testid="ion-modal" className={className}>{children}</div>;
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'courseCompletion.congratulations': 'Congratulations!',
        'courseCompletion.successMessage': 'You completed the course',
        'courseCompletion.certificateMessage': 'Your certificate is on its way',
        'courseCompletion.noCertificateNote': 'No certificate for this course',
        'courseCompletion.continue': 'Continue',
      };
      return map[key] ?? key;
    },
  }),
}));

type Props = React.ComponentProps<typeof CourseCompletionDialog>;

const baseProps: Props = {
  progressPercentage: 40,
  isEnrolled: true,
  isEnrollmentLoading: false,
  isViewActive: true,
  collectionId: 'do_collection_1',
  hasCertificate: true,
  progressBeforePlayer: null,
};

const modal = () => screen.queryByTestId('ion-modal');

/** Render, then re-render with a new progress value, flushing the queued microtasks. */
const renderThenProgress = async (props: Partial<Props>, nextProgress: number) => {
  const merged = { ...baseProps, ...props };
  const utils = render(<CourseCompletionDialog {...merged} />);
  await act(async () => { });
  utils.rerender(<CourseCompletionDialog {...merged} progressPercentage={nextProgress} />);
  await act(async () => { });
  return utils;
};

describe('CourseCompletionDialog', () => {
  it('renders nothing while the course is incomplete', async () => {
    render(<CourseCompletionDialog {...baseProps} />);
    await act(async () => { });
    expect(modal()).not.toBeInTheDocument();
  });

  it('opens when progress crosses from below 100 to 100', async () => {
    await renderThenProgress({}, 100);

    expect(modal()).toBeInTheDocument();
    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
    expect(screen.getByText('You completed the course')).toBeInTheDocument();
  });

  it('opens on the first data point when completion happened while the player was open', async () => {
    render(<CourseCompletionDialog {...baseProps} progressPercentage={100} progressBeforePlayer={60} />);
    await act(async () => { });

    expect(modal()).toBeInTheDocument();
  });

  it('stays closed when the course was already complete before mounting', async () => {
    render(<CourseCompletionDialog {...baseProps} progressPercentage={100} />);
    await act(async () => { });

    expect(modal()).not.toBeInTheDocument();
  });

  it('stays closed when the pre-player snapshot was already complete', async () => {
    render(
      <CourseCompletionDialog {...baseProps} progressPercentage={100} progressBeforePlayer={100} />,
    );
    await act(async () => { });

    expect(modal()).not.toBeInTheDocument();
  });

  describe('guards', () => {
    it('does not open while the page is cached in the background', async () => {
      await renderThenProgress({ isViewActive: false }, 100);
      expect(modal()).not.toBeInTheDocument();
    });

    it('does not open while enrollment data is still loading', async () => {
      await renderThenProgress({ isEnrollmentLoading: true }, 100);
      expect(modal()).not.toBeInTheDocument();
    });

    it('does not open for a user who is not enrolled', async () => {
      await renderThenProgress({ isEnrolled: false }, 100);
      expect(modal()).not.toBeInTheDocument();
    });

    it('does not open without a collection id', async () => {
      await renderThenProgress({ collectionId: undefined }, 100);
      expect(modal()).not.toBeInTheDocument();
    });
  });

  it('only celebrates a given collection once', async () => {
    const { rerender } = await renderThenProgress({}, 100);
    expect(modal()).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(modal()).not.toBeInTheDocument();

    // Progress dips (e.g. new units added) and completes again - no second popup.
    rerender(<CourseCompletionDialog {...baseProps} progressPercentage={80} />);
    await act(async () => { });
    rerender(<CourseCompletionDialog {...baseProps} progressPercentage={100} />);
    await act(async () => { });

    expect(modal()).not.toBeInTheDocument();
  });

  it('closes and re-arms tracking when the collection changes', async () => {
    const { rerender } = await renderThenProgress({}, 100);
    expect(modal()).toBeInTheDocument();

    rerender(
      <CourseCompletionDialog {...baseProps} collectionId="do_collection_2" progressPercentage={40} />,
    );
    await act(async () => { });
    expect(modal()).not.toBeInTheDocument();

    rerender(
      <CourseCompletionDialog {...baseProps} collectionId="do_collection_2" progressPercentage={100} />,
    );
    await act(async () => { });
    expect(modal()).toBeInTheDocument();
  });

  it('closes when the modal is dismissed by a gesture', async () => {
    await renderThenProgress({}, 100);
    expect(modal()).toBeInTheDocument();

    act(() => { dismissModal?.(); });

    expect(modal()).not.toBeInTheDocument();
  });

  it('promises a certificate when the course issues one', async () => {
    await renderThenProgress({ hasCertificate: true }, 100);

    expect(screen.getByText('Your certificate is on its way')).toBeInTheDocument();
    expect(screen.queryByText('No certificate for this course')).not.toBeInTheDocument();
  });

  it('warns when the course issues no certificate', async () => {
    await renderThenProgress({ hasCertificate: false }, 100);

    expect(screen.getByText('No certificate for this course')).toBeInTheDocument();
    expect(screen.queryByText('Your certificate is on its way')).not.toBeInTheDocument();
  });

  it('says nothing about certificates while offline', async () => {
    await renderThenProgress({ hasCertificate: true, isOffline: true }, 100);

    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
    expect(screen.queryByText('Your certificate is on its way')).not.toBeInTheDocument();
    expect(screen.queryByText('No certificate for this course')).not.toBeInTheDocument();
  });
});
