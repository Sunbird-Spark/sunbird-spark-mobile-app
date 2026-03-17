import { VideoPlayerConfig, VideoPlayerEvent, VideoPlayerContextProps, VideoPlayerMetadata } from './types';
import { deviceService } from '../../device';
import { OrganizationService } from '../../OrganizationService';

export class VideoPlayerService {
  private eventHandlers = new WeakMap<HTMLElement, { player: (event: Event) => void; telemetry: (event: Event) => void }>();
  private orgService = new OrganizationService();
  private static cachedCss: string | null = null;
  private static cssLoading?: Promise<string>;
  private static scriptLoaded = false;
  private static scriptLoading?: Promise<void>;

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

  static unloadStyles(): void {
    // Styles are scoped inside the wrapper and removed automatically
  }

  async createConfig(
    metadata: VideoPlayerMetadata,
    contextProps?: VideoPlayerContextProps
  ): Promise<VideoPlayerConfig> {
    await this.loadScript();

    const sid = contextProps?.sid || `session-${Date.now()}`;
    const uid = contextProps?.uid || 'anonymous';

    let did = contextProps?.did || '';
    if (!did) {
      try {
        did = await deviceService.getHashedDeviceId();
      } catch (error) {
        console.warn('Failed to fetch device ID, using fallback:', error);
      }
    }

    let channel = contextProps?.channel || '';
    if (!channel) {
      try {
        const orgResponse = await this.orgService.search({
          filters: { isTenant: true }
        });
        const org = orgResponse?.data?.result?.response?.content?.[0];
        if (org?.channel) {
          channel = org.channel;
        }
      } catch (error) {
        console.warn('Failed to fetch channel from org service:', error);
      }
    }

    const pdata = contextProps?.pdata || {
      id: 'sunbird.app',
      ver: '1.0.0',
      pid: 'sunbird-app.contentplayer',
    };

    const context = {
      mode: contextProps?.mode || 'play',
      sid,
      did,
      uid,
      channel,
      pdata,
      contextRollup: contextProps?.contextRollup || { l1: channel },
      cdata: contextProps?.cdata || [],
      timeDiff: 0,
      objectRollup: contextProps?.objectRollup || {},
      host: '',
      endpoint: '',
    };

    return { context, config: {}, metadata };
  }

  private async fetchStyles(): Promise<string> {
    if (VideoPlayerService.cachedCss !== null) {
      return VideoPlayerService.cachedCss;
    }
    if (VideoPlayerService.cssLoading) {
      return VideoPlayerService.cssLoading;
    }
    VideoPlayerService.cssLoading = fetch('/assets/video-player/styles.css')
      .then(response => {
        if (!response.ok) throw new Error(`Failed to fetch video player styles: ${response.status}`);
        return response.text();
      })
      .then(css => {
        VideoPlayerService.cachedCss = css;
        VideoPlayerService.cssLoading = undefined;
        return css;
      })
      .catch(error => {
        VideoPlayerService.cachedCss = '';
        VideoPlayerService.cssLoading = undefined;
        console.error('Failed to load video player styles:', error);
        return '';
      });
    return VideoPlayerService.cssLoading;
  }

  private rewriteCssForScope(css: string): string {
    let rewritten = css.replace(/:root/g, ':scope');
    rewritten = rewritten.replace(/(?<![a-zA-Z-])html(?=\s*[{,[:]|$)/g, ':scope');
    rewritten = rewritten.replace(/(?<![a-zA-Z-])body(?=\s*[{,[:]|$)/g, ':scope');
    return rewritten;
  }

  async createElement(config: VideoPlayerConfig): Promise<HTMLElement> {
    const cssContent = await this.fetchStyles();

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-video-player-wrapper', 'true');
    wrapper.setAttribute('data-player-id', config.metadata.identifier);
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';

    if (cssContent) {
      const scopedCss = this.rewriteCssForScope(cssContent);
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-video-player-styles', 'true');
      styleEl.textContent = `@scope ([data-video-player-wrapper]) {\n${scopedCss}\n}`;
      wrapper.appendChild(styleEl);
    }

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
