import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consentService } from '../services/consent/ConsentService';
import type { ConsentStatus } from '../types/consentTypes';
import { useAuth } from '../contexts/AuthContext';

export interface UseConsentOptions {
  collectionId: string | undefined;
  channel: string | undefined;
  enabled?: boolean;
}

export function useConsent({ collectionId, channel, enabled = true }: UseConsentOptions) {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['consent', collectionId, channel, userId],
    queryFn: async () => {
      if (!userId || !channel || !collectionId) {
        return { status: null as ConsentStatus | null, lastUpdatedOn: undefined as string | undefined };
      }
      try {
        const res = await consentService.read({
          userId,
          consumerId: channel,
          objectId: collectionId,
        });
        const consents = (res.data as { consents?: { status: ConsentStatus; lastUpdatedOn?: string }[] })?.consents;
        const first = consents?.[0];
        return {
          status: (first?.status ?? null) as ConsentStatus | null,
          lastUpdatedOn: first?.lastUpdatedOn,
        };
      } catch (err) {
        return { status: null as ConsentStatus | null, lastUpdatedOn: undefined as string | undefined };
      }
    },
    enabled: enabled && !!userId && !!channel && !!collectionId,
  });

  const { mutateAsync: updateConsentMutation, isPending: isUpdating } = useMutation({
    mutationFn: async (status: ConsentStatus) => {
      if (!userId || !channel || !collectionId) return;
      await consentService.update({
        status,
        userId,
        consumerId: channel,
        objectId: collectionId,
        objectType: 'Collection',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent', collectionId, channel, userId] });
    },
  });

  return {
    status: data?.status ?? null,
    lastUpdatedOn: data?.lastUpdatedOn,
    isLoading,
    isError,
    error: error instanceof Error ? error : null,
    refetch,
    updateConsent: updateConsentMutation,
    isUpdating,
  };
}
