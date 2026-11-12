import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ContentPlayer, MIME_TYPE_PLAYERS } from './ContentPlayer';

// Every concrete player is stubbed - this component is a dispatcher, so the
// only thing worth asserting is which player it picks and what it hands over.
const makePlayerStub = (testId: string) => ({ metadata, mode, cdata, contextRollup, objectRollup, onPlayerEvent, onTelemetryEvent }: any) => {
  capturedProps[testId] = { metadata, mode, cdata, contextRollup, objectRollup, onPlayerEvent, onTelemetryEvent };
  return <div data-testid={testId} data-identifier={metadata?.identifier} data-mode={mode} />;
};

const capturedProps: Record<string, any> = {};

vi.mock('./EpubPlayer', () => ({ EpubPlayer: (props: any) => makePlayerStub('epub-player')(props) }));
vi.mock('./VideoPlayer', () => ({ VideoPlayer: (props: any) => makePlayerStub('video-player')(props) }));
vi.mock('./PdfPlayer', () => ({ PdfPlayer: (props: any) => makePlayerStub('pdf-player')(props) }));
vi.mock('./EcmlPlayer', () => ({ EcmlPlayer: (props: any) => makePlayerStub('ecml-player')(props) }));
vi.mock('./QumlPlayer', () => ({ default: (props: any) => makePlayerStub('quml-player')(props) }));

vi.mock('../common/RatingDialog', () => ({
  default: ({ open, onClose, contentMeta }: any) => (
    <div data-testid="rating-dialog" data-open={String(open)} data-content-id={contentMeta?.id}>
      <button onClick={onClose}>close rating</button>
    </div>
  ),
}));

const metadata: any = { identifier: 'do_1', name: 'Some content' };
const contentMeta = { id: 'do_1', type: 'Content', ver: '1.0' };

const ratingDialog = () => screen.getByTestId('rating-dialog');
/** The dispatched player's captured props, whichever player was rendered. */
const propsOf = (testId: string) => capturedProps[testId];

