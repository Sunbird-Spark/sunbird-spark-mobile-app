import _ from 'lodash';
import { EcmlPlayerContextProps, EcmlPlayerMetadata } from './types';
import { buildEcmlPlayerContext } from '../PlayerContextService';

const PREVIEW_URL = '/content-player/preview.html?webview=true';

export class EcmlPlayerService {
  async createConfig(
    metadata: EcmlPlayerMetadata,
    contextProps?: EcmlPlayerContextProps
  ) {
    const context = await buildEcmlPlayerContext(metadata.identifier, contextProps);

    const config = {
      showEndPage: false,
      endPage: [{ template: 'assessment', contentType: ['SelfAssess'] }],
      showStartPage: true,
      host: '',
      overlay: { showUser: false },
      splash: {
        text: '',
        icon: '',
        bgImage: 'assets/icons/splacebackground_1.png',
        webLink: '',
      },
      apislug: '/action',
      repos: ['/content-plugins/renderer'],
      plugins: [
        { id: 'org.sunbird.iframeEvent', ver: 1.0, type: 'plugin' },
        { id: 'org.sunbird.player.endpage', ver: 1.1, type: 'plugin' },
      ],
      sideMenu: {
        showShare: true,
        showDownload: true,
        showExit: false,
        showPrint: true,
        showReplay: true,
      },
      enableTelemetryValidation: false,
    };

    return {
      context,
      config,
      metadata,
      data: !_.isEmpty(metadata.body) ? metadata.body : {},
    };
  }

  buildPlayerUrl(): string {
    return PREVIEW_URL;
  }
}
