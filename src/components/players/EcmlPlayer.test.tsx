import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { EcmlPlayer } from './EcmlPlayer';

// Mock the ECML player service - the component is only responsible for wiring
// the iframe up to it, never for the service's own behaviour.
const mockCreateConfig = vi.fn();
const mockBuildPlayerUrl = vi.fn();
vi.mock('../../services/players/ecml', () => ({
  EcmlPlayerService: class {
    createConfig = (...args: any[]) => mockCreateConfig(...args);
    buildPlayerUrl = (...args: any[]) => mockBuildPlayerUrl(...args);
  },
}));

const metadata: any = {
  identifier: 'do_ecml_1',
  mimeType: 'application/vnd.ekstep.ecml-archive',
  name: 'ECML content',
  isAvailableLocally: false,
};

const getIframe = () => screen.getByTitle('Content Player') as HTMLIFrameElement;

/**
 * Replace the real (about:blank, origin "null") content window with a stub so the
 * component's targeted postMessage is observable and never trips happy-dom's
 * cross-origin check.
 */
const stubContentWindow = (iframe: HTMLIFrameElement) => {
  const postMessage = vi.fn();
  Object.defineProperty(iframe, 'contentWindow', {
    configurable: true,
    value: { postMessage },
  });
  return postMessage;
};

/** Render the player and hand back the iframe with a stubbed content window. */
const renderPlayer = (props: Record<string, unknown> = {}) => {
  const utils = render(<EcmlPlayer metadata={metadata} {...(props as any)} />);
  const iframe = getIframe();
  const postMessage = stubContentWindow(iframe);
  return { ...utils, iframe, postMessage };
};

/** Fire a message event that passes the component's source/origin checks. */
const postFromIframe = (iframe: HTMLIFrameElement, data: any) => {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data,
        origin: window.location.origin,
        source: iframe.contentWindow as any,
      }),
    );
  });
};

