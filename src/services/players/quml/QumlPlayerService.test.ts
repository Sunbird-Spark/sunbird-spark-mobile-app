/**
 * The service injects a real <link rel="stylesheet"> into document.head; without
 * this option happy-dom would try to fetch it over the network.
 *
 * @vitest-environment-options { "settings": { "disableCSSFileLoading": true, "handleDisabledFileLoadingAsSuccess": true } }
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import type { QumlPlayerConfig, QumlPlayerMetadata } from './types';

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

const SCRIPT_SELECTOR = 'script[data-quml-player-script]';
const STYLE_SELECTOR = 'link[data-quml-player-styles="true"]';

type Module = typeof import('./QumlPlayerService');
type ServiceCtor = Module['QumlPlayerService'];

const metadata = (identifier = 'do_quml_1'): QumlPlayerMetadata => ({
  identifier,
  name: 'A question set',
  mimeType: 'application/vnd.sunbird.questionset',
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

function styleLinks(): Element[] {
  return Array.from(document.head.querySelectorAll(STYLE_SELECTOR));
}

describe('QumlPlayerService', () => {
  let QumlPlayerService: ServiceCtor;
  let qumlPlayerService: Module['qumlPlayerService'];
  let service: InstanceType<ServiceCtor>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    delete (window as any).questionListUrl;

    scriptHost = document.createElement('div');
    vi.spyOn(document.body, 'appendChild').mockImplementation(
      ((node: Node) => scriptHost.appendChild(node)) as any,
    );
    ({ QumlPlayerService, qumlPlayerService } = await import('./QumlPlayerService'));
    service = new QumlPlayerService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function buildConfig(identifier = 'do_quml_1'): Promise<QumlPlayerConfig> {
    const pending = service.createConfig(metadata(identifier));
    fireOnScript('load');
    return pending;
  }

  it('exports a ready-to-use singleton', () => {
    expect(qumlPlayerService).toBeInstanceOf(QumlPlayerService);
  });

  // ── loadScript ─────────────────────────────────────────────────────────────

  describe('script injection', () => {
    it('injects the player script and resolves the config once it loads', async () => {
      const md = metadata();
      const pending = service.createConfig(md);

      expect(injectedScripts()).toHaveLength(1);
      expect(injectedScripts()[0].getAttribute('src')).toBe(
        '/assets/quml-player/sunbird-quml-player.js',
      );

      fireOnScript('load');
      const config = await pending;

      expect(config.metadata).toBe(md);
      expect(mockBuildPlayerContext).toHaveBeenCalledWith(undefined, { contentId: 'do_quml_1' });
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

      await new QumlPlayerService().createConfig(metadata('b'));

      expect(injectedScripts()).toHaveLength(1);
    });

    it('rejects when the script fails to load', async () => {
      const pending = service.createConfig(metadata());
      fireOnScript('error');

      await expect(pending).rejects.toThrow('Failed to load sunbird-quml-player script');
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
    it('builds the quml side-menu configuration', async () => {
      const config = await buildConfig();

      expect(config.config.sideMenu).toEqual({
        enable: true,
        showShare: true,
        showExit: true,
      });
    });

    it('forwards the caller context overrides to buildPlayerContext', async () => {
      const overrides = { mode: 'preview', cdata: [{ type: 'course', id: 'do_c' }] };

      const pending = service.createConfig(metadata('do_quml_2'), overrides);
      fireOnScript('load');
      await pending;

      expect(mockBuildPlayerContext).toHaveBeenCalledWith(overrides, { contentId: 'do_quml_2' });
    });
  });

  // ── createElement + stylesheet link ────────────────────────────────────────

  describe('createElement', () => {
    it('creates the custom element carrying the serialised config', async () => {
      const config = await buildConfig('do_quml_7');

      const element = service.createElement(config);

      expect(element.tagName.toLowerCase()).toBe('sunbird-quml-player');
      expect(element.getAttribute('data-player-id')).toBe('do_quml_7');
      expect(JSON.parse(element.getAttribute('player-config')!)).toEqual(
        JSON.parse(JSON.stringify(config)),
      );
    });

    it('publishes the question list url the web component reads off window', async () => {
      const config = await buildConfig();

      service.createElement(config);

      expect((window as any).questionListUrl).toBe('/action/question/v2/list');
    });

    it('adds the stylesheet link to the document head exactly once', async () => {
      const config = await buildConfig();

      service.createElement(config);
      const links = styleLinks();
      expect(links).toHaveLength(1);
      expect(links[0].getAttribute('rel')).toBe('stylesheet');
      expect(links[0].getAttribute('href')).toBe('/assets/quml-player/styles.css');

      service.createElement(config);
      new QumlPlayerService().createElement(config);
      expect(styleLinks()).toHaveLength(1);
    });

    it('does not duplicate a stylesheet link that is already in the document', async () => {
      const preExisting = document.createElement('link');
      preExisting.rel = 'stylesheet';
      preExisting.href = '/assets/quml-player/styles.css';
      preExisting.setAttribute('data-quml-player-styles', 'true');
      document.head.appendChild(preExisting);

      const config = await buildConfig();
      service.createElement(config);

      expect(styleLinks()).toHaveLength(1);
      expect(styleLinks()[0]).toBe(preExisting);
    });
  });

  // ── unloadStyles ───────────────────────────────────────────────────────────

  describe('unloadStyles', () => {
    it('removes the injected stylesheet link', async () => {
      const config = await buildConfig();
      service.createElement(config);
      expect(styleLinks()).toHaveLength(1);

      QumlPlayerService.unloadStyles();

      expect(styleLinks()).toHaveLength(0);
    });

    it('allows the stylesheet to be re-added after unloading', async () => {
      const config = await buildConfig();
      service.createElement(config);
      QumlPlayerService.unloadStyles();

      service.createElement(config);

      expect(styleLinks()).toHaveLength(1);
    });

    it('is safe to call when no stylesheet was ever injected', () => {
      expect(() => QumlPlayerService.unloadStyles()).not.toThrow();
      expect(styleLinks()).toHaveLength(0);
    });
  });

  // ── event listeners ────────────────────────────────────────────────────────

  describe('event listeners', () => {
    let element: HTMLElement;
    let onPlayerEvent: Mock<(event: any) => void>;
    let onTelemetryEvent: Mock<(event: any) => void>;

    beforeEach(async () => {
      element = service.createElement(await buildConfig('do_quml_1'));
      onPlayerEvent = vi.fn<(event: any) => void>();
      onTelemetryEvent = vi.fn<(event: any) => void>();
    });

    it('maps playerEvent details onto a QumlPlayerEvent', () => {
      service.attachEventListeners(element, onPlayerEvent, onTelemetryEvent);

      element.dispatchEvent(new CustomEvent('playerEvent', { detail: { eid: 'IMPRESSION' } }));

      expect(onPlayerEvent).toHaveBeenCalledTimes(1);
      const event = onPlayerEvent.mock.calls[0][0];
      expect(event.type).toBe('IMPRESSION');
      expect(event.data).toEqual({ eid: 'IMPRESSION' });
      expect(event.playerId).toBe('do_quml_1');
      expect(typeof event.timestamp).toBe('number');
    });

    it('falls back to "unknown" when the event carries no eid', () => {
      service.attachEventListeners(element, onPlayerEvent);

      element.dispatchEvent(new CustomEvent('playerEvent', { detail: {} }));

      expect(onPlayerEvent.mock.calls[0][0].type).toBe('unknown');
    });

    it('falls back to a default player id when the element is not tagged', () => {
      const bare = document.createElement('div');
      service.attachEventListeners(bare, onPlayerEvent);

      bare.dispatchEvent(new CustomEvent('playerEvent', { detail: { eid: 'END' } }));

      expect(onPlayerEvent.mock.calls[0][0].playerId).toBe('quml-player');
    });

    it('forwards element-level telemetryEvent details to the telemetry callback', () => {
      service.attachEventListeners(element, onPlayerEvent, onTelemetryEvent);

      element.dispatchEvent(new CustomEvent('telemetryEvent', { detail: { eid: 'ASSESS' } }));

      expect(onTelemetryEvent).toHaveBeenCalledWith({ eid: 'ASSESS' });
      expect(onPlayerEvent).not.toHaveBeenCalled();
    });

    it('does not throw when no callbacks are supplied', () => {
      service.attachEventListeners(element);

      expect(() =>
        element.dispatchEvent(new CustomEvent('playerEvent', { detail: { eid: 'END' } })),
      ).not.toThrow();
      expect(() =>
        element.dispatchEvent(new CustomEvent('telemetryEvent', { detail: { eid: 'END' } })),
      ).not.toThrow();
    });

    it('replaces the previous handlers when attached twice', () => {
      const firstPlayer = vi.fn<(event: any) => void>();
      const firstTelemetry = vi.fn<(event: any) => void>();
      service.attachEventListeners(element, firstPlayer, firstTelemetry);
      service.attachEventListeners(element, onPlayerEvent, onTelemetryEvent);

      element.dispatchEvent(new CustomEvent('playerEvent', { detail: { eid: 'END' } }));
      element.dispatchEvent(new CustomEvent('telemetryEvent', { detail: { eid: 'END' } }));

      expect(firstPlayer).not.toHaveBeenCalled();
      expect(firstTelemetry).not.toHaveBeenCalled();
      expect(onPlayerEvent).toHaveBeenCalledTimes(1);
      expect(onTelemetryEvent).toHaveBeenCalledTimes(1);
    });

    it('detaches both listeners on removeEventListeners', () => {
      service.attachEventListeners(element, onPlayerEvent, onTelemetryEvent);
      service.removeEventListeners(element);

      element.dispatchEvent(new CustomEvent('playerEvent', { detail: { eid: 'END' } }));
      element.dispatchEvent(new CustomEvent('telemetryEvent', { detail: { eid: 'END' } }));

      expect(onPlayerEvent).not.toHaveBeenCalled();
      expect(onTelemetryEvent).not.toHaveBeenCalled();
    });

    it('is a no-op when removing listeners that were never attached', () => {
      const bare = document.createElement('div');
      const spy = vi.spyOn(bare, 'removeEventListener');

      service.removeEventListeners(bare);

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
