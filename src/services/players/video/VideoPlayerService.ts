import { VideoPlayerConfig, VideoPlayerEvent, VideoPlayerContextProps, VideoPlayerMetadata } from './types';
import { buildPlayerContext } from '../PlayerContextService';

export class VideoPlayerService {
  private eventHandlers = new WeakMap<HTMLElement, { player: (event: Event) => void; telemetry: (event: Event) => void }>();
  private static scriptLoaded = false;
  private static scriptLoading?: Promise<void>;
  private static stylesLoaded = false;

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
          showExit: false,
          showPrint: false,
          showReplay: true,
        },
      },
      metadata,
    };
  }

  async createElement(config: VideoPlayerConfig): Promise<HTMLElement> {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-video-player-wrapper', 'true');
    wrapper.setAttribute('data-player-id', config.metadata.identifier);
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.position = 'relative';
    wrapper.style.overflow = 'hidden';

    // Load video player styles globally (once) so video.js renders correctly
    if (!VideoPlayerService.stylesLoaded) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/assets/video-player/styles.css';
      link.setAttribute('data-video-player-styles', 'true');
      document.head.appendChild(link);
      VideoPlayerService.stylesLoaded = true;
    }

    // Containment styles: the custom element defaults to display:inline and
    // .video-js has no explicit height, so the player overflows its container
    // and the absolutely-positioned .vjs-control-bar ends up off-screen.
    // Containment overrides:
    // - sunbird-video-player is a custom element (defaults to display:inline)
    // - .video-js.vjs-fluid sets height:0 + padding-top for aspect ratio,
    //   which pushes .vjs-control-bar (position:absolute;bottom:0) off-screen.
    //   Override to fill the wrapper height instead.
    const styleEl = document.createElement('style');
    styleEl.textContent = [
      '[data-video-player-wrapper] sunbird-video-player { display:block; width:100%; height:100%; }',
      '[data-video-player-wrapper] .video-js { width:100% !important; height:100% !important; }',
      '[data-video-player-wrapper] .video-js.vjs-fluid { padding-top:0 !important; }',
    ].join('\n');
    wrapper.appendChild(styleEl);

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
