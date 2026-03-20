import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { userService } from '../services/UserService';
import type { UserProfile } from '../types/userTypes';
import { AppInitializer } from '../AppInitializer';

export const useUser = (userId: string | null): UseQueryResult<UserProfile, Error> => {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const response = await userService.userRead(userId!);
      // CapacitorAdapter auto-extracts 'result' from API response,
      // so response.data is already the 'result' object: { response: UserProfile }
      return (response.data as any).response;
    },
    enabled: !!userId && AppInitializer.isInitialized(),
  });
};
