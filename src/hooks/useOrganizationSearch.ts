import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { OrganizationService } from '../services/OrganizationService';
import { ChannelManager } from '../services/ChannelManager';
import { ApiResponse } from '../lib/http-client';

const organizationService = new OrganizationService();

export const useOrganizationSearch = (): UseMutationResult<ApiResponse<any>, Error, any> => {
  return useMutation({
    mutationFn: (request: any) => organizationService.search(request),
    onSuccess: (data) => {
      // Extract channel ID from organization response and set it in headers
      const organizations = data.data?.response?.content;
      if (organizations && organizations.length > 0) {
        const channelId = organizations[0].hashTagId || organizations[0].identifier;
        if (channelId) {
          ChannelManager.setChannelId(channelId);
        }
      }
    },
  });
};