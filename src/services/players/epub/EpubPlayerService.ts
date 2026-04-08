import { EpubPlayerConfig, EpubPlayerEvent, EpubPlayerContextProps, EpubPlayerMetadata } from './types';
import { buildPlayerContext } from '../PlayerContextService';

export class EpubPlayerService {
  private eventHandlers = new WeakMap<HTMLElement, { player: (event: Event) => void; telemetry: (event: Event) => void }>();

  private static scriptLoaded = false;
  private static scriptLoading?: Promise<void>;
  private static cachedCss: string | null = null;
  private static cssLoading?: Promise<string>;

  private loadScript(): Promise<void> {
    if (EpubPlayerService.scriptLoaded || customElements.get('sunbird-epub-player')) {
      EpubPlayerService.scriptLoaded = true;
      return Promise.resolve();
    }
    if (EpubPlayerService.scriptLoading) {
      return EpubPlayerService.scriptLoading;
    }
    EpubPlayerService.scriptLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/assets/epub-player/sunbird-epub-player.js';
      script.setAttribute('data-epub-player-script', 'true');
      script.onload = () => { EpubPlayerService.scriptLoaded = true; EpubPlayerService.scriptLoading = undefined; resolve(); };
      script.onerror = () => { EpubPlayerService.scriptLoading = undefined; reject(new Error('Failed to load sunbird-epub-player script')); };
      document.body.appendChild(script);
    });
    return EpubPlayerService.scriptLoading;
  }

  async createConfig(
    metadata: EpubPlayerMetadata,
    contextProps?: EpubPlayerContextProps
  ): Promise<EpubPlayerConfig> {
    await this.loadScript();

    const context = await buildPlayerContext(contextProps, { contentId: metadata.identifier });

    return {
      context,
      config: {
        apislug: '/action',
        sideMenu: {
          enable: true,
          showExit: true,
        },
      },
      metadata,
    };
  }

  private async fetchStyles(): Promise<string> {
    if (EpubPlayerService.cachedCss !== null) {
      return EpubPlayerService.cachedCss;
    }
    if (EpubPlayerService.cssLoading) {
      return EpubPlayerService.cssLoading;
    }
    EpubPlayerService.cssLoading = fetch('/assets/epub-player/styles.css')
      .then(response => {
        if (!response.ok) throw new Error(`Failed to fetch epub player styles: ${response.status}`);
        return response.text();
      })
      .then(css => {
        EpubPlayerService.cachedCss = css;
        EpubPlayerService.cssLoading = undefined;
        return css;
      })
      .catch(error => {
        EpubPlayerService.cachedCss = '';
        EpubPlayerService.cssLoading = undefined;
        console.error('Failed to load epub player styles:', error);
        return '';
      });
    return EpubPlayerService.cssLoading;
  }

  private rewriteCssForScope(css: string): string {
    let rewritten = css.replace(/:root/g, ':scope');
    rewritten = rewritten.replace(/(?<![a-zA-Z-])html(?=\s*[{,[:]|$)/g, ':scope');
    rewritten = rewritten.replace(/(?<![a-zA-Z-])body(?=\s*[{,[:]|$)/g, ':scope');
    return rewritten;
  }

  static unloadStyles(): void {
    // Styles are scoped inside the wrapper and removed automatically
  }

  async createElement(config: EpubPlayerConfig): Promise<HTMLElement> {
    const cssContent = await this.fetchStyles();

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-epub-player-wrapper', 'true');
    wrapper.setAttribute('data-player-id', config.metadata.identifier);
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';

    if (cssContent) {
      const scopedCss = this.rewriteCssForScope(cssContent);
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-epub-player-styles', 'true');
      styleEl.textContent = `@scope ([data-epub-player-wrapper]) {\n${scopedCss}\n}`;
      wrapper.appendChild(styleEl);
    }

    const element = document.createElement('sunbird-epub-player');
    element.setAttribute('player-config', JSON.stringify(config));
    element.setAttribute('data-player-id', config.metadata.identifier);
    wrapper.appendChild(element);

    return wrapper;
  }

  private getPlayerElement(element: HTMLElement): HTMLElement {
    return (element.querySelector('sunbird-epub-player') as HTMLElement) || element;
  }

  attachEventListeners(
    element: HTMLElement,
    onPlayerEvent?: (event: EpubPlayerEvent) => void,
    onTelemetryEvent?: (event: any) => void
  ): void {
    this.removeEventListeners(element);

    const playerEl = this.getPlayerElement(element);

    const playerHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (onPlayerEvent) {
        const epubEvent: EpubPlayerEvent = {
          type: customEvent.detail?.eid || 'unknown',
          data: customEvent.detail,
          playerId: playerEl.getAttribute('data-player-id') || 'epub-player',
          timestamp: Date.now(),
        };
        onPlayerEvent(epubEvent);
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