describe('EcmlPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateConfig.mockResolvedValue({ context: { sid: 's1' } });
    // about:blank keeps happy-dom from attempting any resource load.
    mockBuildPlayerUrl.mockReturnValue('about:blank');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the player iframe', () => {
    const { iframe } = renderPlayer();
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('id', 'contentPlayer');
    expect(iframe).toHaveClass('content-player-embed');
    expect(iframe).toHaveAttribute('aria-label', 'Content Player');
  });

  it('builds the config from metadata plus only the context props that were supplied', async () => {
    renderPlayer({
      mode: 'play',
      cdata: [{ id: 'c1', type: 'course' }],
      contextRollup: { l1: 'do_collection' },
    });

    await act(async () => { });

    expect(mockCreateConfig).toHaveBeenCalledWith(metadata, {
      mode: 'play',
      cdata: [{ id: 'c1', type: 'course' }],
      contextRollup: { l1: 'do_collection' },
    });
  });

  it('omits undefined context props entirely', async () => {
    renderPlayer();
    await act(async () => { });
    expect(mockCreateConfig).toHaveBeenCalledWith(metadata, {});
  });

  it('points the iframe at the service-provided player url', async () => {
    mockBuildPlayerUrl.mockReturnValue('about:blank#preview');
    const { iframe } = renderPlayer();

    await act(async () => { });

    expect(iframe.getAttribute('src')).toBe('about:blank#preview');
  });

  it('posts the config into the iframe once it loads', async () => {
    const config = { context: { sid: 'sid-1' } };
    mockCreateConfig.mockResolvedValue(config);
    const { iframe, postMessage } = renderPlayer();
    await act(async () => { });

    postMessage.mockClear();
    act(() => { iframe.dispatchEvent(new Event('load')); });

    expect(postMessage).toHaveBeenCalledWith(
      { __ecmlPlayerConfig: true, config },
      window.location.origin,
    );
  });

  it('forwards a postMessage player event to onPlayerEvent and onTelemetryEvent', async () => {
    const onPlayerEvent = vi.fn();
    const onTelemetryEvent = vi.fn();
    const { iframe } = renderPlayer({ onPlayerEvent, onTelemetryEvent });
    await act(async () => { });

    postFromIframe(iframe, { eid: 'START', edata: { type: 'content' } });

    expect(onPlayerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'START',
        data: { eid: 'START', edata: { type: 'content' } },
        playerId: 'do_ecml_1',
      }),
    );
    expect(onTelemetryEvent).toHaveBeenCalledWith({ eid: 'START', edata: { type: 'content' } });
  });

  it('parses string message payloads', async () => {
    const onPlayerEvent = vi.fn();
    const { iframe } = renderPlayer({ onPlayerEvent });
    await act(async () => { });

    postFromIframe(iframe, JSON.stringify({ eid: 'END' }));

    expect(onPlayerEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'END' }));
  });

  it('ignores unparsable string payloads', async () => {
    const onPlayerEvent = vi.fn();
    const { iframe } = renderPlayer({ onPlayerEvent });
    await act(async () => { });

    postFromIframe(iframe, 'not-json{');

    expect(onPlayerEvent).not.toHaveBeenCalled();
  });

  it('un-nests events wrapped in detail/eventData by other renderer versions', async () => {
    const onPlayerEvent = vi.fn();
    const { iframe } = renderPlayer({ onPlayerEvent });
    await act(async () => { });

    postFromIframe(iframe, { detail: { eid: 'INTERACT' } });
    expect(onPlayerEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'INTERACT', data: { eid: 'INTERACT' } }),
    );

    postFromIframe(iframe, { eventData: { event: 'renderer:navigate' } });
    expect(onPlayerEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'renderer:navigate' }),
    );
  });

  it('ignores messages that carry no event id', async () => {
    const onPlayerEvent = vi.fn();
    const { iframe } = renderPlayer({ onPlayerEvent });
    await act(async () => { });

    postFromIframe(iframe, { foo: 'bar' });
    postFromIframe(iframe, 0);

    expect(onPlayerEvent).not.toHaveBeenCalled();
  });

  it('ignores messages from a different window', async () => {
    const onPlayerEvent = vi.fn();
    renderPlayer({ onPlayerEvent });
    await act(async () => { });

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { eid: 'START' },
          origin: window.location.origin,
          source: window as any,
        }),
      );
    });

    expect(onPlayerEvent).not.toHaveBeenCalled();
  });

  it('ignores messages from a foreign origin', async () => {
    const onPlayerEvent = vi.fn();
    const { iframe } = renderPlayer({ onPlayerEvent });
    await act(async () => { });

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { eid: 'START' },
          origin: 'https://evil.example.com',
          source: iframe.contentWindow as any,
        }),
      );
    });

    expect(onPlayerEvent).not.toHaveBeenCalled();
  });

  it('forwards renderer:telemetry:event custom events, unwrapping telemetryData', () => {
    const onPlayerEvent = vi.fn();
    const onTelemetryEvent = vi.fn();
    const { iframe } = renderPlayer({ onPlayerEvent, onTelemetryEvent });

    act(() => {
      iframe.dispatchEvent(
        new CustomEvent('renderer:telemetry:event', {
          detail: { telemetryData: { eid: 'IMPRESSION' } },
        }),
      );
    });

    expect(onPlayerEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'IMPRESSION', playerId: 'do_ecml_1' }),
    );
    expect(onTelemetryEvent).toHaveBeenCalledWith({ eid: 'IMPRESSION' });
  });

  it('reports custom events without an eid as "unknown" and skips telemetry', () => {
    const onPlayerEvent = vi.fn();
    const onTelemetryEvent = vi.fn();
    const { iframe } = renderPlayer({ onPlayerEvent, onTelemetryEvent });

    act(() => {
      iframe.dispatchEvent(
        new CustomEvent('renderer:telemetry:event', { detail: { some: 'payload' } }),
      );
    });

    expect(onPlayerEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'unknown' }));
    expect(onTelemetryEvent).not.toHaveBeenCalled();
  });

  it('ignores custom events with no detail', () => {
    const onPlayerEvent = vi.fn();
    const { iframe } = renderPlayer({ onPlayerEvent });

    act(() => {
      iframe.dispatchEvent(new CustomEvent('renderer:telemetry:event', { detail: null }));
    });

    expect(onPlayerEvent).not.toHaveBeenCalled();
  });

  it('uses the latest callback identity without re-initialising the player', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, iframe } = renderPlayer({ onPlayerEvent: first });
    await act(async () => { });

    rerender(<EcmlPlayer metadata={metadata} onPlayerEvent={second} />);
    await act(async () => { });

    postFromIframe(iframe, { eid: 'END' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    // The init effect only depends on the metadata identity, not the callbacks.
    expect(mockCreateConfig).toHaveBeenCalledTimes(1);
  });

  it('stops handling messages after unmount', async () => {
    const onPlayerEvent = vi.fn();
    const { unmount, iframe } = renderPlayer({ onPlayerEvent });
    await act(async () => { });

    const source = iframe.contentWindow;
    unmount();

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { eid: 'START' },
          origin: window.location.origin,
          source: source as any,
        }),
      );
      iframe.dispatchEvent(
        new CustomEvent('renderer:telemetry:event', { detail: { eid: 'END' } }),
      );
    });

    expect(onPlayerEvent).not.toHaveBeenCalled();
    expect(iframe.onload).toBeNull();
  });

  it('does not touch the iframe when the player was unmounted mid-initialisation', async () => {
    let resolveConfig: (value: any) => void = () => { };
    mockCreateConfig.mockReturnValue(new Promise((resolve) => { resolveConfig = resolve; }));

    const { unmount, iframe } = renderPlayer();
    unmount();

    await act(async () => { resolveConfig({ context: {} }); });

    expect(iframe.getAttribute('src')).toBeNull();
    expect(mockBuildPlayerUrl).not.toHaveBeenCalled();
  });

  it('logs and recovers when the service fails to build a config', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
    mockCreateConfig.mockRejectedValue(new Error('boom'));

    const { iframe } = renderPlayer();
    await act(async () => { });

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to initialize ECML player:',
      expect.any(Error),
    );
    expect(iframe).toBeInTheDocument();
  });
});
