import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// ── Mock Capacitor ─────────────────────────────────────────────────────────
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'web' },
}));

const mockAppAddListener = vi.fn().mockResolvedValue({ remove: vi.fn() });
const mockGetLaunchUrl = vi.fn().mockResolvedValue({ url: '' });

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (...args: any[]) => mockAppAddListener(...args),
    getLaunchUrl: () => mockGetLaunchUrl(),
  },
}));

// ── Mock TelemetryService ──────────────────────────────────────────────────
const mockInitialize = vi.fn();
const mockStart = vi.fn().mockResolvedValue(undefined);
const mockInteract = vi.fn().mockResolvedValue(undefined);
const mockInterrupt = vi.fn().mockResolvedValue(undefined);
const mockUpdateCampaignParameters = vi.fn();

vi.mock('../services/TelemetryService', () => ({
  telemetryService: {
    initialize: (...args: any[]) => mockInitialize(...args),
    start: (...args: any[]) => mockStart(...args),
    interact: (...args: any[]) => mockInteract(...args),
    interrupt: (...args: any[]) => mockInterrupt(...args),
    updateContext: vi.fn(),
    updateCampaignParameters: (...args: any[]) => mockUpdateCampaignParameters(...args),
    populateGlobalCorRelationData: vi.fn(),
    get isInitialized() { return false; },
  },
}));

// ── Mock external services ─────────────────────────────────────────────────
vi.mock('../services/device/deviceService', () => ({
  deviceService: {
    getHashedDeviceId: vi.fn().mockResolvedValue('did123'),
    getSpec: vi.fn().mockReturnValue({}),
  },
}));

vi.mock('../services/NativeConfigService', () => ({
  NativeConfigServiceInstance: {
    load: vi.fn().mockResolvedValue({
      producerId: 'sunbird.app',
      appVersion: '1.0.0',
      baseUrl: '',
      mobileAppConsumer: '',
      mobileAppKey: '',
      mobileAppSecret: '',
    }),
  },
}));

vi.mock('../services/OrganizationService', () => {
  function OrganizationService() {}
  OrganizationService.prototype.search = vi.fn().mockResolvedValue({
    data: { response: { content: [] } },
    headers: {},
  });
  return { OrganizationService };
});

vi.mock('../services/SystemSettingService', () => {
  function SystemSettingService() {}
  SystemSettingService.prototype.read = vi.fn().mockRejectedValue(new Error('not found'));
  return { SystemSettingService };
});

vi.mock('../services/UserService', () => ({
  userService: {
    getUserId: vi.fn().mockReturnValue(null),
    userRead: vi.fn().mockRejectedValue(new Error('not logged in')),
  },
}));

