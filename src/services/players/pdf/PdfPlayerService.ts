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

    const context = await buildPlayerContext(contextProps);

    return { context, config: {}, metadata };
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
    playerEl.addEventListener('telemetryEvent', telemetryHandler);
    this.eventHandlers.set(element, { player: playerHandler, telemetry: telemetryHandler });
  }

  removeEventListeners(element: HTMLElement): void {
    const handlers = this.eventHandlers.get(element);
    if (handlers) {
      const playerEl = this.getPlayerElement(element);
      playerEl.removeEventListener('playerEvent', handlers.player);
      playerEl.removeEventListener('telemetryEvent', handlers.telemetry);
      this.eventHandlers.delete(element);
    }
  }
}
