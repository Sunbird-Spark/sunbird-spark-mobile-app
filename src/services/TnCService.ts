import type { UserProfile } from '../types/userTypes';

export interface TnCData {
  version: string;
  url: string;
}

export const needsTnCAcceptance = (profile: UserProfile): boolean => {
  return !!(profile.promptTnC && profile.tncLatestVersion && profile.tncLatestVersionUrl);
};

export const getTnCData = (profile: UserProfile): TnCData | null => {
  if (!needsTnCAcceptance(profile)) {
    return null;
  }
  return {
    version: profile.tncLatestVersion!,
    url: profile.tncLatestVersionUrl!,
  };
};