vi.mock('../services/db/DatabaseService', () => ({
  databaseService: {
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/db/KeyValueDbService', () => ({
  keyValueDbService: {
    get: vi.fn().mockRejectedValue(new Error('no key')),
    set: vi.fn().mockResolvedValue(undefined),
  },
  KVKey: { TELEMETRY_CLOCK_OFFSET: 'telemetry_clock_offset' },
}));

import { TelemetryProvider } from './TelemetryProvider';
import { userService } from '../services/UserService';
import { keyValueDbService } from '../services/db/KeyValueDbService';
import { OrganizationService } from '../services/OrganizationService';
import { SystemSettingService } from '../services/SystemSettingService';

describe('TelemetryProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppAddListener.mockResolvedValue({ remove: vi.fn() });
    mockGetLaunchUrl.mockResolvedValue({ url: '' });
    // Re-establish userService defaults
    vi.mocked(userService.getUserId).mockReturnValue(null);
    vi.mocked(userService.userRead).mockRejectedValue(new Error('not logged in'));
    // Re-establish keyValueDbService defaults
    vi.mocked(keyValueDbService.get).mockRejectedValue(new Error('no key'));
    vi.mocked(keyValueDbService.set).mockResolvedValue(undefined);
    // Re-establish OrganizationService search default
    (OrganizationService.prototype as any).search = vi.fn().mockResolvedValue({
      data: { response: { content: [] } },
      headers: {},
    });
    // Re-establish SystemSettingService read default
    (SystemSettingService.prototype as any).read = vi.fn().mockRejectedValue(new Error('not found'));
  });

  afterEach(() => {
    // Clean any stray DOM elements appended during tests
    document.body.innerHTML = '';
  });

  it('renders children', () => {
    const { getByText } = render(
      <TelemetryProvider>
        <div>hello</div>
      </TelemetryProvider>,
    );
    expect(getByText('hello')).toBeDefined();
  });

  // ── Global declarative INTERACT listener ──────────────────────────────────

  describe('global click handler', () => {
    it('fires INTERACT when clicking an element with data-edataid', async () => {
      render(<TelemetryProvider><div /></TelemetryProvider>);

      const button = document.createElement('button');
      button.setAttribute('data-edataid', 'test-action');
      document.body.appendChild(button);

      act(() => { fireEvent.click(button); });

      expect(mockInteract).toHaveBeenCalledWith(
        expect.objectContaining({
          edata: expect.objectContaining({ id: 'test-action', type: 'CLICK' }),
        }),
      );
    });

    it('does not fire INTERACT when clicking an element without data-edataid', () => {
      render(<TelemetryProvider><div /></TelemetryProvider>);

      const div = document.createElement('div');
      document.body.appendChild(div);

      act(() => { fireEvent.click(div); });

      expect(mockInteract).not.toHaveBeenCalled();
    });

    it('includes pageid in edata when data-pageid is set', () => {
      render(<TelemetryProvider><div /></TelemetryProvider>);

      const button = document.createElement('button');
      button.setAttribute('data-edataid', 'nav-home');
      button.setAttribute('data-pageid', 'HomePage');
      document.body.appendChild(button);

      act(() => { fireEvent.click(button); });

      expect(mockInteract).toHaveBeenCalledWith(
        expect.objectContaining({
          edata: expect.objectContaining({ pageid: 'HomePage' }),
        }),
      );
    });

    it('includes cdata when data-objectid and data-objecttype are set', () => {
      render(<TelemetryProvider><div /></TelemetryProvider>);

      const button = document.createElement('button');
      button.setAttribute('data-edataid', 'play-content');
      button.setAttribute('data-objectid', 'do_123');
      button.setAttribute('data-objecttype', 'Content');
      document.body.appendChild(button);

      act(() => { fireEvent.click(button); });

      expect(mockInteract).toHaveBeenCalledWith(
        expect.objectContaining({
          context: { cdata: [{ id: 'do_123', type: 'Content' }] },
        }),
      );
    });

    it('does not add cdata when only data-objectid is set (missing objecttype)', () => {
      render(<TelemetryProvider><div /></TelemetryProvider>);

      const button = document.createElement('button');
      button.setAttribute('data-edataid', 'play-content');
      button.setAttribute('data-objectid', 'do_123');
      document.body.appendChild(button);

      act(() => { fireEvent.click(button); });

      const call = mockInteract.mock.calls[0][0];
      expect(call).not.toHaveProperty('context');
    });

    it('uses data-edatatype as event type when provided', () => {
      render(<TelemetryProvider><div /></TelemetryProvider>);

      const button = document.createElement('button');
      button.setAttribute('data-edataid', 'search-submit');
      button.setAttribute('data-edatatype', 'SEARCH');
      document.body.appendChild(button);

      act(() => { fireEvent.click(button); });

      expect(mockInteract).toHaveBeenCalledWith(
        expect.objectContaining({
          edata: expect.objectContaining({ type: 'SEARCH' }),
        }),
      );
    });

    it('fires INTERACT when clicking a child of an element with data-edataid', () => {
      render(<TelemetryProvider><div /></TelemetryProvider>);

      const parent = document.createElement('div');
      parent.setAttribute('data-edataid', 'card-click');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      act(() => { fireEvent.click(child); });

      expect(mockInteract).toHaveBeenCalledWith(
        expect.objectContaining({
          edata: expect.objectContaining({ id: 'card-click' }),
        }),
      );
    });
  });

  // ── Init function ─────────────────────────────────────────────────────────

  describe('init function', () => {
    it('calls initialize and fires app START on mount', async () => {
      const { getByText } = render(
        <TelemetryProvider><div>child</div></TelemetryProvider>,
      );
      expect(getByText('child')).toBeDefined();

      await act(async () => {}); // flush microtasks

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
        expect(mockStart).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'app' }),
          '', '', {},
        );
      });
    });

    it('seeds timeDiff from persisted storedOffset', async () => {
      vi.mocked(keyValueDbService.get).mockResolvedValue('3000');

      render(<TelemetryProvider><div /></TelemetryProvider>);

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalledWith(
          expect.objectContaining({ timeDiff: 3000 }),
        );
      });
    });

    it('persists timeDiff when it is non-zero (org serverDate path)', async () => {
      (OrganizationService.prototype as any).search = vi.fn().mockResolvedValue({
        data: { response: { content: [{ hashTagId: 'org-channel' }] } },
        headers: { date: new Date(Date.now() + 5000).toUTCString() },
      });

      render(<TelemetryProvider><div /></TelemetryProvider>);

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
        expect(vi.mocked(keyValueDbService.set)).toHaveBeenCalled();
      });
    });

    it('resolves channel from anonymous org search (default_channel path)', async () => {
      (SystemSettingService.prototype as any).read = vi.fn().mockResolvedValue({
        data: { response: { value: 'test-slug' } },
      });
      (OrganizationService.prototype as any).search = vi.fn().mockResolvedValue({
        data: { response: { content: [{ hashTagId: 'anon-channel' }] } },
        headers: {},
      });

      render(<TelemetryProvider><div /></TelemetryProvider>);

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalledWith(
          expect.objectContaining({ channel: 'anon-channel' }),
        );
      });
    });

    it('resolves channel from rootOrg.hashTagId (not slug) for a logged-in user', async () => {
      vi.mocked(userService.getUserId).mockReturnValue('logged-user');
      // rootOrg.hashTagId is the correct channel ID; channel field is the human-readable slug
      vi.mocked(userService.userRead).mockResolvedValue({
        data: { response: { channel: 'sunbirdco', rootOrg: { hashTagId: '0128abc123' } } },
      } as any);

      render(<TelemetryProvider><div /></TelemetryProvider>);

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalledWith(
          expect.objectContaining({ uid: 'logged-user', channel: '0128abc123' }),
        );
      });
      // sid must be a UUID (not '1') for logged-in users
      const call = mockInitialize.mock.calls[0][0];
      expect(call.sid).not.toBe('1');
    });

    it('resolves channel from rootOrg.hashTagId for logged-in user', async () => {
      vi.mocked(userService.getUserId).mockReturnValue('logged-user');
      vi.mocked(userService.userRead).mockResolvedValue({
        data: { response: { rootOrg: { hashTagId: 'root-channel' } } },
      } as any);

      render(<TelemetryProvider><div /></TelemetryProvider>);

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalledWith(
          expect.objectContaining({ channel: 'root-channel' }),
        );
      });
    });

    it('resolves channel from org search when rootOrg.hashTagId is absent for logged-in user', async () => {
      vi.mocked(userService.getUserId).mockReturnValue('logged-user');
      // Profile has channel slug but no rootOrg.hashTagId
      vi.mocked(userService.userRead).mockResolvedValue({
        data: { response: { channel: 'sunbirdco', rootOrg: {} } },
      } as any);
      (OrganizationService.prototype as any).search = vi.fn().mockResolvedValue({
        data: { response: { content: [{ hashTagId: 'resolved-hashtag-id' }] } },
        headers: {},
      });

      render(<TelemetryProvider><div /></TelemetryProvider>);

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalledWith(
          expect.objectContaining({ channel: 'resolved-hashtag-id' }),
        );
      });
    });

    it('captures UTM parameters from launch URL', async () => {
      mockGetLaunchUrl.mockResolvedValue({
        url: 'https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=spring',
      });

      render(<TelemetryProvider><div /></TelemetryProvider>);

      await waitFor(() => {
        expect(mockUpdateCampaignParameters).toHaveBeenCalledWith(
          expect.arrayContaining([
            { id: 'google', type: 'utm_source' },
            { id: 'cpc', type: 'utm_medium' },
            { id: 'spring', type: 'utm_campaign' },
          ]),
        );
      });
    });

    it('uses device ID as uid and a UUID sid for anonymous user', async () => {
      render(<TelemetryProvider><div /></TelemetryProvider>);

      await waitFor(() => {
        const call = mockInitialize.mock.calls[0][0];
        expect(call.uid).toBe('did123');
        expect(call.sid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      });
    });
  });

  // ── A10: INTERRUPT on app background ─────────────────────────────────────

  describe('app state change → INTERRUPT', () => {
    it('registers an appStateChange listener', () => {
      render(<TelemetryProvider><div /></TelemetryProvider>);

      expect(mockAppAddListener).toHaveBeenCalledWith(
        'appStateChange',
        expect.any(Function),
      );
    });

    it('fires INTERRUPT when app goes to background', async () => {
      render(<TelemetryProvider><div /></TelemetryProvider>);

      // Retrieve the callback passed to App.addListener
      const stateCallback = mockAppAddListener.mock.calls.find(
        (c) => c[0] === 'appStateChange',
      )?.[1];

      await act(async () => { stateCallback?.({ isActive: false }); });

      expect(mockInterrupt).toHaveBeenCalledWith({ edata: { type: 'background' } });
    });

    it('does not fire INTERRUPT when app comes to foreground', async () => {
      render(<TelemetryProvider><div /></TelemetryProvider>);

      const stateCallback = mockAppAddListener.mock.calls.find(
        (c) => c[0] === 'appStateChange',
      )?.[1];

      await act(async () => { stateCallback?.({ isActive: true }); });

      expect(mockInterrupt).not.toHaveBeenCalled();
    });
  });
});
