import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { userService } from '../services/UserService';
import { getTnCData, TnCData } from '../services/TnCService';
import { ApiResponse } from '../lib/http-client';

/** Fetches user profile and extracts TnC data if acceptance is needed. */
export const useTnCCheck = (): UseMutationResult<TnCData | null, Error, string> => {
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await userService.userRead(userId);
      const profile = (response.data as any).response;
      return getTnCData(profile);
    },
  });
};

/** Accepts TnC for the given version. */
export const useTnCAccept = (): UseMutationResult<ApiResponse<any>, Error, { version: string; userId?: string }> => {
  return useMutation({
    mutationFn: (request) => userService.acceptTnC(request),
  });
};
