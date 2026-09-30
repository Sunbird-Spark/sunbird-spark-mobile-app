import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildPlayerContext,
  buildEcmlPlayerContext,
  TELEMETRY_ENDPOINT,
} from './PlayerContextService';

// ── Module mocks ─────────────────────────────────────────────────────────────

const mockGetHashedDeviceId = vi.fn();
const mockOrgSearch = vi.fn();
const mockSettingRead = vi.fn();
const mockNativeLoad = vi.fn();
const mockGetUserId = vi.fn();
const mockUserRead = vi.fn();
const mockIsConnected = vi.fn();
const mockUserDbGetById = vi.fn();

vi.mock('uuid', () => ({ v4: () => 'fixed-session-id' }));

vi.mock('../device', () => ({
  deviceService: { getHashedDeviceId: (...args: any[]) => mockGetHashedDeviceId(...args) },
}));

vi.mock('../OrganizationService', () => ({
  OrganizationService: class {
    search(...args: any[]) {
      return mockOrgSearch(...args);
    }
  },
}));

vi.mock('../SystemSettingService', () => ({
  SystemSettingService: class {
    read(...args: any[]) {
      return mockSettingRead(...args);
    }
  },
}));

vi.mock('../NativeConfigService', () => ({
  NativeConfigServiceInstance: { load: (...args: any[]) => mockNativeLoad(...args) },
}));

vi.mock('../UserService', () => ({
  userService: {
    getUserId: (...args: any[]) => mockGetUserId(...args),
    userRead: (...args: any[]) => mockUserRead(...args),
  },
}));

vi.mock('../network/networkService', () => ({
  networkService: { isConnected: (...args: any[]) => mockIsConnected(...args) },
}));

