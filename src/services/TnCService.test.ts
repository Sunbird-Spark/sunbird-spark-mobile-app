import { describe, expect, it } from 'vitest';
import { needsTnCAcceptance, getTnCData } from './TnCService';
import type { UserProfile } from '../types/userTypes';

const baseProfile = {
  id: 'user1',
  identifier: 'user1',
  userId: 'user1',
  firstName: 'Test',
  userName: 'test',
} as Partial<UserProfile> as UserProfile;

describe('needsTnCAcceptance', () => {
  it('returns true when all TnC fields are present', () => {
    const profile: UserProfile = {
      ...baseProfile,
      promptTnC: true,
      tncLatestVersion: '4.0',
      tncLatestVersionUrl: 'https://example.com/tnc',
    };

    expect(needsTnCAcceptance(profile)).toBe(true);
  });

  it('returns false when promptTnC is false', () => {
    const profile: UserProfile = {
      ...baseProfile,
      promptTnC: false,
      tncLatestVersion: '4.0',
      tncLatestVersionUrl: 'https://example.com/tnc',
    };

    expect(needsTnCAcceptance(profile)).toBe(false);
  });

  it('returns false when tncLatestVersion is missing', () => {
    const profile: UserProfile = {
      ...baseProfile,
      promptTnC: true,
      tncLatestVersionUrl: 'https://example.com/tnc',
    };

    expect(needsTnCAcceptance(profile)).toBe(false);
  });

  it('returns false when tncLatestVersionUrl is missing', () => {
    const profile: UserProfile = {
      ...baseProfile,
      promptTnC: true,
      tncLatestVersion: '4.0',
    };

    expect(needsTnCAcceptance(profile)).toBe(false);
  });
});

describe('getTnCData', () => {
  it('returns null when TnC acceptance is not needed', () => {
    const profile: UserProfile = {
      ...baseProfile,
      promptTnC: false,
    };

    expect(getTnCData(profile)).toBeNull();
  });

  it('returns TnCData when acceptance is needed', () => {
    const profile: UserProfile = {
      ...baseProfile,
      promptTnC: true,
      tncLatestVersion: '4.0',
      tncLatestVersionUrl: 'https://example.com/tnc',
    };

    const result = getTnCData(profile);

    expect(result).toEqual({
      version: '4.0',
      url: 'https://example.com/tnc',
    });
  });
});
