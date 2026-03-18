import { v4 as uuidv4 } from 'uuid';
import { deviceService } from '../device';
import { OrganizationService } from '../OrganizationService';
import { NativeConfigServiceInstance } from '../NativeConfigService';

export interface PlayerContext {
  mode: string;
  sid: string;
  did: string;
  uid: string;
  channel: string;
  pdata: {
    id: string;
    ver: string;
    pid: string;
  };
  contextRollup: { l1: string };
  cdata: any[];
  timeDiff: number;
  objectRollup: Record<string, any>;
  host: string;
  endpoint: string;
}

export interface PlayerContextOverrides {
  mode?: string;
  cdata?: any[];
  contextRollup?: { l1: string };
  objectRollup?: Record<string, any>;
}

const orgService = new OrganizationService();

export async function buildPlayerContext(
  overrides?: PlayerContextOverrides
): Promise<PlayerContext> {
  const sid = uuidv4();
  const uid = 'anonymous';

  let did = '';
  try {
    did = await deviceService.getHashedDeviceId();
  } catch (error) {
    console.warn('Failed to fetch device ID, using fallback:', error);
  }

  let channel = '';
  try {
    const orgResponse = await orgService.search({
      filters: { isTenant: true },
    });
    const org = orgResponse?.data?.result?.response?.content?.[0];
    if (org?.channel) {
      channel = org.channel;
    }
  } catch (error) {
    console.warn('Failed to fetch channel from org service:', error);
  }

  let producerId = 'sunbird.app';
  let appVersion = '1.0.0';
  try {
    const config = await NativeConfigServiceInstance.load();
    producerId = config.producerId || producerId;
    appVersion = config.appVersion || appVersion;
  } catch (error) {
    console.warn('Failed to fetch native config, using fallback:', error);
  }

  return {
    mode: overrides?.mode || 'play',
    sid,
    did,
    uid,
    channel,
    pdata: { id: producerId, ver: appVersion, pid: 'sunbird-app.contentplayer' },
    contextRollup: overrides?.contextRollup || { l1: channel },
    cdata: overrides?.cdata || [],
    timeDiff: 0,
    objectRollup: overrides?.objectRollup || {},
    host: '',
    endpoint: '',
  };
}

/**
 * Extended context with ECML-specific fields (tags, dims, partner, etc.)
 */
export interface EcmlExtendedContext extends PlayerContext {
  partner: any[];
  contentId: string;
  tags: string[];
  dims: string[];
  app: string[];
  userData: { firstName: string; lastName: string };
}

export async function buildEcmlPlayerContext(
  contentId: string,
  overrides?: PlayerContextOverrides
): Promise<EcmlExtendedContext> {
  const sid = uuidv4();
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
    const orgResponse = await orgService.search({
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

  let producerId = 'sunbird.app';
  let appVersion = '1.0.0';
  try {
    const config = await NativeConfigServiceInstance.load();
    producerId = config.producerId || producerId;
    appVersion = config.appVersion || appVersion;
  } catch (error) {
    console.warn('Failed to fetch native config, using fallback:', error);
  }

  return {
    mode: overrides?.mode || 'play',
    partner: [],
    sid,
    did,
    uid,
    channel,
    pdata: { id: producerId, ver: appVersion, pid: 'sunbird-app.contentplayer' },
    contentId,
    contextRollup: overrides?.contextRollup || { l1: channel },
    tags,
    cdata: overrides?.cdata || [],
    timeDiff: 0,
    objectRollup: overrides?.objectRollup || {},
    host: '',
    endpoint: '/portal/data/v1/telemetry',
    dims: tags,
    app: [channel],
    userData: { firstName: '', lastName: '' },
  };
}