describe('ContentPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(capturedProps)) delete capturedProps[key];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('mime type dispatch', () => {
    const cases: Array<[string, string]> = [
      ['application/epub', 'epub-player'],
      ['video/webm', 'video-player'],
      ['video/mp4', 'video-player'],
      ['application/pdf', 'pdf-player'],
      ['video/x-youtube', 'ecml-player'],
      ['application/vnd.ekstep.h5p-archive', 'ecml-player'],
      ['application/vnd.ekstep.ecml-archive', 'ecml-player'],
      ['application/vnd.ekstep.html-archive', 'ecml-player'],
      ['application/vnd.ekstep.scorm-archive', 'ecml-player'],
      ['application/vnd.sunbird.questionset', 'quml-player'],
      ['application/vnd.sunbird.question', 'quml-player'],
    ];

    it.each(cases)('renders the right player for %s', (mimeType, testId) => {
      render(<ContentPlayer mimeType={mimeType} metadata={metadata} />);
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });

    it('covers every entry of the exported mime type map', () => {
      expect(Object.keys(MIME_TYPE_PLAYERS).sort()).toEqual(cases.map(([mimeType]) => mimeType).sort());
    });

    it('falls back to the ECML player for an unsupported mime type', () => {
      render(<ContentPlayer mimeType="application/x-unknown" metadata={metadata} />);
      expect(screen.getByTestId('ecml-player')).toBeInTheDocument();
    });

    it('falls back to the ECML player when the mime type is empty', () => {
      render(<ContentPlayer mimeType="" metadata={metadata} />);
      expect(screen.getByTestId('ecml-player')).toBeInTheDocument();
    });
  });

  it('forwards metadata and playback context to the selected player', () => {
    render(
      <ContentPlayer
        mimeType="video/mp4"
        metadata={metadata}
        mode="play"
        cdata={[{ id: 'c1', type: 'course' }]}
        contextRollup={{ l1: 'do_collection' }}
        objectRollup={{ l1: 'do_collection' }}
      />,
    );

    expect(screen.getByTestId('video-player')).toHaveAttribute('data-identifier', 'do_1');
    expect(propsOf('video-player')).toMatchObject({
      metadata,
      mode: 'play',
      cdata: [{ id: 'c1', type: 'course' }],
      contextRollup: { l1: 'do_collection' },
      objectRollup: { l1: 'do_collection' },
    });
  });

  it('marks the document as playing while mounted and clears it on unmount', () => {
    const { unmount } = render(<ContentPlayer mimeType="video/mp4" metadata={metadata} />);
    expect(document.documentElement).toHaveClass('is-playing-content');

    unmount();
    expect(document.documentElement).not.toHaveClass('is-playing-content');
  });

  it('passes player events through to the caller', () => {
    const onPlayerEvent = vi.fn();
    render(
      <ContentPlayer mimeType="application/pdf" metadata={metadata} onPlayerEvent={onPlayerEvent} />,
    );

    const event = { eid: 'INTERACT', edata: { type: 'TOUCH' } };
    act(() => { propsOf('pdf-player').onPlayerEvent(event); });

    expect(onPlayerEvent).toHaveBeenCalledWith(event);
  });

  it('passes telemetry events through to the caller', () => {
    const onTelemetryEvent = vi.fn();
    render(
      <ContentPlayer mimeType="application/pdf" metadata={metadata} onTelemetryEvent={onTelemetryEvent} />,
    );

    const event = { eid: 'IMPRESSION' };
    act(() => { propsOf('pdf-player').onTelemetryEvent(event); });

    expect(onTelemetryEvent).toHaveBeenCalledWith(event);
  });

  it('tolerates events when no callbacks were supplied', () => {
    render(<ContentPlayer mimeType="application/pdf" metadata={metadata} />);

    expect(() => {
      act(() => {
        propsOf('pdf-player').onPlayerEvent({ eid: 'END' });
        propsOf('pdf-player').onTelemetryEvent({ eid: 'END' });
      });
    }).not.toThrow();
  });

  describe('rating prompt', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('stays closed until the content ends', () => {
      render(
        <ContentPlayer mimeType="application/pdf" metadata={metadata} contentMeta={contentMeta} />,
      );

      expect(ratingDialog()).toHaveAttribute('data-open', 'false');
      expect(ratingDialog()).toHaveAttribute('data-content-id', 'do_1');
    });

    it('opens after an END player event (the shape PDF emits on mobile)', () => {
      render(
        <ContentPlayer mimeType="application/pdf" metadata={metadata} contentMeta={contentMeta} />,
      );

      act(() => { propsOf('pdf-player').onPlayerEvent({ eid: 'END' }); });
      expect(ratingDialog()).toHaveAttribute('data-open', 'false');

      act(() => { vi.advanceTimersByTime(2000); });
      expect(ratingDialog()).toHaveAttribute('data-open', 'true');
    });

    it('opens after an END telemetry event', () => {
      render(
        <ContentPlayer mimeType="video/mp4" metadata={metadata} contentMeta={contentMeta} />,
      );

      act(() => { propsOf('video-player').onTelemetryEvent({ eid: 'END' }); });
      act(() => { vi.advanceTimersByTime(2000); });

      expect(ratingDialog()).toHaveAttribute('data-open', 'true');
    });

    it('reads the event id from a nested data payload', () => {
      render(
        <ContentPlayer mimeType="video/mp4" metadata={metadata} contentMeta={contentMeta} />,
      );

      act(() => { propsOf('video-player').onPlayerEvent({ data: { eid: 'end' } }); });
      act(() => { vi.advanceTimersByTime(2000); });

      expect(ratingDialog()).toHaveAttribute('data-open', 'true');
    });

    it('reads the event id from the wrapped event type', () => {
      render(
        <ContentPlayer mimeType="video/mp4" metadata={metadata} contentMeta={contentMeta} />,
      );

      act(() => { propsOf('video-player').onPlayerEvent({ type: 'END' }); });
      act(() => { vi.advanceTimersByTime(2000); });

      expect(ratingDialog()).toHaveAttribute('data-open', 'true');
    });

    it('cancels a pending prompt when the content is replayed (START)', () => {
      render(
        <ContentPlayer mimeType="video/mp4" metadata={metadata} contentMeta={contentMeta} />,
      );

      act(() => { propsOf('video-player').onPlayerEvent({ eid: 'END' }); });
      act(() => { propsOf('video-player').onPlayerEvent({ eid: 'START' }); });
      act(() => { vi.advanceTimersByTime(5000); });

      expect(ratingDialog()).toHaveAttribute('data-open', 'false');
    });

    it('never prompts when there is no content meta to attach telemetry to', () => {
      render(<ContentPlayer mimeType="video/mp4" metadata={metadata} />);

      act(() => { propsOf('video-player').onPlayerEvent({ eid: 'END' }); });
      act(() => { vi.advanceTimersByTime(2000); });

      expect(ratingDialog()).toHaveAttribute('data-open', 'false');
    });

    it('ignores unrelated events', () => {
      render(
        <ContentPlayer mimeType="video/mp4" metadata={metadata} contentMeta={contentMeta} />,
      );

      act(() => { propsOf('video-player').onPlayerEvent({ eid: 'INTERACT' }); });
      act(() => { propsOf('video-player').onTelemetryEvent({}); });
      act(() => { vi.advanceTimersByTime(5000); });

      expect(ratingDialog()).toHaveAttribute('data-open', 'false');
    });

    it('closes again when the dialog is dismissed', () => {
      render(
        <ContentPlayer mimeType="video/mp4" metadata={metadata} contentMeta={contentMeta} />,
      );

      act(() => { propsOf('video-player').onTelemetryEvent({ eid: 'END' }); });
      act(() => { vi.advanceTimersByTime(2000); });
      expect(ratingDialog()).toHaveAttribute('data-open', 'true');

      fireEvent.click(screen.getByText('close rating'));

      expect(ratingDialog()).toHaveAttribute('data-open', 'false');
    });

    it('does not prompt after the player has been unmounted', () => {
      const { unmount } = render(
        <ContentPlayer mimeType="video/mp4" metadata={metadata} contentMeta={contentMeta} />,
      );

      act(() => { propsOf('video-player').onTelemetryEvent({ eid: 'END' }); });
      unmount();

      expect(() => { act(() => { vi.advanceTimersByTime(2000); }); }).not.toThrow();
      expect(screen.queryByTestId('rating-dialog')).not.toBeInTheDocument();
    });
  });
});
