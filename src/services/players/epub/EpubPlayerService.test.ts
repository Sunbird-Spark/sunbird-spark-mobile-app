import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import type { EpubPlayerConfig, EpubPlayerMetadata } from './types';

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

const SCRIPT_SELECTOR = 'script[data-epub-player-script]';

type ServiceCtor = typeof import('./EpubPlayerService').EpubPlayerService;

const metadata = (identifier = 'do_epub_1'): EpubPlayerMetadata => ({
  identifier,
  name: 'A book',
  artifactUrl: 'book.epub',
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

function fireOnScript(type: 'load' | 'error'): HTMLScriptElement {
  const scripts = injectedScripts();
  const script = scripts[scripts.length - 1];
  if (!script) throw new Error('no script injected');
  script.dispatchEvent(new Event(type));
  return script;
}

describe('EpubPlayerService', () => {
  let EpubPlayerService: ServiceCtor;
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
      text: () => Promise.resolve(':root{--epub-bg:#fff}\nbody{margin:0}\n.epub-body-x{color:red}'),
    });
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    ({ EpubPlayerService } = await import('./EpubPlayerService'));
    service = new EpubPlayerService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function buildConfig(identifier = 'do_epub_1'): Promise<EpubPlayerConfig> {
    const pending = service.createConfig(metadata(identifier));
    fireOnScript('load');
    return pending;
  }

  // ── loadScript ─────────────────────────────────────────────────────────────

  describe('script injection', () => {
    it('injects the player script and resolves the config once it loads', async () => {
      const md = metadata();
      const pending = service.createConfig(md);

      expect(injectedScripts()).toHaveLength(1);
      expect(injectedScripts()[0].getAttribute('src')).toBe(
        '/assets/epub-player/sunbird-epub-player.js',
      );

      fireOnScript('load');
      const config = await pending;

      expect(config.metadata).toBe(md);
      expect(mockBuildPlayerContext).toHaveBeenCalledWith(undefined, { contentId: 'do_epub_1' });
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
      await buildConfig('a');

      await new EpubPlayerService().createConfig(metadata('b'));

      expect(injectedScripts()).toHaveLength(1);
    });

    it('rejects when the script fails to load', async () => {
      const pending = service.createConfig(metadata());
      fireOnScript('error');

      await expect(pending).rejects.toThrow('Failed to load sunbird-epub-player script');
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
    it('builds the epub side-menu configuration', async () => {
      const config = await buildConfig();

      expect(config.config.apislug).toBe('/action');
      expect(config.config.sideMenu).toEqual({
        enable: true,
        showExit: true,
      });
    });

    it('forwards the caller context overrides to buildPlayerContext', async () => {
      const overrides = { mode: 'preview', cdata: [{ type: 'batch', id: 'b1' }] };

      const pending = service.createConfig(metadata('do_epub_2'), overrides);
      fireOnScript('load');
      await pending;

      expect(mockBuildPlayerContext).toHaveBeenCalledWith(overrides, { contentId: 'do_epub_2' });
    });
  });

  // ── styles + createElement ─────────────────────────────────────────────────

  describe('createElement', () => {
    it('scopes the fetched CSS inside the wrapper rather than the document head', async () => {
      const config = await buildConfig();
      const wrapper = await service.createElement(config);

      expect(mockFetch).toHaveBeenCalledWith('/assets/epub-player/styles.css');

      const styleEl = wrapper.querySelector('style[data-epub-player-styles]');
      expect(styleEl).not.toBeNull();
      const css = styleEl!.textContent ?? '';
      expect(css.startsWith('@scope ([data-epub-player-wrapper]) {')).toBe(true);
      expect(css).toContain(':scope{--epub-bg:#fff}');
      expect(css).toContain(':scope{margin:0}');
      expect(css).not.toContain(':root');
      // A class that merely *contains* "body" must survive the rewrite.
      expect(css).toContain('.epub-body-x{color:red}');

      expect(document.head.querySelector('style[data-epub-player-styles]')).toBeNull();
    });

    it('builds a sized wrapper around the custom element carrying the config', async () => {
      const config = await buildConfig('do_epub_9');
      const wrapper = await service.createElement(config);

      expect(wrapper.getAttribute('data-epub-player-wrapper')).toBe('true');
      expect(wrapper.getAttribute('data-player-id')).toBe('do_epub_9');
      expect(wrapper.style.width).toBe('100%');
      expect(wrapper.style.height).toBe('100%');

      const inner = wrapper.querySelector('sunbird-epub-player');
      expect(inner).not.toBeNull();
      expect(inner!.getAttribute('data-player-id')).toBe('do_epub_9');
      expect(JSON.parse(inner!.getAttribute('player-config')!)).toEqual(
        JSON.parse(JSON.stringify(config)),
      );
    });

    it('reuses the cached CSS for later elements instead of re-fetching', async () => {
      const config = await buildConfig();

      const first = await service.createElement(config);
      const second = await new EpubPlayerService().createElement(config);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(first.querySelector('style[data-epub-player-styles]')).not.toBeNull();
      expect(second.querySelector('style[data-epub-player-styles]')).not.toBeNull();
    });

    it('shares a single in-flight CSS request between concurrent elements', async () => {
      const config = await buildConfig();
      let resolveFetch: (value: any) => void = () => {};
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      );

      const first = service.createElement(config);
      const second = service.createElement(config);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      resolveFetch({ ok: true, text: () => Promise.resolve('body{margin:0}') });
      const [a, b] = await Promise.all([first, second]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(a.querySelector('style[data-epub-player-styles]')!.textContent).toContain(
        ':scope{margin:0}',
      );
      expect(b.querySelector('style[data-epub-player-styles]')).not.toBeNull();
    });

    it('renders without a style tag when the CSS request is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('') });
      const config = await buildConfig();

      const wrapper = await service.createElement(config);

      expect(wrapper.querySelector('style[data-epub-player-styles]')).toBeNull();
      expect(wrapper.querySelector('sunbird-epub-player')).not.toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load epub player styles:',
        expect.objectContaining({ message: 'Failed to fetch epub player styles: 500' }),
      );
    });

    it('caches the failure so a second element does not re-fetch', async () => {
      mockFetch.mockRejectedValue(new Error('network down'));
      const config = await buildConfig();

      await service.createElement(config);
      const second = await service.createElement(config);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(second.querySelector('style[data-epub-player-styles]')).toBeNull();
    });

    it('exposes a no-op unloadStyles because styles live inside the wrapper', () => {
      expect(() => EpubPlayerService.unloadStyles()).not.toThrow();
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
      wrapper = await service.createElement(await buildConfig('do_epub_1'));
      inner = wrapper.querySelector('sunbird-epub-player') as HTMLElement;
      onPlayerEvent = vi.fn<(event: any) => void>();
      onTelemetryEvent = vi.fn<(event: any) => void>();
    });

    const telemetry = (detail: any) =>
      document.dispatchEvent(new CustomEvent('TelemetryEvent', { detail }));

    it('maps playerEvent details onto a EpubPlayerEvent', () => {
      service.attachEventListeners(wrapper, onPlayerEvent, onTelemetryEvent);

      inner.dispatchEvent(new CustomEvent('playerEvent', { detail: { eid: 'IMPRESSION' } }));

      expect(onPlayerEvent).toHaveBeenCalledTimes(1);
      const event = onPlayerEvent.mock.calls[0][0];
      expect(event.type).toBe('IMPRESSION');
      expect(event.data).toEqual({ eid: 'IMPRESSION' });
      expect(event.playerId).toBe('do_epub_1');
      expect(typeof event.timestamp).toBe('number');
    });

    it('falls back to "unknown" when the event carries no eid', () => {
      service.attachEventListeners(wrapper, onPlayerEvent);

      inner.dispatchEvent(new CustomEvent('playerEvent', { detail: {} }));

      expect(onPlayerEvent.mock.calls[0][0].type).toBe('unknown');
    });

    it('forwards document TelemetryEvent details to the telemetry callback', () => {
      service.attachEventListeners(wrapper, onPlayerEvent, onTelemetryEvent);

      telemetry({ eid: 'START', object: { id: 'do_epub_1' } });

      expect(onTelemetryEvent).toHaveBeenCalledWith({ eid: 'START', object: { id: 'do_epub_1' } });
    });

    it('uses the element itself and a default id when there is no inner player element', () => {
      const bare = document.createElement('div');
      service.attachEventListeners(bare, onPlayerEvent);

      bare.dispatchEvent(new CustomEvent('playerEvent', { detail: { eid: 'END' } }));

      expect(onPlayerEvent.mock.calls[0][0].playerId).toBe('epub-player');
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

      telemetry({ eid: 'INTERACT', context: { contentId: 'do_epub_1' } });
      expect(onTelemetryEvent).toHaveBeenCalledTimes(1);

      telemetry({ eid: 'end', object: { id: 'do_epub_1' } });
      expect(onTelemetryEvent).toHaveBeenCalledTimes(2);

      telemetry({ eid: 'INTERACT', object: { id: 'do_epub_1' } });
      expect(onTelemetryEvent).toHaveBeenCalledTimes(2);
    });

    it('ignores telemetry belonging to a different player', () => {
      service.attachEventListeners(wrapper, onPlayerEvent, onTelemetryEvent);
      service.removeEventListeners(wrapper);

      telemetry({ eid: 'END', object: { id: 'do_other' } });

      expect(onTelemetryEvent).not.toHaveBeenCalled();
      telemetry({ eid: 'INTERACT', object: { id: 'do_epub_1' } });
      expect(onTelemetryEvent).toHaveBeenCalledTimes(1);
    });

    it('still forwards unscoped telemetry that carries no content id', () => {
      service.attachEventListeners(wrapper, onPlayerEvent, onTelemetryEvent);
      service.removeEventListeners(wrapper);

      // The epub player relaxes the scope check when the event has no id at all.
      telemetry({ eid: 'INTERACT' });
      expect(onTelemetryEvent).toHaveBeenCalledTimes(1);

      telemetry({ eid: 'END' });
      expect(onTelemetryEvent).toHaveBeenCalledTimes(2);

      // The unscoped END tore the listener down.
      telemetry({ eid: 'INTERACT' });
      expect(onTelemetryEvent).toHaveBeenCalledTimes(2);
    });

    it('drops the telemetry listener after the 3s safety timeout when END never fires', () => {
      service.attachEventListeners(wrapper, onPlayerEvent, onTelemetryEvent);
      service.removeEventListeners(wrapper);

      vi.advanceTimersByTime(3000);
      telemetry({ eid: 'INTERACT', object: { id: 'do_epub_1' } });

      expect(onTelemetryEvent).not.toHaveBeenCalled();
    });

    it('is a no-op when removing listeners that were never attached', () => {
      const spy = vi.spyOn(document, 'addEventListener');

      service.removeEventListeners(document.createElement('div'));

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
