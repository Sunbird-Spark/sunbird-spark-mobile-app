import { render, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import QumlPlayer from './QumlPlayer';

// Mock the QUML player service - the component only wires the singleton service
// into a container div and forwards its events.
const mockCreateConfig = vi.fn();
const mockCreateElement = vi.fn();
const mockAttachEventListeners = vi.fn();
const mockRemoveEventListeners = vi.fn();
const mockUnloadStyles = vi.fn();
vi.mock('../../services/players/quml', () => ({
  qumlPlayerService: {
    createConfig: (...args: any[]) => mockCreateConfig(...args),
    createElement: (...args: any[]) => mockCreateElement(...args),
    attachEventListeners: (...args: any[]) => mockAttachEventListeners(...args),
    removeEventListeners: (...args: any[]) => mockRemoveEventListeners(...args),
  },
  QumlPlayerService: { unloadStyles: () => mockUnloadStyles() },
}));

const metadata: any = {
  identifier: 'do_quml_1',
  mimeType: 'application/vnd.sunbird.questionset',
  name: 'Test question set',
};

const config = { context: { sid: 'sid-1' } };

/** The player-event / telemetry callbacks the component handed the service. */
const capturedHandlers = () => {
  const [, onPlayerEvent, onTelemetryEvent] = mockAttachEventListeners.mock.calls[0];
  return { onPlayerEvent, onTelemetryEvent };
};

describe('QumlPlayer', () => {
  let playerElement: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    playerElement = document.createElement('sunbird-quml-player');
    mockCreateConfig.mockResolvedValue(config);
    mockCreateElement.mockReturnValue(playerElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the player container', () => {
    const { container } = render(<QumlPlayer metadata={metadata} />);
    expect(container.querySelector('.content-player-embed')).toBeInTheDocument();
  });

  it('defaults the mode to "play" and only forwards the rollups it was given', async () => {
    render(<QumlPlayer metadata={metadata} contextRollup={{ l1: 'do_collection' }} />);
    await act(async () => { });

    expect(mockCreateConfig).toHaveBeenCalledWith(metadata, {
      mode: 'play',
      contextRollup: { l1: 'do_collection' },
    });
  });

  it('passes an explicit mode and the full context through', async () => {
    render(
      <QumlPlayer
        metadata={metadata}
        mode="review"
        cdata={[{ id: 'c1', type: 'course' }]}
        objectRollup={{ l1: 'do_collection' }}
      />,
    );
    await act(async () => { });

    expect(mockCreateConfig).toHaveBeenCalledWith(metadata, {
      mode: 'review',
      cdata: [{ id: 'c1', type: 'course' }],
      objectRollup: { l1: 'do_collection' },
    });
  });

  it('mounts the service-created element into the container', async () => {
    const { container } = render(<QumlPlayer metadata={metadata} />);
    await act(async () => { });

    expect(mockCreateElement).toHaveBeenCalledWith(config);
    expect(container.querySelector('.content-player-embed')?.contains(playerElement)).toBe(true);
  });

  it('warns and never initialises when there is no metadata', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });

    render(<QumlPlayer metadata={undefined as any} />);
    await act(async () => { });

    expect(consoleWarn).toHaveBeenCalledWith('[QumlPlayer] Metadata not available');
    expect(mockCreateConfig).not.toHaveBeenCalled();
  });

  it('forwards player events to onPlayerEvent', async () => {
    const onPlayerEvent = vi.fn();
    render(<QumlPlayer metadata={metadata} onPlayerEvent={onPlayerEvent} />);
    await act(async () => { });

    const event = { type: 'END', data: { eid: 'END' }, playerId: 'do_quml_1', timestamp: 1 };
    act(() => { capturedHandlers().onPlayerEvent(event); });

    expect(onPlayerEvent).toHaveBeenCalledWith(event);
  });

  it('forwards telemetry events to onTelemetryEvent', async () => {
    const onTelemetryEvent = vi.fn();
    render(<QumlPlayer metadata={metadata} onTelemetryEvent={onTelemetryEvent} />);
    await act(async () => { });

    act(() => { capturedHandlers().onTelemetryEvent({ eid: 'ASSESS' }); });

    expect(onTelemetryEvent).toHaveBeenCalledWith({ eid: 'ASSESS' });
  });

  it('does not blow up when no callbacks were provided', async () => {
    render(<QumlPlayer metadata={metadata} />);
    await act(async () => { });

    expect(() => {
      capturedHandlers().onPlayerEvent({ type: 'END' });
      capturedHandlers().onTelemetryEvent({ eid: 'END' });
    }).not.toThrow();
  });

  it('uses the latest callback identity without re-initialising the player', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<QumlPlayer metadata={metadata} onPlayerEvent={first} />);
    await act(async () => { });

    rerender(<QumlPlayer metadata={metadata} onPlayerEvent={second} />);
    await act(async () => { });

    act(() => { capturedHandlers().onPlayerEvent({ type: 'END' }); });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(mockCreateConfig).toHaveBeenCalledTimes(1);
  });

  it('re-initialises when the metadata object changes', async () => {
    const { rerender } = render(<QumlPlayer metadata={metadata} />);
    await act(async () => { });

    rerender(<QumlPlayer metadata={{ ...metadata, identifier: 'do_quml_2' }} />);
    await act(async () => { });

    expect(mockCreateConfig).toHaveBeenCalledTimes(2);
    expect(mockCreateConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({ identifier: 'do_quml_2' }),
      expect.objectContaining({ mode: 'play' }),
    );
  });

  it('detaches listeners, removes the element and unloads the styles on unmount', async () => {
    const { unmount } = render(<QumlPlayer metadata={metadata} />);
    await act(async () => { });

    const removeSpy = vi.spyOn(playerElement, 'remove');
    unmount();

    expect(mockRemoveEventListeners).toHaveBeenCalledWith(playerElement);
    expect(removeSpy).toHaveBeenCalled();
    expect(mockUnloadStyles).toHaveBeenCalled();
  });

  it('still unloads the styles when the player never got created', () => {
    const { unmount } = render(<QumlPlayer metadata={metadata} />);
    unmount();

    expect(mockRemoveEventListeners).not.toHaveBeenCalled();
    expect(mockUnloadStyles).toHaveBeenCalled();
  });

  it('never attaches listeners when unmounted before the config resolves', async () => {
    let resolveConfig: (value: any) => void = () => { };
    mockCreateConfig.mockReturnValue(new Promise((resolve) => { resolveConfig = resolve; }));

    const { unmount } = render(<QumlPlayer metadata={metadata} />);
    unmount();

    await act(async () => { resolveConfig(config); });

    expect(mockCreateElement).not.toHaveBeenCalled();
    expect(mockAttachEventListeners).not.toHaveBeenCalled();
  });

  it('logs and recovers when initialisation fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
    mockCreateConfig.mockRejectedValue(new Error('boom'));

    const { container } = render(<QumlPlayer metadata={metadata} />);
    await act(async () => { });

    expect(consoleError).toHaveBeenCalledWith(
      '[QumlPlayer] Failed to initialize player:',
      expect.any(Error),
    );
    expect(container.querySelector('.content-player-embed')).toBeInTheDocument();
  });
});
