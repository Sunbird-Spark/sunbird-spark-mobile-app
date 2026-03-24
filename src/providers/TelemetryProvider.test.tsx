import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
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

describe('TelemetryProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppAddListener.mockResolvedValue({ remove: vi.fn() });
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
