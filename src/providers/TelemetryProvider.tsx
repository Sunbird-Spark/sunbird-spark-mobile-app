import React, { createContext, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { v4 as uuidv4 } from 'uuid';
import { telemetryService, type TelemetryEventInput } from '../services/TelemetryService';
import { deviceService } from '../services/device/deviceService';
import { NativeConfigServiceInstance } from '../services/NativeConfigService';
import { OrganizationService } from '../services/OrganizationService';
import { SystemSettingService } from '../services/SystemSettingService';
import { userService } from '../services/UserService';
import { databaseService } from '../services/db/DatabaseService';
import { keyValueDbService, KVKey } from '../services/db/KeyValueDbService';

export const TelemetryContext = createContext<typeof telemetryService | null>(null);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initializedRef = useRef(false);

  // ── One-time context resolution on mount ──────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      try {
        // B12 — ensure DB is ready; load persisted clock offset as initial fallback
        await databaseService.initialize();
        const storedOffset = await keyValueDbService.get(KVKey.TELEMETRY_CLOCK_OFFSET).catch(() => null);

        const orgService = new OrganizationService();
        const systemSettingService = new SystemSettingService();

        const [did, config] = await Promise.all([
          deviceService.getHashedDeviceId().catch(() => ''),
          NativeConfigServiceInstance.load().catch(() => ({
            producerId: 'sunbird.app',
            appVersion: '1.0.0',
            baseUrl: '',
            mobileAppConsumer: '',
            mobileAppKey: '',
            mobileAppSecret: '',
          })),
        ]);

        // Anonymous: uid = '' (empty string), sid = '1' (fixed static)
        // Logged-in: uid = real userId, sid = new UUID (regenerated per session)
        const rawUid = userService.getUserId();
        const uid = rawUid || '';
        const isLoggedIn = !!rawUid;
        const sid = isLoggedIn ? uuidv4() : '1';
        const platform = Capacitor.getPlatform();

        // Resolve channel and clock skew
        let channel = '';
        // B12 — seed timeDiff from persisted offset; overwrite if we get a fresh server date
        let timeDiff = storedOffset ? Number(storedOffset) : 0;
        let tags: string[] = [];

        if (isLoggedIn) {
          // Logged-in: channel from user's rootOrg (mirrors SunbirdEd-portal behaviour)
          try {
            const userResponse = await userService.userRead(uid);
            const userData = (userResponse.data as any)?.response;
            channel = userData?.channel || (userData?.rootOrg as any)?.hashTagId || '';
            tags = channel ? [channel] : [];
          } catch { /* fall through to anonymous channel resolution */ }

          // Get server clock skew from org API using user's channel as slug
          if (channel) {
            try {
              const orgResponse = await orgService.search({
                request: { filters: { isTenant: true, slug: channel } },
              });
              const serverDate = orgResponse?.headers?.['date'] as string | undefined;
              if (serverDate) {
                timeDiff = new Date(serverDate).getTime() - Date.now();
              }
            } catch { /* use stored timeDiff */ }
          }
        }

        // Anonymous (or logged-in channel lookup failed): resolve via default_channel setting
        if (!channel) {
          let slug = 'sunbird';
          try {
            const setting = await systemSettingService.read<{ response: { value: string } }>('default_channel');
            slug = (setting as any)?.data?.response?.value || slug;
          } catch { /* use fallback slug */ }

          try {
            const orgResponse = await orgService.search({
              request: { filters: { isTenant: true, slug } },
            });
            const org = orgResponse?.data?.response?.content?.[0];
            channel = org?.hashTagId || org?.channel || '';
            tags = channel ? [channel] : [];
            const serverDate = orgResponse?.headers?.['date'] as string | undefined;
            if (serverDate) {
              timeDiff = new Date(serverDate).getTime() - Date.now();
            }
          } catch { /* use empty channel */ }
        }

        // B12 — persist fresh clock offset so next cold-start has it immediately
        if (timeDiff !== 0) {
          keyValueDbService.set(KVKey.TELEMETRY_CLOCK_OFFSET, String(timeDiff)).catch(() => {});
        }

        telemetryService.initialize({
          did,
          sid,
          uid,
          channel,
          pdata: {
            id: config.producerId || 'sunbird.app',
            ver: config.appVersion || '1.0.0',
            pid: config.producerId || 'sunbird.app',
          },
          timeDiff,
          tags,
          rollup: channel ? { l1: channel } : {},
          platform,
        });

        // B10 — capture UTM/campaign parameters from app launch URL
        try {
          const launchUrl = await App.getLaunchUrl().catch(() => ({ url: '' }));
          if (launchUrl?.url) {
            const params = new URL(launchUrl.url).searchParams;
            const utm = (
              [
                params.get('utm_source') ? { id: params.get('utm_source')!, type: 'utm_source' } : null,
                params.get('utm_medium') ? { id: params.get('utm_medium')!, type: 'utm_medium' } : null,
                params.get('utm_campaign') ? { id: params.get('utm_campaign')!, type: 'utm_campaign' } : null,
              ] as Array<{ id: string; type: string } | null>
            ).filter((x): x is { id: string; type: string } => x !== null);
            if (utm.length) telemetryService.updateCampaignParameters(utm);
          }
        } catch { /* no launch URL or invalid URL — skip UTM */ }
      } catch (err) {
        console.error('[TelemetryProvider] Failed to initialize context:', err);
      }
    };

    init();
  }, []);

  // ── Global declarative INTERACT listener ──────────────────────────────────
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest('[data-edataid]') as HTMLElement | null;
      if (!target) return;

      const edataid = target.getAttribute('data-edataid');
      if (!edataid) return;

      const edatatype = target.getAttribute('data-edatatype') || 'CLICK';
      const pageid = target.getAttribute('data-pageid');

      const payload: TelemetryEventInput = {
        edata: {
          type: edatatype,
          id: edataid,
          ...(pageid && { pageid }),
        },
      };

      const objectid = target.getAttribute('data-objectid');
      const objecttype = target.getAttribute('data-objecttype');
      if (objectid && objecttype) {
        payload.context = { cdata: [{ id: objectid, type: objecttype }] };
      }

      void telemetryService.interact(payload);
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, []);

  // ── A10: INTERRUPT on app background ─────────────────────────────────────
  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        void telemetryService.interrupt({ edata: { type: 'background' } });
      }
    }).then((h) => { handle = h; }).catch(() => {});
    return () => { handle?.remove(); };
  }, []);

  return (
    <TelemetryContext.Provider value={telemetryService}>
      {children}
    </TelemetryContext.Provider>
  );
};
