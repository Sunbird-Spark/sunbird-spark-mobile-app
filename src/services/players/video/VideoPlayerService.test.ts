import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import type { VideoPlayerConfig, VideoPlayerMetadata } from './types';

const mockBuildPlayerContext = vi.fn(async () => ({
  mode: 'play',
  sid: 'sid-1',
  did: 'did-1',
  uid: 'anonymous',
  channel: 'ch',
  pdata: { id: 'p', ver: '1', pid: 'pid' },
  contextRollup: {},
  tags: [],
  cdata: [],
  timeDiff: 0,
  objectRollup: {},
  host: '',
  endpoint: '',
  dims: [],
  app: [],
  partner: [],
  userData: { firstName: 'A', lastName: 'B' },
}));

vi.mock('../PlayerContextService', () => ({
  buildPlayerContext: (...args: any[]) => mockBuildPlayerContext(...(args as [])),
}));

const SCRIPT_SELECTOR = 'script[data-video-player-script]';

type ServiceCtor = typeof import('./VideoPlayerService').VideoPlayerService;

const metadata = (identifier = 'do_video_1'): VideoPlayerMetadata => ({
  identifier,
  name: 'A video',
  artifactUrl: 'video.mp4',
});

/**
 * happy-dom eagerly dispatches `error` on any <script src> the moment it is
 * connected to the document (external script loading is disabled in tests), so
 * body.appendChild is redirected to a detached host. The script tags stay fully
 * inspectable while load/error stay under the test's control.
 */
let scriptHost: HTMLElement;

function injectedScripts(): HTMLScriptElement[] {
  return Array.from(scriptHost.querySelectorAll<HTMLScriptElement>(SCRIPT_SELECTOR));
}

/** Synchronously fire load/error on the most recently injected script tag. */
function fireOnScript(type: 'load' | 'error'): HTMLScriptElement {
  const scripts = injectedScripts();
  const script = scripts[scripts.length - 1];
  if (!script) throw new Error('no script injected');
  script.dispatchEvent(new Event(type));
  return script;
}

