import { VideoPlayerConfig, VideoPlayerEvent, VideoPlayerContextProps, VideoPlayerMetadata } from './types';
import { buildPlayerContext } from '../PlayerContextService';

export class VideoPlayerService {
  private eventHandlers = new WeakMap<HTMLElement, { player: (event: Event) => void; telemetry: (event: Event) => void }>();
  private static scriptLoaded = false;
  private static scriptLoading?: Promise<void>;
  private static cachedCss: string | null = null;
  private static cssLoading?: Promise<string>;
  private static stylesInjected = false;

  private loadScript(): Promise<void> {
    if (VideoPlayerService.scriptLoaded || customElements.get('sunbird-video-player')) {
      VideoPlayerService.scriptLoaded = true;
      return Promise.resolve();
    }
    if (VideoPlayerService.scriptLoading) {
      return VideoPlayerService.scriptLoading;
    }
    VideoPlayerService.scriptLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/assets/video-player/sunbird-video-player.js';
      script.setAttribute('data-video-player-script', 'true');
      script.onload = () => { VideoPlayerService.scriptLoaded = true; VideoPlayerService.scriptLoading = undefined; resolve(); };
      script.onerror = () => { VideoPlayerService.scriptLoading = undefined; reject(new Error('Failed to load sunbird-video-player script')); };
      document.body.appendChild(script);
    });
    return VideoPlayerService.scriptLoading;
  }

  async createConfig(
    metadata: VideoPlayerMetadata,
    contextProps?: VideoPlayerContextProps
  ): Promise<VideoPlayerConfig> {
    await this.loadScript();

    const context = await buildPlayerContext(contextProps, { contentId: metadata.identifier });

    return {
      context,
      config: {
        apislug: '/action',
        sideMenu: {
          showShare: true,
          showDownload: false,
          showExit: true,
          showPrint: false,
          showReplay: true,
        },
      },
      metadata,
    };
  }

  /**
   * Fetch and cache the video player CSS content.
   * The CSS is fetched once and reused across all player instances.
   */
  private async fetchStyles(): Promise<string> {
    if (VideoPlayerService.cachedCss !== null) {
      return VideoPlayerService.cachedCss;
    }
    if (VideoPlayerService.cssLoading) {
      return VideoPlayerService.cssLoading;
    }
    VideoPlayerService.cssLoading = fetch('/assets/video-player/styles.css')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch video player styles: ${response.status}`);
        }
        return response.text();
      })
      .then(css => {
        VideoPlayerService.cachedCss = css;
        VideoPlayerService.cssLoading = undefined;
        return css;
      })
      .catch(error => {
        console.error('Failed to load video player styles:', error);
        VideoPlayerService.cachedCss = '';
        VideoPlayerService.cssLoading = undefined;
        return '';
      });
    return VideoPlayerService.cssLoading;
  }

  /**
   * Rewrite CSS selectors so they work inside @scope.
   * - :root → :scope (CSS variables applied to the wrapper)
   * - html / body → :scope (base styles target the wrapper)
   */
  private rewriteCssForScope(css: string): string {
    let rewritten = css.replace(/:root/g, ':scope');
    rewritten = rewritten.replace(/(?<![a-zA-Z-])html(?=\s*[{,[:]|$)/g, ':scope');
    rewritten = rewritten.replace(/(?<![a-zA-Z-])body(?=\s*[{,[:]|$)/g, ':scope');
    return rewritten;
  }

  /**
   * Inject scoped styles into document.head once.
   * Uses @scope([data-video-player-wrapper]) so styles apply only inside
   * player wrappers without global bleed — no per-instance <style> needed.
   */
  private async injectStyles(): Promise<void> {
    if (VideoPlayerService.stylesInjected) return;
    VideoPlayerService.stylesInjected = true;

    const cssContent = await this.fetchStyles();

    if (cssContent) {
      const scopedCss = this.rewriteCssForScope(cssContent);
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-video-player-styles', 'true');
      styleEl.textContent = `@scope ([data-video-player-wrapper]) {\n${scopedCss}\n}`;
      document.head.appendChild(styleEl);
    }

    // Containment overrides: the custom element defaults to display:inline and
    // .video-js.vjs-fluid sets height:0 + padding-top for aspect ratio,
    // which pushes .vjs-control-bar (position:absolute;bottom:0) off-screen.
    // Override to fill the wrapper height instead.
    // Also hide the Video.js big play button to match portal behavior.
    const containEl = document.createElement('style');
    containEl.setAttribute('data-video-player-contain', 'true');
    containEl.textContent = [
      '[data-video-player-wrapper] sunbird-video-player { display:block; width:100%; height:100%; }',
      '[data-video-player-wrapper] .video-js { width:100% !important; height:100% !important; }',
      '[data-video-player-wrapper] .video-js.vjs-fluid { padding-top:0 !important; }',
      '[data-video-player-wrapper] .vjs-big-play-button { display:none !important; }',
    ].join('\n');
    document.head.appendChild(containEl);
  }

  /**
   * Create video player element with styles scoped via CSS @scope.
   * Styles are injected once into document.head on first use.
   */
  async createElement(config: VideoPlayerConfig): Promise<HTMLElement> {
    await this.injectStyles();

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-video-player-wrapper', 'true');
    wrapper.setAttribute('data-player-id', config.metadata.identifier);
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';

    const element = document.createElement('sunbird-video-player');
    element.setAttribute('player-config', JSON.stringify(config));
    element.setAttribute('data-player-id', config.metadata.identifier);
    wrapper.appendChild(element);

    return wrapper;
  }

  private getPlayerElement(element: HTMLElement): HTMLElement {
    return (element.querySelector('sunbird-video-player') as HTMLElement) || element;
  }

  attachEventListeners(
    element: HTMLElement,
    onPlayerEvent?: (event: VideoPlayerEvent) => void,
    onTelemetryEvent?: (event: any) => void
  ): void {
    this.removeEventListeners(element);

    const playerEl = this.getPlayerElement(element);

    const playerHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (onPlayerEvent) {
        const videoEvent: VideoPlayerEvent = {
          type: customEvent.detail?.eid || 'unknown',
          data: customEvent.detail,
          playerId: playerEl.getAttribute('data-player-id') || 'video-player',
          timestamp: Date.now(),
        };
        onPlayerEvent(videoEvent);
      }
    };

    const telemetryHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (onTelemetryEvent) {
        onTelemetryEvent(customEvent.detail);
      }
    };

    playerEl.addEventListener('playerEvent', playerHandler);
    document.addEventListener('TelemetryEvent', telemetryHandler);
    this.eventHandlers.set(element, { player: playerHandler, telemetry: telemetryHandler });
  }

  /**
   * Remove event listeners. The global TelemetryEvent listener stays alive
   * until the END event fires (self-removing handler) so the web component's
   * asynchronous ngOnDestroy dispatch is captured. A 3 s safety timeout
   * removes the listener if END never fires.
   */
  removeEventListeners(element: HTMLElement): void {
    const handlers = this.eventHandlers.get(element);
    if (!handlers) return;

    const playerEl = this.getPlayerElement(element);
    playerEl.removeEventListener('playerEvent', handlers.player);
    this.eventHandlers.delete(element);

    const originalHandler = handlers.telemetry;
    const cleanup = () => {
      document.removeEventListener('TelemetryEvent', selfRemovingHandler);
    };
    const safetyTimer = setTimeout(cleanup, 3000);
    const selfRemovingHandler = (event: Event) => {
      originalHandler(event);
      const eid = ((event as CustomEvent).detail?.eid ?? '').toUpperCase();
      if (eid === 'END') {
        clearTimeout(safetyTimer);
        cleanup();
      }
    };

    document.removeEventListener('TelemetryEvent', originalHandler);
    document.addEventListener('TelemetryEvent', selfRemovingHandler);
  }
}
