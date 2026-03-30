import _ from 'lodash';
import { EcmlPlayerConfig, EcmlPlayerContextProps, EcmlPlayerMetadata } from './types';
import { buildEcmlPlayerContext } from '../PlayerContextService';

// webview=true: renderer enters preview mode (needed for postMessage config delivery)
const PREVIEW_URL = '/content-player/preview.html?webview=true';

export class EcmlPlayerService {
  async createConfig(
    metadata: EcmlPlayerMetadata,
    contextProps?: EcmlPlayerContextProps
  ) {
    const context = await buildEcmlPlayerContext(metadata.identifier, contextProps);

    const isLocal = !!metadata.isAvailableLocally && !!metadata.basePath;
    const rawBasePath = (isLocal ? metadata.basePath || '' : '').trim();

    // Extreme sanitation: ensure exactly one trailing slash and no surrounding whitespace
    const safeBaseDir = rawBasePath ? (rawBasePath.replace(/\/+$/, '') + '/') : '';
    const basePath = safeBaseDir;

    // Standard core plugins directory relative to the app origin.
    const corePluginsRepo = '/content-player/coreplugins';
    const repos: string[] = [corePluginsRepo];

    const config: EcmlPlayerConfig["config"] = {
      showEndPage: false,
      endPage: [{ template: 'assessment', contentType: ['SelfAssess'] }],
      showStartPage: true,
      apislug: '/action',
      overlay: { showUser: false },
      splash: {
        text: '',
        icon: '',
        bgImage: 'assets/icons/splacebackground_1.png',
        webLink: '',
      },
      plugins: [
        { id: 'org.sunbird.iframeEvent', ver: 1.0, type: 'plugin' },
        { id: 'org.sunbird.player.endpage', ver: 1.1, type: 'plugin' }
      ],
      sideMenu: {
        showShare: false,
        showDownload: false,
        showExit: true,
        showPrint: false,
        showReplay: true,
      },
      enableTelemetryValidation: false,
      telemetryConfig: {
        origin: 'sunbird-portal',
        pdata: context.pdata,
        env: 'contentplayer',
        channel: context.channel,
        did: context.did,
        sid: context.sid,
        uid: context.uid,
        endpoint: '',
        host: '',
        authtoken: '',
        dispatcher: 'postMessage'
      }
    };

    if (isLocal && basePath) {
      // --- LOCAL (OFFLINE) CONFIGURATION ---
      config.host = basePath;
      config.baseURL = basePath;

      // Use asset-path to keep standard stage assets pointing to the root assets folder
      config['asset-path'] = `${basePath}assets/`;

      // Use numeric dummy values to prevent 'BUILD_NUMBER' fallback string in query params
      config.build_number = '1.0';
      config.version = '1.0';

      // Use '/widgets/content-plugins' for device plugins to match the legacy mobile ECAR structure
      config.devicePluginspath = '/widgets/content-plugins';
      config.previewPluginspath = '/content-plugins';

      // Ensure plugin discovery repos use absolute URLs.
      // Order: 1. Content-specific plugins, 2. Content Root, 3. Global content storage (shared), 4. App Core Plugins
      repos.unshift(`${basePath}content-plugins`);
      repos.unshift(`${basePath}widgets/content-plugins`);
      repos.push(basePath);

      try {
        const parts = basePath.trim().replace(/\/+$/, '').split('/');
        if (parts.length > 2) {
          const sharedRepo = parts.slice(0, -1).join('/') + '/';
          repos.push(sharedRepo);
        }
      } catch (e) {
        console.warn('[EcmlPlayerService] Could not resolve shared content repo:', e);
      }
    } else {
      // --- ONLINE (STREAMING) CONFIGURATION ---
      config.host = '';
      config.baseURL = '';
    }

    config.repos = _.uniq(repos);

    // Flatten metadata at the root level for the renderer's GlobalContext
    const wrappedMetadata: Record<string, unknown> = {
      ...metadata,
      contentData: {
        ...metadata,
        build_number: '',
        version: '',
      },
      path: basePath, // <--- CRITICAL: Overwrite path as renderer uses t.path for e.path local resolution
      basePath: basePath,
      baseDir: basePath,
      isAvailableLocally: isLocal,
      build_number: '',
      version: '',
    };

    // Ensure the legacy renderer's GlobalContext.user is populated for plugin compatibility (like Endpage)
    if (context && !context['user']) {
      context['user'] = {
        name: context.userData?.firstName || 'Guest',
        handle: context.userData?.firstName || 'Guest',
      };
    }

    return {
      context,
      config,
      metadata: wrappedMetadata,
      // Pass null (not {}) when body is absent so the renderer falls back to
      // fetching index.json/index.ecml from globalConfig.basepath (streamingUrl).
      // An empty object {} is truthy and causes the renderer to render blank content
      // instead of triggering the initByJSON fallback.
      data: !_.isEmpty(metadata.body) ? metadata.body : null,
    };
  }

  buildPlayerUrl(): string {
    return PREVIEW_URL;
  }
}