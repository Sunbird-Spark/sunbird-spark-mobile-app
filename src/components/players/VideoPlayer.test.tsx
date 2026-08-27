import { render, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { VideoPlayer } from './VideoPlayer';

// Mock the video player service - this component only wires the service into
// a container div and forwards its events.
const mockCreateConfig = vi.fn();
const mockCreateElement = vi.fn();
const mockAttachEventListeners = vi.fn();
const mockRemoveEventListeners = vi.fn();
vi.mock('../../services/players/video', () => ({
  VideoPlayerService: class {
    createConfig = (...args: any[]) => mockCreateConfig(...args);
    createElement = (...args: any[]) => mockCreateElement(...args);
    attachEventListeners = (...args: any[]) => mockAttachEventListeners(...args);
    removeEventListeners = (...args: any[]) => mockRemoveEventListeners(...args);
  },
}));

const metadata: any = {
  identifier: 'do_video_1',
  mimeType: 'video/mp4',
  name: 'Test video',
  isAvailableLocally: false,
};

const config = { context: { sid: 'sid-1' } };

/** The player-event / telemetry callbacks the component handed the service. */
const capturedHandlers = () => {
  const [, onPlayerEvent, onTelemetryEvent] = mockAttachEventListeners.mock.calls[0];
  return { onPlayerEvent, onTelemetryEvent };
};

describe('VideoPlayer', () => {
  let playerElement: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    playerElement = document.createElement('sunbird-video-player');
    mockCreateConfig.mockResolvedValue(config);
    mockCreateElement.mockResolvedValue(playerElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the player container', () => {
    const { container } = render(<VideoPlayer metadata={metadata} />);
    const host = container.querySelector('.content-player-embed');
    expect(host).toBeInTheDocument();
  });

  it('builds the config from metadata plus only the context props that were supplied', async () => {
    render(
      <VideoPlayer
        metadata={metadata}
        mode="play"
        objectRollup={{ l1: 'do_collection' }}
      />,
    );
    await act(async () => { });

    expect(mockCreateConfig).toHaveBeenCalledWith(metadata, {
      mode: 'play',
      objectRollup: { l1: 'do_collection' },
    });
  });

  it('omits context props that were not supplied', async () => {
    render(<VideoPlayer metadata={metadata} />);
    await act(async () => { });
    expect(mockCreateConfig).toHaveBeenCalledWith(metadata, {});
  });

  it('mounts the service-created element into the container', async () => {
    const { container } = render(<VideoPlayer metadata={metadata} />);
    await act(async () => { });

    expect(mockCreateElement).toHaveBeenCalledWith(config);
    const host = container.querySelector('.content-player-embed');
    expect(host?.contains(playerElement)).toBe(true);
  });

  it('forwards player events to onPlayerEvent', async () => {
    const onPlayerEvent = vi.fn();
    render(<VideoPlayer metadata={metadata} onPlayerEvent={onPlayerEvent} />);
    await act(async () => { });

    const event = { type: 'END', data: { eid: 'END' }, playerId: 'do_video_1', timestamp: 1 };
    act(() => { capturedHandlers().onPlayerEvent(event); });

    expect(onPlayerEvent).toHaveBeenCalledWith(event);
  });

  it('forwards telemetry events to onTelemetryEvent', async () => {
    const onTelemetryEvent = vi.fn();
    render(<VideoPlayer metadata={metadata} onTelemetryEvent={onTelemetryEvent} />);
    await act(async () => { });

    act(() => { capturedHandlers().onTelemetryEvent({ eid: 'IMPRESSION' }); });

    expect(onTelemetryEvent).toHaveBeenCalledWith({ eid: 'IMPRESSION' });
  });

  it('does not blow up when no callbacks were provided', async () => {
    render(<VideoPlayer metadata={metadata} />);
    await act(async () => { });

    expect(() => {
      capturedHandlers().onPlayerEvent({ type: 'END' });
      capturedHandlers().onTelemetryEvent({ eid: 'END' });
    }).not.toThrow();
  });

  it('uses the latest callback identity without re-initialising the player', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<VideoPlayer metadata={metadata} onPlayerEvent={first} />);
    await act(async () => { });

    rerender(<VideoPlayer metadata={metadata} onPlayerEvent={second} />);
    await act(async () => { });

    act(() => { capturedHandlers().onPlayerEvent({ type: 'END' }); });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(mockCreateConfig).toHaveBeenCalledTimes(1);
  });

  it('re-initialises when the content identifier changes', async () => {
    const { rerender } = render(<VideoPlayer metadata={metadata} />);
    await act(async () => { });

    rerender(<VideoPlayer metadata={{ ...metadata, identifier: 'do_video_2' }} />);
    await act(async () => { });

    expect(mockCreateConfig).toHaveBeenCalledTimes(2);
    expect(mockCreateConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({ identifier: 'do_video_2' }),
      {},
    );
  });

  it('removes the element and its listeners on unmount', async () => {
    const { unmount } = render(<VideoPlayer metadata={metadata} />);
    await act(async () => { });

    const removeSpy = vi.spyOn(playerElement, 'remove');
    unmount();

    expect(removeSpy).toHaveBeenCalled();
    expect(mockRemoveEventListeners).toHaveBeenCalledWith(playerElement);
  });

  it('never attaches listeners when unmounted before the config resolves', async () => {
    let resolveConfig: (value: any) => void = () => { };
    mockCreateConfig.mockReturnValue(new Promise((resolve) => { resolveConfig = resolve; }));

    const { unmount } = render(<VideoPlayer metadata={metadata} />);
    unmount();

    await act(async () => { resolveConfig(config); });

    expect(mockCreateElement).not.toHaveBeenCalled();
    expect(mockAttachEventListeners).not.toHaveBeenCalled();
  });

  it('never attaches listeners when unmounted while the element is being created', async () => {
    let resolveElement: (value: any) => void = () => { };
    mockCreateElement.mockReturnValue(new Promise((resolve) => { resolveElement = resolve; }));

    const { unmount } = render(<VideoPlayer metadata={metadata} />);
    await act(async () => { });
    unmount();

    await act(async () => { resolveElement(playerElement); });

    expect(mockAttachEventListeners).not.toHaveBeenCalled();
  });

  it('logs and recovers when initialisation fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
    mockCreateConfig.mockRejectedValue(new Error('boom'));

    const { container } = render(<VideoPlayer metadata={metadata} />);
    await act(async () => { });

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to initialize video player:',
      expect.any(Error),
    );
    expect(container.querySelector('.content-player-embed')).toBeInTheDocument();
  });
});
