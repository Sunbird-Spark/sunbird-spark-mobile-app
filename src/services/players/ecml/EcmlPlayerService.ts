import _ from 'lodash';
import { EcmlPlayerConfig, EcmlPlayerContextProps, EcmlPlayerMetadata } from './types';
import { buildEcmlPlayerContext } from '../PlayerContextService';

// webview=true: renderer enters preview mode (needed for postMessage config delivery)
// isMobile=true: enables mobile-specific dispatchers and events in the renderer.
const PREVIEW_URL = '/content-player/preview.html?webview=true&isMobile=true';

export class EcmlPlayerService {
  async createConfig(
    metadata: EcmlPlayerMetadata,
    contextProps?: EcmlPlayerContextProps
  ) {
    const context = await buildEcmlPlayerContext(metadata.identifier, contextProps);

    const isLocal = !!metadata.isAvailableLocally && !!metadata.basePath;
    const rawBasePath = isLocal ? metadata.basePath || '' : '';
    const basePath = rawBasePath ? (rawBasePath.endsWith('/') ? rawBasePath : `${rawBasePath}/`) : '';

    // Standard core plugins directory relative to the app origin.
    const repos: string[] = ['/content-player/coreplugins/'];

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
      plugins: [{ id: 'org.sunbird.player.endpage', ver: 1.1, type: 'plugin' }],
      sideMenu: {
        showShare: true,
        showDownload: true,
        showExit: false,
        showPrint: true,
        showReplay: true,
      },
      enableTelemetryValidation: false
    };

    if (isLocal && basePath) {
      // --- LOCAL (OFFLINE) CONFIGURATION ---
      // Standardized Root Structure: ImportService now moves all widgets/content-plugins to the root.
      // This allows a single, clean baseURL for both plugins and archive artifacts.
      const cleanBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

      config.host = cleanBasePath;
      config.baseURL = cleanBasePath;

      // Use asset-path to keep standard stage assets pointing to the root assets folder
      config['asset-path'] = `${cleanBasePath}/assets/`;
      // Suppress cache-buster query parameters (?BUILD_NUMBER) causing 404s on local file paths
      config.build_number = '';
      config.version = '';

      // With the flat structure, plugins are found at the content root
      const localPluginsPath = `${cleanBasePath}/content-plugins/`;
      config.devicePluginspath = localPluginsPath;
      config.previewPluginspath = localPluginsPath;

      // Ensure plugin discovery repos use absolute URLs
      repos.unshift(localPluginsPath);
    } else {
      // --- ONLINE (STREAMING) CONFIGURATION ---
      config.host = '';
      config.baseURL = '';
      // Let the renderer use its default plugin paths and cache behavior for remote content
    }

    config.repos = repos;

    // Flatten metadata at the root level for the renderer's GlobalContext
    const wrappedMetadata: Record<string, unknown> = {
      ...metadata,
      contentData: {
        ...metadata,
        build_number: '',
        version: '',
      },
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
      data: !_.isEmpty(metadata.body) ? metadata.body : {},
    };
  }

  buildPlayerUrl(): string {
    return PREVIEW_URL;
  }
}