describe('VideoPlayerService', () => {
  let VideoPlayerService: ServiceCtor;
  let service: InstanceType<ServiceCtor>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    scriptHost = document.createElement('div');
    vi.spyOn(document.body, 'appendChild').mockImplementation(
      ((node: Node) => scriptHost.appendChild(node)) as any,
    );

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(':root{--player-bg:#000}\nbody{margin:0}\n.vjs-x{color:red}'),
    });
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    ({ VideoPlayerService } = await import('./VideoPlayerService'));
    service = new VideoPlayerService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ── loadScript ─────────────────────────────────────────────────────────────

  describe('script injection', () => {
    it('injects the player script and resolves the config once it loads', async () => {
      const md = metadata();
      const pending = service.createConfig(md);

      expect(injectedScripts()).toHaveLength(1);
      expect(injectedScripts()[0].getAttribute('src')).toBe(
        '/assets/video-player/sunbird-video-player.js',
      );

      fireOnScript('load');
      const config = await pending;

      expect(config.metadata).toBe(md);
      expect(mockBuildPlayerContext).toHaveBeenCalledWith(undefined, { contentId: 'do_video_1' });
    });

    it('injects the script only once for two concurrent createConfig calls', async () => {
      const first = service.createConfig(metadata('a'));
      const second = service.createConfig(metadata('b'));

      expect(injectedScripts()).toHaveLength(1);

      fireOnScript('load');
      await Promise.all([first, second]);

      expect(injectedScripts()).toHaveLength(1);
    });

    it('does not re-inject the script after a successful load', async () => {
      const first = service.createConfig(metadata('a'));
      fireOnScript('load');
      await first;

      await new VideoPlayerService().createConfig(metadata('b'));

      expect(injectedScripts()).toHaveLength(1);
    });

    it('rejects when the script fails to load', async () => {
      const pending = service.createConfig(metadata());
      fireOnScript('error');

      await expect(pending).rejects.toThrow('Failed to load sunbird-video-player script');
    });

    it('retries the injection after a previous failure cleared the cached promise', async () => {
      const failing = service.createConfig(metadata('a'));
      fireOnScript('error');
      await expect(failing).rejects.toThrow();
      scriptHost.innerHTML = '';

      const retry = service.createConfig(metadata('b'));
      expect(injectedScripts()).toHaveLength(1);
      fireOnScript('load');

      await expect(retry).resolves.toBeDefined();
    });

    it('skips injection when the custom element is already registered', async () => {
      vi.spyOn(customElements, 'get').mockReturnValue(class extends HTMLElement {});

      const config = await service.createConfig(metadata());

      expect(injectedScripts()).toHaveLength(0);
      expect(config.context).toBeDefined();
    });
  });

  // ── createConfig ───────────────────────────────────────────────────────────

  describe('createConfig', () => {
    async function build(md = metadata(), props?: any): Promise<VideoPlayerConfig> {
      const pending = service.createConfig(md, props);
      fireOnScript('load');
      return pending;
    }

    it('builds the video side-menu configuration', async () => {
      const config = await build();

      expect(config.config.apislug).toBe('/action');
      expect(config.config.sideMenu).toEqual({
        showShare: true,
        showDownload: false,
        showExit: true,
        showPrint: false,
        showReplay: true,
      });
    });

    it('forwards the caller context overrides to buildPlayerContext', async () => {
      const overrides = { mode: 'preview', cdata: [{ type: 'course', id: 'do_c' }] };

      await build(metadata('do_v2'), overrides);

      expect(mockBuildPlayerContext).toHaveBeenCalledWith(overrides, { contentId: 'do_v2' });
    });
  });

  // ── styles + createElement ─────────────────────────────────────────────────

  describe('createElement', () => {
    async function buildConfig(identifier = 'do_video_1'): Promise<VideoPlayerConfig> {
      const pending = service.createConfig(metadata(identifier));
      fireOnScript('load');
      return pending;
    }

    it('injects scoped styles rewritten for @scope and builds the wrapper', async () => {
      const config = await buildConfig();
      const wrapper = await service.createElement(config);

      expect(mockFetch).toHaveBeenCalledWith('/assets/video-player/styles.css');

      const styleEl = document.head.querySelector('style[data-video-player-styles]');
      expect(styleEl).not.toBeNull();
      const css = styleEl!.textContent ?? '';
      expect(css.startsWith('@scope ([data-video-player-wrapper]) {')).toBe(true);
      expect(css).toContain(':scope{--player-bg:#000}');
      expect(css).toContain(':scope{margin:0}');
      expect(css).not.toContain(':root');
      // A class that merely *contains* "body"/"html" substrings must survive.
      expect(css).toContain('.vjs-x{color:red}');

      expect(wrapper.getAttribute('data-video-player-wrapper')).toBe('true');
      expect(wrapper.getAttribute('data-player-id')).toBe('do_video_1');
      expect(wrapper.style.width).toBe('100%');
      expect(wrapper.style.height).toBe('100%');

      const inner = wrapper.querySelector('sunbird-video-player');
      expect(inner).not.toBeNull();
      expect(inner!.getAttribute('data-player-id')).toBe('do_video_1');
      expect(JSON.parse(inner!.getAttribute('player-config')!)).toEqual(
        JSON.parse(JSON.stringify(config)),
      );
    });

    it('always injects the containment overrides that keep the control bar visible', async () => {
      const config = await buildConfig();
      await service.createElement(config);

      const containEl = document.head.querySelector('style[data-video-player-contain]');
      expect(containEl).not.toBeNull();
      expect(containEl!.textContent).toContain('.vjs-big-play-button { display:none !important; }');
      expect(containEl!.textContent).toContain(
        '[data-video-player-wrapper] .video-js.vjs-fluid { padding-top:0 !important; }',
      );
    });

    it('fetches and injects the stylesheet only once across instances', async () => {
      const config = await buildConfig();
      await service.createElement(config);
      await new VideoPlayerService().createElement(config);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(document.head.querySelectorAll('style[data-video-player-styles]')).toHaveLength(1);
      expect(document.head.querySelectorAll('style[data-video-player-contain]')).toHaveLength(1);
    });

    it('skips the scoped stylesheet when the CSS request is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('') });
      const config = await buildConfig();

      const wrapper = await service.createElement(config);

      expect(document.head.querySelector('style[data-video-player-styles]')).toBeNull();
      // The containment overrides are still applied so the player stays usable.
      expect(document.head.querySelector('style[data-video-player-contain]')).not.toBeNull();
      expect(wrapper.querySelector('sunbird-video-player')).not.toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load video player styles:',
        expect.objectContaining({ message: 'Failed to fetch video player styles: 404' }),
      );
    });

    it('skips the scoped stylesheet when the CSS request rejects', async () => {
      mockFetch.mockRejectedValue(new Error('network down'));
      const config = await buildConfig();

      await service.createElement(config);

      expect(document.head.querySelector('style[data-video-player-styles]')).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load video player styles:',
        expect.any(Error),
      );
    });
  });

  // ── event listeners ────────────────────────────────────────────────────────

  describe('event listeners', () => {
    let wrapper: HTMLElement;
    let inner: HTMLElement;
    let onPlayerEvent: Mock<(event: any) => void>;
    let onTelemetryEvent: Mock<(event: any) => void>;

    beforeEach(async () => {
      vi.useFakeTimers();
      const pending = service.createConfig(metadata('do_video_1'));
      fireOnScript('load');
      wrapper = await service.createElement(await pending);
      inner = wrapper.querySelector('sunbird-video-player') as HTMLElement;
      onPlayerEvent = vi.fn<(event: any) => void>();
      onTelemetryEvent = vi.fn<(event: any) => void>();
    });

    const telemetry = (detail: any) =>
      document.dispatchEvent(new CustomEvent('TelemetryEvent', { detail }));

    it('maps playerEvent details onto a VideoPlayerEvent', () => {
      service.attachEventListeners(wrapper, onPlayerEvent, onTelemetryEvent);

      inner.dispatchEvent(new CustomEvent('playerEvent', { detail: { eid: 'IMPRESSION' } }));

      expect(onPlayerEvent).toHaveBeenCalledTimes(1);
      const event = onPlayerEvent.mock.calls[0][0];
      expect(event.type).toBe('IMPRESSION');
      expect(event.data).toEqual({ eid: 'IMPRESSION' });
      expect(event.playerId).toBe('do_video_1');
      expect(typeof event.timestamp).toBe('number');
    });

    it('falls back to "unknown" when the event carries no eid', () => {
      service.attachEventListeners(wrapper, onPlayerEvent);

      inner.dispatchEvent(new CustomEvent('playerEvent', { detail: {} }));

      expect(onPlayerEvent.mock.calls[0][0].type).toBe('unknown');
    });

    it('forwards document TelemetryEvent details to the telemetry callback', () => {
      service.attachEventListeners(wrapper, onPlayerEvent, onTelemetryEvent);

      telemetry({ eid: 'START', object: { id: 'do_video_1' } });

      expect(onTelemetryEvent).toHaveBeenCalledWith({ eid: 'START', object: { id: 'do_video_1' } });
    });

    it('uses the element itself and a default id when there is no inner player element', () => {
      const bare = document.createElement('div');
      service.attachEventListeners(bare, onPlayerEvent);

      bare.dispatchEvent(new CustomEvent('playerEvent', { detail: { eid: 'END' } }));

      expect(onPlayerEvent.mock.calls[0][0].playerId).toBe('video-player');
    });

    it('does not throw when no callbacks are supplied', () => {
      service.attachEventListeners(wrapper);

      expect(() =>
        inner.dispatchEvent(new CustomEvent('playerEvent', { detail: { eid: 'END' } })),
      ).not.toThrow();
      expect(() => telemetry({ eid: 'END' })).not.toThrow();
    });

    it('replaces the previous handler when attached twice', () => {
      const first = vi.fn<(event: any) => void>();
      service.attachEventListeners(wrapper, first);
      service.attachEventListeners(wrapper, onPlayerEvent);

      inner.dispatchEvent(new CustomEvent('playerEvent', { detail: { eid: 'END' } }));

      expect(first).not.toHaveBeenCalled();
      expect(onPlayerEvent).toHaveBeenCalledTimes(1);
    });

    it('detaches the playerEvent listener on removeEventListeners', () => {
      service.attachEventListeners(wrapper, onPlayerEvent, onTelemetryEvent);
      service.removeEventListeners(wrapper);

      inner.dispatchEvent(new CustomEvent('playerEvent', { detail: { eid: 'END' } }));

      expect(onPlayerEvent).not.toHaveBeenCalled();
    });

    it('keeps forwarding this player\'s telemetry until its END event arrives', () => {
      service.attachEventListeners(wrapper, onPlayerEvent, onTelemetryEvent);
      service.removeEventListeners(wrapper);

      telemetry({ eid: 'INTERACT', context: { contentId: 'do_video_1' } });
      expect(onTelemetryEvent).toHaveBeenCalledTimes(1);

      telemetry({ eid: 'end', object: { id: 'do_video_1' } });
      expect(onTelemetryEvent).toHaveBeenCalledTimes(2);

      // Listener removed by the END event — nothing further gets through.
      telemetry({ eid: 'INTERACT', object: { id: 'do_video_1' } });
      expect(onTelemetryEvent).toHaveBeenCalledTimes(2);
    });

    it('ignores telemetry belonging to a different player', () => {
      service.attachEventListeners(wrapper, onPlayerEvent, onTelemetryEvent);
      service.removeEventListeners(wrapper);

      telemetry({ eid: 'END', object: { id: 'do_other' } });

      expect(onTelemetryEvent).not.toHaveBeenCalled();
      // The unrelated END must not have torn down this player's listener.
      telemetry({ eid: 'INTERACT', object: { id: 'do_video_1' } });
      expect(onTelemetryEvent).toHaveBeenCalledTimes(1);
    });

    it('drops the telemetry listener after the 3s safety timeout when END never fires', () => {
      service.attachEventListeners(wrapper, onPlayerEvent, onTelemetryEvent);
      service.removeEventListeners(wrapper);

      vi.advanceTimersByTime(3000);
      telemetry({ eid: 'INTERACT', object: { id: 'do_video_1' } });

      expect(onTelemetryEvent).not.toHaveBeenCalled();
    });

    it('is a no-op when removing listeners that were never attached', () => {
      const spy = vi.spyOn(document, 'addEventListener');

      service.removeEventListeners(document.createElement('div'));

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
