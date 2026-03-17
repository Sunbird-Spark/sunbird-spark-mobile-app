import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppInitializer } from '../AppInitializer';
import { NativeConfigServiceInstance } from '../services/NativeConfigService';
import { OrganizationService } from '../services/OrganizationService';
import { deviceService } from '../services/device';

const orgService = new OrganizationService();

export interface PlayerContextData {
  channel: string;
  did: string;
  sid: string;
  uid: string;
  pdata: {
    id: string;
    ver: string;
    pid: string;
  };
}

/**
 * Centralises fetching of player telemetry context (channel, device ID, pdata, session, user).
 * Pass the returned `context` object to ContentPlayer so all player services receive
 * pre-resolved values and can skip redundant API calls.
 */
export const usePlayerContext = () => {
  // Stable session ID per hook instance – does not change across re-renders.
  const sessionIdRef = useRef(`session-${Date.now()}`);

  const { data: channel = '', isLoading: channelLoading } = useQuery({
    queryKey: ['player-context-channel'],
    queryFn: async () => {
      const orgResponse = await orgService.search({ filters: { isTenant: true } });
      const org = orgResponse?.data?.result?.response?.content?.[0];
      return org?.channel || '';
    },
    enabled: AppInitializer.isInitialized(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: did = '', isLoading: didLoading } = useQuery({
    queryKey: ['player-context-did'],
    queryFn: () => deviceService.getHashedDeviceId(),
    enabled: AppInitializer.isInitialized(),
    staleTime: Infinity,
  });

  const { data: producerId = 'sunbird.app' } = useQuery({
    queryKey: ['player-context-pdata'],
    queryFn: async () => {
      const config = await NativeConfigServiceInstance.load();
      return config.producerId || 'sunbird.app';
    },
    staleTime: Infinity,
  });

  const context = useMemo<PlayerContextData>(
    () => ({
      channel,
      did,
      sid: sessionIdRef.current,
      uid: 'anonymous',
      pdata: {
        id: producerId,
        ver: '1.0.0',
        pid: 'sunbird-app.contentplayer',
      },
    }),
    [channel, did, producerId],
  );

  return {
    context,
    isLoading: channelLoading || didLoading,
  };
};
