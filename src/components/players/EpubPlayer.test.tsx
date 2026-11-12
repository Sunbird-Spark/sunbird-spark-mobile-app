import { render, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { EpubPlayer } from './EpubPlayer';

// Mock the EPUB player service - this component only wires the service into
// a container div and forwards its events.
const mockCreateConfig = vi.fn();
const mockCreateElement = vi.fn();
const mockAttachEventListeners = vi.fn();
const mockRemoveEventListeners = vi.fn();
vi.mock('../../services/players/epub', () => ({
  EpubPlayerService: class {
    createConfig = (...args: any[]) => mockCreateConfig(...args);
    createElement = (...args: any[]) => mockCreateElement(...args);
    attachEventListeners = (...args: any[]) => mockAttachEventListeners(...args);
    removeEventListeners = (...args: any[]) => mockRemoveEventListeners(...args);
  },
}));

const metadata: any = {
  identifier: 'do_epub_1',
  mimeType: 'application/epub',
  name: 'Test book',
  isAvailableLocally: false,
};

const config = { context: { sid: 'sid-1' } };

/** The player-event / telemetry callbacks the component handed the service. */
const capturedHandlers = () => {
  const [, onPlayerEvent, onTelemetryEvent] = mockAttachEventListeners.mock.calls[0];
  return { onPlayerEvent, onTelemetryEvent };
};

describe('EpubPlayer', () => {
  let playerElement: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    playerElement = document.createElement('sunbird-epub-player');
    mockCreateConfig.mockResolvedValue(config);
    mockCreateElement.mockResolvedValue(playerElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the player container', () => {
    const { container } = render(<EpubPlayer metadata={metadata} />);
    expect(container.querySelector('.content-player-embed')).toBeInTheDocument();
  });

  it('builds the config from metadata plus only the context props that were supplied', async () => {
    render(
      <EpubPlayer
        metadata={metadata}
        cdata={[{ id: 'c1', type: 'course' }]}
        objectRollup={{ l1: 'do_collection' }}
      />,
    );
    await act(async () => { });

    expect(mockCreateConfig).toHaveBeenCalledWith(metadata, {
      cdata: [{ id: 'c1', type: 'course' }],
      objectRollup: { l1: 'do_collection' },
    });
  });

  it('omits context props that were not supplied', async () => {
    render(<EpubPlayer metadata={metadata} />);
    await act(async () => { });
    expect(mockCreateConfig).toHaveBeenCalledWith(metadata, {});
  });

  it('mounts the service-created element into the container', async () => {
    const { container } = render(<EpubPlayer metadata={metadata} />);
    await act(async () => { });

    expect(mockCreateElement).toHaveBeenCalledWith(config);
    expect(container.querySelector('.content-player-embed')?.contains(playerElement)).toBe(true);
  });

  it('forwards player events to onPlayerEvent', async () => {
    const onPlayerEvent = vi.fn();
    render(<EpubPlayer metadata={metadata} onPlayerEvent={onPlayerEvent} />);
    await act(async () => { });

    const event = { type: 'END', data: { eid: 'END' }, playerId: 'do_epub_1', timestamp: 1 };
    act(() => { capturedHandlers().onPlayerEvent(event); });

    expect(onPlayerEvent).toHaveBeenCalledWith(event);
  });

  it('forwards telemetry events to onTelemetryEvent', async () => {
    const onTelemetryEvent = vi.fn();
    render(<EpubPlayer metadata={metadata} onTelemetryEvent={onTelemetryEvent} />);
    await act(async () => { });

    act(() => { capturedHandlers().onTelemetryEvent({ eid: 'IMPRESSION' }); });

    expect(onTelemetryEvent).toHaveBeenCalledWith({ eid: 'IMPRESSION' });
  });

  it('does not blow up when no callbacks were provided', async () => {
    render(<EpubPlayer metadata={metadata} />);
    await act(async () => { });

    expect(() => {
      capturedHandlers().onPlayerEvent({ type: 'END' });
      capturedHandlers().onTelemetryEvent({ eid: 'END' });
    }).not.toThrow();
  });

  it('uses the latest callback identity without re-initialising the player', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<EpubPlayer metadata={metadata} onTelemetryEvent={first} />);
    await act(async () => { });

    rerender(<EpubPlayer metadata={metadata} onTelemetryEvent={second} />);
    await act(async () => { });

    act(() => { capturedHandlers().onTelemetryEvent({ eid: 'END' }); });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(mockCreateConfig).toHaveBeenCalledTimes(1);
  });

  it('re-initialises when the content identifier changes', async () => {
    const { rerender } = render(<EpubPlayer metadata={metadata} />);
    await act(async () => { });

    rerender(<EpubPlayer metadata={{ ...metadata, identifier: 'do_epub_2' }} />);
    await act(async () => { });

    expect(mockCreateConfig).toHaveBeenCalledTimes(2);
    expect(mockCreateConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({ identifier: 'do_epub_2' }),
      {},
    );
  });

  it('removes the element and its listeners on unmount', async () => {
    const { unmount } = render(<EpubPlayer metadata={metadata} />);
    await act(async () => { });

    const removeSpy = vi.spyOn(playerElement, 'remove');
    unmount();

    expect(removeSpy).toHaveBeenCalled();
    expect(mockRemoveEventListeners).toHaveBeenCalledWith(playerElement);
  });

  it('never attaches listeners when unmounted before the config resolves', async () => {
    let resolveConfig: (value: any) => void = () => { };
    mockCreateConfig.mockReturnValue(new Promise((resolve) => { resolveConfig = resolve; }));

    const { unmount } = render(<EpubPlayer metadata={metadata} />);
    unmount();

    await act(async () => { resolveConfig(config); });

    expect(mockCreateElement).not.toHaveBeenCalled();
    expect(mockAttachEventListeners).not.toHaveBeenCalled();
  });

  it('never attaches listeners when unmounted while the element is being created', async () => {
    let resolveElement: (value: any) => void = () => { };
    mockCreateElement.mockReturnValue(new Promise((resolve) => { resolveElement = resolve; }));

    const { unmount } = render(<EpubPlayer metadata={metadata} />);
    await act(async () => { });
    unmount();

    await act(async () => { resolveElement(playerElement); });

    expect(mockAttachEventListeners).not.toHaveBeenCalled();
  });

  it('logs and recovers when initialisation fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
    mockCreateConfig.mockRejectedValue(new Error('boom'));

    const { container } = render(<EpubPlayer metadata={metadata} />);
    await act(async () => { });

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to initialize EPUB player:',
      expect.any(Error),
    );
    expect(container.querySelector('.content-player-embed')).toBeInTheDocument();
  });
});
