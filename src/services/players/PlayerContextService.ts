import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { deviceService } from '../device';
import { OrganizationService } from '../OrganizationService';
import { SystemSettingService } from '../SystemSettingService';
import { NativeConfigServiceInstance } from '../NativeConfigService';
import { userService } from '../UserService';

/**
 * Telemetry path for player web components.
 * The web component's internal telemetry SDK calls: host + endpoint.
 * For web components running inside the app (not in iframes), this is the
 * full path the SDK will POST to.
 */
export const TELEMETRY_ENDPOINT = '/data/v1/telemetry';

export interface PlayerContext {
  mode: string;
  sid: string;
  did: string;
  uid: string;
  channel: string;
  pdata: { id: string; ver: string; pid: string };
  contextRollup: Record<string, string>;
  tags: string[];
  cdata: any[];
  timeDiff: number;
  objectRollup: Record<string, any>;
  host: string;
  endpoint: string;
  dims: string[];
  app: string[];
  partner: any[];
  userData: { firstName: string; lastName: string };
  contentId?: string;
}

export interface PlayerContextOverrides {
  mode?: string;
  cdata?: any[];
  contextRollup?: Record<string, string>;
  objectRollup?: Record<string, any>;
}

const orgService = new OrganizationService();
const systemSettingService = new SystemSettingService();

/**
 * Build a complete telemetry context for all player web components.
 * Mirrors the portal's buildTelemetryContext() so the internal telemetry SDK
 * in sunbird-video-player / sunbird-pdf-player / sunbird-epub-player
 * receives all required fields and can sync events without errors.
 */
export async function buildPlayerContext(
  overrides?: PlayerContextOverrides,
  options?: { contentId?: string },
): Promise<PlayerContext> {
  const sid = uuidv4();

  // Identity — use real userId when logged in
  const loggedInUserId = userService.getUserId();
  const uid = loggedInUserId || 'anonymous';
  const isLoggedIn = uid !== 'anonymous';

  // Device
  let did = '';
  try {
    did = await deviceService.getHashedDeviceId();
  } catch (error) {
    console.warn('PlayerContextService: Failed to fetch device ID:', error);
  }

  // User data (for logged-in users — fetch profile for name, channel slug, org hashTagIds)
  let userData = { firstName: '', lastName: '' };
  let userOrgHashTagIds: string[] = [];
  let userSlug = '';
  if (isLoggedIn) {
    try {
      const profileResponse = await userService.userRead(uid);
      const profile = profileResponse?.data?.response;
      if (profile) {
        userData = {
          firstName: profile.firstName || 'Guest',
          lastName: profile.lastName || '',
        };
        // User's channel acts as slug for org search
        if (profile.channel) {
          userSlug = profile.channel;
        }
        // Extract organisation hashTagIds for tags/dims
        const orgs = profile.organisations as Array<{ hashTagId?: string }> | undefined;
        if (orgs) {
          userOrgHashTagIds = _.compact(orgs.map((o) => o.hashTagId));
        }
      }
    } catch (error) {
      console.warn('PlayerContextService: Failed to fetch user profile:', error);
    }
  }

  // Determine slug: logged-in → user's channel, anonymous → system setting default_channel
  let slug = userSlug;
  if (!slug) {
    try {
      const setting = await systemSettingService.read<{ response: { value: string } }>('default_channel');
      slug = setting?.data?.response?.value || 'sunbird';
    } catch (error) {
      slug = 'sunbird';
      console.warn('PlayerContextService: Failed to read default_channel, using fallback:', error);
    }
  }

  // Organization / channel — use slug in filters to get the correct tenant org
  let channel = '';
  let hashTagId = '';
  let timeDiff = 0;
  try {
    const orgResponse = await orgService.search({
      request: {
        filters: { isTenant: true, slug },
      }
    });
    const org = orgResponse?.data?.response?.content?.[0];
    if (org?.channel) channel = org.channel;
    if (org?.hashTagId) hashTagId = org.hashTagId;
    // Compute clock skew from response Date header
    const serverDate = orgResponse?.headers?.['date'] as string | undefined;
    if (serverDate) {
      const serverTime = new Date(serverDate).getTime();
      const clientTime = new Date().getTime();
      timeDiff = (serverTime - clientTime) / 1000;
    }
  } catch (error) {
    console.warn('PlayerContextService: Failed to fetch organization data:', error);
  }

  // Producer data
  let producerId = 'sunbird.app';
  let appVersion = '1.0.0';
  try {
    const config = await NativeConfigServiceInstance.load();
    producerId = config.producerId || producerId;
    appVersion = config.appVersion || appVersion;
  } catch (error) {
    console.warn('PlayerContextService: Failed to fetch native config:', error);
  }

  // contextRollup: logged-in → from user org hashTagIds, anonymous → from org hashTagId
  const rollupSource = isLoggedIn ? userOrgHashTagIds : _.compact([hashTagId]);
  const contextRollup: Record<string, string> = {};
  rollupSource.forEach((id, index) => {
    contextRollup[`l${index + 1}`] = id;
  });

  // tags: logged-in → from user profile org hashTagIds, anonymous → from org hashTagId/channel
  const tags = _.compact(
    isLoggedIn && !_.isEmpty(userOrgHashTagIds)
      ? userOrgHashTagIds
      : [hashTagId || channel],
  );

  // Use caller-provided cdata
  const cdata = overrides?.cdata || [];

  // dims = tags + courseId + batchId (when content is played inside a course)
  const courseEntry = _.find(cdata, { type: 'course' });
  const batchEntry = _.find(cdata, { type: 'batch' });
  const dims = [...tags];
  if (courseEntry?.id) dims.push(courseEntry.id);
  if (batchEntry?.id) dims.push(batchEntry.id);

  const context: PlayerContext = {
    mode: overrides?.mode || 'play',
    sid,
    did,
    uid,
    channel,
    pdata: { id: producerId, ver: appVersion, pid: 'sunbird-app.contentplayer' },
    contextRollup: overrides?.contextRollup || contextRollup,
    tags,
    cdata,
    timeDiff,
    objectRollup: overrides?.objectRollup || {},
    // Both host and endpoint are intentionally empty to prevent the player
    // SDK from making its own direct telemetry HTTP calls. Telemetry events
    // are captured via telemetryEvent DOM events and routed through
    // TelemetryService → SyncScheduler instead.
    host: '',
    endpoint: '',
    dims,
    app: channel ? [channel] : [],
    partner: [],
    userData,
  };

  if (options?.contentId) {
    context.contentId = options.contentId;
  }

  return context;
}

/**
 * @deprecated Use buildPlayerContext() with options.contentId instead.
 * Kept for backward compatibility with EcmlPlayerService.
 */
export type EcmlExtendedContext = PlayerContext;

export async function buildEcmlPlayerContext(
  contentId: string,
  overrides?: PlayerContextOverrides,
): Promise<PlayerContext> {
  return buildPlayerContext(overrides, { contentId });
}
