import type { QumlPlayerConfig, QumlPlayerEvent, QumlPlayerContextProps, QumlPlayerMetadata } from './types';
import { buildPlayerContext } from '../PlayerContextService';

export class QumlPlayerService {
  private eventHandlers = new WeakMap<HTMLElement, { player: (event: Event) => void; telemetry: (event: Event) => void }>();
  private static stylesLoaded = false;
  private static scriptLoaded = false;
  private static scriptLoading?: Promise<void>;

  private loadScript(): Promise<void> {
    if (QumlPlayerService.scriptLoaded || customElements.get('sunbird-quml-player')) {
      QumlPlayerService.scriptLoaded = true;
      return Promise.resolve();
    }
    if (QumlPlayerService.scriptLoading) {
      return QumlPlayerService.scriptLoading;
    }
    QumlPlayerService.scriptLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/assets/quml-player/sunbird-quml-player.js';
      script.setAttribute('data-quml-player-script', 'true');
      script.onload = () => { QumlPlayerService.scriptLoaded = true; QumlPlayerService.scriptLoading = undefined; resolve(); };
      script.onerror = () => { QumlPlayerService.scriptLoading = undefined; reject(new Error('Failed to load sunbird-quml-player script')); };
      document.body.appendChild(script);
    });
    return QumlPlayerService.scriptLoading;
  }

  async createConfig(
    metadata: QumlPlayerMetadata,
    contextProps?: QumlPlayerContextProps
  ): Promise<QumlPlayerConfig> {
    await this.loadScript();

    const baseContext = await buildPlayerContext(contextProps);
    const context = { ...baseContext, userData: { firstName: '', lastName: '' } };

    return { context, config: {}, metadata };
  }

  private loadStyles(): void {
    (window as any).questionListUrl = '/action/question/v2/list';

    const existingStyles = document.querySelector('[data-quml-player-styles="true"]');
    if (existingStyles || QumlPlayerService.stylesLoaded) {
      QumlPlayerService.stylesLoaded = true;
      return;
    }

    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = '/assets/quml-player/styles.css';
    styleLink.setAttribute('data-quml-player-styles', 'true');
    document.head.appendChild(styleLink);

    QumlPlayerService.stylesLoaded = true;
  }

  static unloadStyles(): void {
    const styleLink = document.querySelector('[data-quml-player-styles="true"]');
    if (styleLink) {
      styleLink.remove();
    }
    QumlPlayerService.stylesLoaded = false;
  }

  createElement(config: QumlPlayerConfig): HTMLElement {
    this.loadStyles();

    const element = document.createElement('sunbird-quml-player');
    element.setAttribute('player-config', JSON.stringify(config));
    element.setAttribute('data-player-id', config.metadata.identifier);

    return element;
  }

  attachEventListeners(
    element: HTMLElement,
    onPlayerEvent?: (event: QumlPlayerEvent) => void,
    onTelemetryEvent?: (event: any) => void
  ): void {
    this.removeEventListeners(element);

    const playerHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (onPlayerEvent) {
        const qumlEvent: QumlPlayerEvent = {
          type: customEvent.detail?.eid || 'unknown',
          data: customEvent.detail,
          playerId: element.getAttribute('data-player-id') || 'quml-player',
          timestamp: Date.now(),
        };
        onPlayerEvent(qumlEvent);
      }
    };

    const telemetryHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (onTelemetryEvent) {
        onTelemetryEvent(customEvent.detail);
      }
    };

    element.addEventListener('playerEvent', playerHandler);
    element.addEventListener('telemetryEvent', telemetryHandler);
    this.eventHandlers.set(element, { player: playerHandler, telemetry: telemetryHandler });
  }

  removeEventListeners(element: HTMLElement): void {
    const handlers = this.eventHandlers.get(element);
    if (handlers) {
      element.removeEventListener('playerEvent', handlers.player);
      element.removeEventListener('telemetryEvent', handlers.telemetry);
      this.eventHandlers.delete(element);
    }
  }
}

export const qumlPlayerService = new QumlPlayerService();
