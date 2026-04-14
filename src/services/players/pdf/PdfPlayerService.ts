import { PdfPlayerConfig, PdfPlayerEvent, PdfPlayerContextProps, PdfPlayerMetadata } from './types';
import { buildPlayerContext } from '../PlayerContextService';

export class PdfPlayerService {
  private eventHandlers = new WeakMap<HTMLElement, { player: (event: Event) => void; telemetry: (event: Event) => void }>();
  private static cachedCss: string | null = null;
  private static cssLoading?: Promise<string>;
  private static scriptLoaded = false;
  private static scriptLoading?: Promise<void>;

  private loadScript(): Promise<void> {
    if (PdfPlayerService.scriptLoaded || customElements.get('sunbird-pdf-player')) {
      PdfPlayerService.scriptLoaded = true;
      return Promise.resolve();
    }
    if (PdfPlayerService.scriptLoading) {
      return PdfPlayerService.scriptLoading;
    }
    PdfPlayerService.scriptLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/assets/pdf-player/sunbird-pdf-player.js';
      script.setAttribute('data-pdf-player-script', 'true');
      script.onload = () => { PdfPlayerService.scriptLoaded = true; PdfPlayerService.scriptLoading = undefined; resolve(); };
      script.onerror = () => { PdfPlayerService.scriptLoading = undefined; reject(new Error('Failed to load sunbird-pdf-player script')); };
      document.body.appendChild(script);
    });
    return PdfPlayerService.scriptLoading;
  }

  async createConfig(
    metadata: PdfPlayerMetadata,
    contextProps?: PdfPlayerContextProps
  ): Promise<PdfPlayerConfig> {
    await this.loadScript();

    const context = await buildPlayerContext(contextProps, { contentId: metadata.identifier });

    return {
      context,
      config: {
        baseURL: '',
        apislug: '/action',
        sideMenu: {
          showShare: false,
          showDownload: false,
          showPrint: false,
          showExit: true,
        },
      },
      metadata,
    };
  }

  private async fetchStyles(): Promise<string> {
    if (PdfPlayerService.cachedCss !== null) {
      return PdfPlayerService.cachedCss;
    }
    if (PdfPlayerService.cssLoading) {
      return PdfPlayerService.cssLoading;
    }
    PdfPlayerService.cssLoading = fetch('/assets/pdf-player/styles.css')
      .then(response => {
        if (!response.ok) throw new Error(`Failed to fetch pdf player styles: ${response.status}`);
        return response.text();
      })
      .then(css => {
        PdfPlayerService.cachedCss = css;
        PdfPlayerService.cssLoading = undefined;
        return css;
      })
      .catch(error => {
        PdfPlayerService.cachedCss = '';
        PdfPlayerService.cssLoading = undefined;
        console.error('Failed to load pdf player styles:', error);
        return '';
      });
    return PdfPlayerService.cssLoading;
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

  async createElement(config: PdfPlayerConfig): Promise<HTMLElement> {
    const cssContent = await this.fetchStyles();

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-pdf-player-wrapper', 'true');
    wrapper.setAttribute('data-player-id', config.metadata.identifier);
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';

    if (cssContent) {
      const scopedCss = this.rewriteCssForScope(cssContent);
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-pdf-player-styles', 'true');
      styleEl.textContent = `@scope ([data-pdf-player-wrapper]) {\n${scopedCss}\n}`;
      wrapper.appendChild(styleEl);
    }

    const element = document.createElement('sunbird-pdf-player');
    element.setAttribute('player-config', JSON.stringify(config));
    element.setAttribute('data-player-id', config.metadata.identifier);
    wrapper.appendChild(element);

    return wrapper;
  }

  private getPlayerElement(element: HTMLElement): HTMLElement {
    return (element.querySelector('sunbird-pdf-player') as HTMLElement) || element;
  }

  attachEventListeners(
    element: HTMLElement,
    onPlayerEvent?: (event: PdfPlayerEvent) => void,
    onTelemetryEvent?: (event: any) => void
  ): void {
    this.removeEventListeners(element);

    const playerEl = this.getPlayerElement(element);

    const playerHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (onPlayerEvent) {
        const pdfEvent: PdfPlayerEvent = {
          type: customEvent.detail?.eid || 'unknown',
          data: customEvent.detail,
          playerId: playerEl.getAttribute('data-player-id') || 'pdf-player',
          timestamp: Date.now(),
        };
        onPlayerEvent(pdfEvent);
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
    const playerId = element.getAttribute('data-player-id') ?? 'unknown';

    const playerEl = this.getPlayerElement(element);
    playerEl.removeEventListener('playerEvent', handlers.player);
    this.eventHandlers.delete(element);

    const originalHandler = handlers.telemetry;
    const cleanup = () => {
      document.removeEventListener('TelemetryEvent', selfRemovingHandler);
    };
    const safetyTimer = setTimeout(cleanup, 3000);
    const selfRemovingHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail;

      // Scope: only react to events from this player instance.
      const eventContentId: string =
        detail?.object?.id ?? detail?.context?.contentId ?? '';
      if (eventContentId !== playerId) {
        return;
      }
      originalHandler(event);
      const eid = (detail?.eid ?? '').toUpperCase();
      if (eid === 'END') {
        clearTimeout(safetyTimer);
        cleanup();
      }
    };

    document.removeEventListener('TelemetryEvent', originalHandler);
    document.addEventListener('TelemetryEvent', selfRemovingHandler);
  }
}
