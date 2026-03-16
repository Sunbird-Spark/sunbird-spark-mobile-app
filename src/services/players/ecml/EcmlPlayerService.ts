import { EcmlPlayerContextProps, EcmlPlayerMetadata } from './types';
import { deviceService } from '../../device';
import { OrganizationService } from '../../OrganizationService';

const PREVIEW_URL = '/content/preview/preview.html?webview=true';

export class EcmlPlayerService {
  private orgService = new OrganizationService();

  async createConfig(
    metadata: EcmlPlayerMetadata,
    contextProps?: EcmlPlayerContextProps
  ) {
    const sid = `session-${Date.now()}`;
    const uid = 'anonymous';

    let did = '';
    try {
      did = await deviceService.getHashedDeviceId();
    } catch (error) {
      console.warn('Failed to fetch device ID, using fallback:', error);
    }

    let channel = '';
    let hashTagId = '';
    try {
      const orgResponse = await this.orgService.search({
        filters: { isTenant: true },
      });
      const org = orgResponse?.data?.result?.response?.content?.[0];
      if (org?.channel) {
        channel = org.channel;
      }
      if (org?.hashTagId) {
        hashTagId = org.hashTagId;
      }
    } catch (error) {
      console.warn('Failed to fetch channel from org service:', error);
    }

    const tags = hashTagId ? [hashTagId] : channel ? [channel] : [];

    const pdata = {
      id: 'sunbird.app',
      ver: '1.0.0',
      pid: 'sunbird-app.contentplayer',
    };

    const context = {
      mode: contextProps?.mode || 'play',
      partner: [],
      sid,
      did,
      uid,
      channel,
      pdata,
      contentId: metadata.identifier,
      contextRollup: contextProps?.contextRollup || { l1: channel },
      tags,
      cdata: contextProps?.cdata || [],
      timeDiff: 0,
      objectRollup: contextProps?.objectRollup || {},
      host: '',
      endpoint: '/portal/data/v1/telemetry',
      dims: tags,
      app: [channel],
      userData: { firstName: '', lastName: '' },
    };

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
      data: metadata.body || {},
    };
  }

  buildPlayerUrl(): string {
    return PREVIEW_URL;
  }
}