vi.mock('../db/UserDbService', () => ({
  userDbService: { getById: (...args: any[]) => mockUserDbGetById(...args) },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const orgResponse = (
  content: any[] = [{ channel: 'ch-tenant', hashTagId: 'ht-tenant' }],
  headers: Record<string, string> = {},
) => ({ data: { response: { content } }, headers });

describe('PlayerContextService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Sensible anonymous / online defaults; individual tests override.
    mockGetUserId.mockReturnValue(null);
    mockIsConnected.mockReturnValue(true);
    mockGetHashedDeviceId.mockResolvedValue('device-hash-1');
    mockSettingRead.mockResolvedValue({ data: { response: { value: 'tenant-slug' } } });
    mockOrgSearch.mockResolvedValue(orgResponse());
    mockNativeLoad.mockResolvedValue({ producerId: 'prod.app', appVersion: '2.5.0' });
    mockUserRead.mockResolvedValue({ data: { response: {} } });
    mockUserDbGetById.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exposes the telemetry endpoint constant', () => {
    expect(TELEMETRY_ENDPOINT).toBe('/data/v1/telemetry');
  });

  // ── Anonymous happy path ───────────────────────────────────────────────────

  describe('anonymous user', () => {
    it('builds a context from the default_channel slug and tenant org', async () => {
      const context = await buildPlayerContext(undefined, { contentId: 'do_123' });

      expect(mockSettingRead).toHaveBeenCalledWith('default_channel');
      expect(mockOrgSearch).toHaveBeenCalledWith({
        request: { filters: { isTenant: true, slug: 'tenant-slug' } },
      });
      expect(context.uid).toBe('anonymous');
      expect(context.sid).toBe('fixed-session-id');
      expect(context.did).toBe('device-hash-1');
      expect(context.channel).toBe('ch-tenant');
      expect(context.contentId).toBe('do_123');
      expect(context.mode).toBe('play');
      expect(context.app).toEqual(['ch-tenant']);
      expect(context.partner).toEqual([]);
    });

    it('derives contextRollup, tags and dims from the org hashTagId', async () => {
      const context = await buildPlayerContext();

      expect(context.contextRollup).toEqual({ l1: 'ht-tenant' });
      expect(context.tags).toEqual(['ht-tenant']);
      expect(context.dims).toEqual(['ht-tenant']);
      expect(context.contentId).toBeUndefined();
    });

    it('never asks the player SDK to post telemetry itself (empty host/endpoint)', async () => {
      const context = await buildPlayerContext();

      expect(context.host).toBe('');
      expect(context.endpoint).toBe('');
    });

    it('does not fetch the user profile or the local user record', async () => {
      await buildPlayerContext();

      expect(mockUserRead).not.toHaveBeenCalled();
      expect(mockUserDbGetById).not.toHaveBeenCalled();
    });
  });

  // ── Slug resolution fallbacks ──────────────────────────────────────────────

  describe('slug resolution', () => {
    it('falls back to "sunbird" when the default_channel setting read rejects', async () => {
      mockSettingRead.mockRejectedValue(new Error('offline'));

      await buildPlayerContext();

      expect(mockOrgSearch).toHaveBeenCalledWith({
        request: { filters: { isTenant: true, slug: 'sunbird' } },
      });
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read default_channel'),
        expect.any(Error),
      );
    });

    it('falls back to "sunbird" when the setting has no value', async () => {
      mockSettingRead.mockResolvedValue({ data: { response: { value: '' } } });

      await buildPlayerContext();

      expect(mockOrgSearch).toHaveBeenCalledWith({
        request: { filters: { isTenant: true, slug: 'sunbird' } },
      });
    });
  });

  // ── Logged-in, online ──────────────────────────────────────────────────────

  describe('logged-in user (online)', () => {
    beforeEach(() => {
      mockGetUserId.mockReturnValue('user-42');
    });

    it('uses the profile name, channel-as-slug and org hashTagIds', async () => {
      mockUserRead.mockResolvedValue({
        data: {
          response: {
            firstName: 'Asha',
            lastName: 'Kumari',
            channel: 'user-channel',
            organisations: [{ hashTagId: 'h1' }, { hashTagId: undefined }, { hashTagId: 'h2' }],
          },
        },
      });

      const context = await buildPlayerContext();

      expect(mockUserRead).toHaveBeenCalledWith('user-42');
      // The user's own channel is the slug, so default_channel is never read.
      expect(mockSettingRead).not.toHaveBeenCalled();
      expect(mockOrgSearch).toHaveBeenCalledWith({
        request: { filters: { isTenant: true, slug: 'user-channel' } },
      });
      expect(context.uid).toBe('user-42');
      expect(context.userData).toEqual({ firstName: 'Asha', lastName: 'Kumari' });
      expect(context.contextRollup).toEqual({ l1: 'h1', l2: 'h2' });
      expect(context.tags).toEqual(['h1', 'h2']);
    });

    it('defaults a missing first name to "Guest" and a missing last name to ""', async () => {
      mockUserRead.mockResolvedValue({ data: { response: { channel: 'user-channel' } } });

      const context = await buildPlayerContext();

      expect(context.userData).toEqual({ firstName: 'Guest', lastName: '' });
    });

    it('falls back to the tenant hashTagId for tags when the user has no orgs', async () => {
      mockUserRead.mockResolvedValue({
        data: { response: { firstName: 'Solo', channel: 'user-channel', organisations: [] } },
      });

      const context = await buildPlayerContext();

      expect(context.tags).toEqual(['ht-tenant']);
      // contextRollup still comes from the (empty) user org list when logged in.
      expect(context.contextRollup).toEqual({});
    });

    it('warns and keeps empty user data when the profile read fails', async () => {
      mockUserRead.mockRejectedValue(new Error('401'));

      const context = await buildPlayerContext();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch user profile'),
        expect.any(Error),
      );
      expect(context.userData).toEqual({ firstName: '', lastName: '' });
      // No user slug, so it falls back to the default_channel setting.
      expect(mockSettingRead).toHaveBeenCalledWith('default_channel');
    });
  });

  // ── Logged-in, offline ─────────────────────────────────────────────────────

  describe('logged-in user (offline)', () => {
    beforeEach(() => {
      mockGetUserId.mockReturnValue('user-42');
      mockIsConnected.mockReturnValue(false);
    });

    it('reads the cached user and splits the display name', async () => {
      mockUserDbGetById.mockResolvedValue({
        details: {
          displayName: 'Ravi Kumar Singh',
          roles: [{ scope: [{ organisationId: 'org-local-1' }] }],
        },
      });

      const context = await buildPlayerContext();

      expect(mockUserDbGetById).toHaveBeenCalledWith('user-42');
      expect(mockUserRead).not.toHaveBeenCalled();
      expect(context.userData).toEqual({ firstName: 'Ravi', lastName: 'Kumar Singh' });
      expect(mockOrgSearch).toHaveBeenCalledWith({
        request: { filters: { isTenant: true, slug: 'org-local-1' } },
      });
    });

    it('uses "Guest" when the cached display name is empty and keeps the default slug', async () => {
      mockUserDbGetById.mockResolvedValue({ details: { displayName: '', roles: [] } });

      const context = await buildPlayerContext();

      expect(context.userData).toEqual({ firstName: 'Guest', lastName: '' });
      expect(mockSettingRead).toHaveBeenCalledWith('default_channel');
    });

    it('keeps empty user data when there is no cached user', async () => {
      mockUserDbGetById.mockResolvedValue(null);

      const context = await buildPlayerContext();

      expect(context.userData).toEqual({ firstName: '', lastName: '' });
    });

    it('warns when the local user read throws', async () => {
      mockUserDbGetById.mockRejectedValue(new Error('db closed'));

      const context = await buildPlayerContext();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read local user data'),
        expect.any(Error),
      );
      expect(context.userData).toEqual({ firstName: '', lastName: '' });
    });
  });

  // ── Failure paths of the remaining dependencies ────────────────────────────

  describe('dependency failures', () => {
    it('leaves did empty and warns when the device id lookup rejects', async () => {
      mockGetHashedDeviceId.mockRejectedValue(new Error('no device'));

      const context = await buildPlayerContext();

      expect(context.did).toBe('');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch device ID'),
        expect.any(Error),
      );
    });

    it('produces empty channel/tags/app when the org search rejects', async () => {
      mockOrgSearch.mockRejectedValue(new Error('org down'));

      const context = await buildPlayerContext();

      expect(context.channel).toBe('');
      expect(context.tags).toEqual([]);
      expect(context.dims).toEqual([]);
      expect(context.app).toEqual([]);
      expect(context.contextRollup).toEqual({});
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch organization data'),
        expect.any(Error),
      );
    });

    it('tolerates an org search that returns no content', async () => {
      mockOrgSearch.mockResolvedValue(orgResponse([]));

      const context = await buildPlayerContext();

      expect(context.channel).toBe('');
      expect(context.tags).toEqual([]);
    });

    it('falls back to the default pdata when the native config read rejects', async () => {
      mockNativeLoad.mockRejectedValue(new Error('no native bridge'));

      const context = await buildPlayerContext();

      expect(context.pdata).toEqual({
        id: 'sunbird.app',
        ver: '1.0.0',
        pid: 'sunbird-app.contentplayer',
      });
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch native config'),
        expect.any(Error),
      );
    });

    it('falls back to the default pdata when the native config values are blank', async () => {
      mockNativeLoad.mockResolvedValue({ producerId: '', appVersion: '' });

      const context = await buildPlayerContext();

      expect(context.pdata.id).toBe('sunbird.app');
      expect(context.pdata.ver).toBe('1.0.0');
    });

    it('uses the native config values when present', async () => {
      const context = await buildPlayerContext();

      expect(context.pdata).toEqual({
        id: 'prod.app',
        ver: '2.5.0',
        pid: 'sunbird-app.contentplayer',
      });
    });
  });

  // ── Clock skew ─────────────────────────────────────────────────────────────

  describe('timeDiff (clock skew)', () => {
    it('computes seconds of skew from the org response Date header', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      mockOrgSearch.mockResolvedValue(
        orgResponse(undefined, { date: 'Thu, 01 Jan 2026 00:00:30 GMT' }),
      );

      const context = await buildPlayerContext();

      expect(context.timeDiff).toBe(30);
    });

    it('leaves timeDiff at 0 when the response has no Date header', async () => {
      const context = await buildPlayerContext();

      expect(context.timeDiff).toBe(0);
    });
  });

  // ── Overrides ──────────────────────────────────────────────────────────────

  describe('overrides', () => {
    it('honours mode, contextRollup and objectRollup overrides', async () => {
      const context = await buildPlayerContext({
        mode: 'preview',
        contextRollup: { l1: 'override-rollup' },
        objectRollup: { l1: 'course-1', l2: 'unit-1' },
      });

      expect(context.mode).toBe('preview');
      expect(context.contextRollup).toEqual({ l1: 'override-rollup' });
      expect(context.objectRollup).toEqual({ l1: 'course-1', l2: 'unit-1' });
    });

    it('appends the course and batch ids from cdata to dims', async () => {
      const cdata = [
        { type: 'course', id: 'do_course_1' },
        { type: 'batch', id: 'batch_1' },
        { type: 'other', id: 'ignored' },
      ];

      const context = await buildPlayerContext({ cdata });

      expect(context.cdata).toBe(cdata);
      expect(context.dims).toEqual(['ht-tenant', 'do_course_1', 'batch_1']);
    });

    it('omits course/batch dims when the cdata entries carry no id', async () => {
      const context = await buildPlayerContext({
        cdata: [{ type: 'course' }, { type: 'batch' }],
      });

      expect(context.dims).toEqual(['ht-tenant']);
    });

    it('defaults cdata and objectRollup to empty when no overrides are given', async () => {
      const context = await buildPlayerContext();

      expect(context.cdata).toEqual([]);
      expect(context.objectRollup).toEqual({});
    });
  });

  // ── Deprecated ECML wrapper ────────────────────────────────────────────────

  describe('buildEcmlPlayerContext', () => {
    it('delegates to buildPlayerContext with the contentId as an option', async () => {
      const context = await buildEcmlPlayerContext('do_ecml_9', { mode: 'edit' });

      expect(context.contentId).toBe('do_ecml_9');
      expect(context.mode).toBe('edit');
    });
  });
});
