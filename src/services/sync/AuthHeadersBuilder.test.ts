import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthHeadersBuilder } from './AuthHeadersBuilder';
import { NetworkQueueType } from './types';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetAuthenticatedToken = vi.fn().mockResolvedValue('kong-token-123');

vi.mock('../AppConsumerAuthService', () => ({
  AppConsumerAuthService: {
    getInstance: vi.fn().mockReturnValue({
      getAuthenticatedToken: (...args: any[]) => mockGetAuthenticatedToken(...args),
    }),
  },
}));

vi.mock('../UserService', () => ({
  userService: { getAccessToken: vi.fn().mockReturnValue(null) },
}));

vi.mock('./SyncConfig', () => ({
  syncConfig: {
    getProducerId: vi.fn().mockReturnValue('prod-123'),
    getChannelId: vi.fn().mockReturnValue('chan-456'),
  },
}));

import { userService } from '../UserService';
import { syncConfig } from './SyncConfig';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('AuthHeadersBuilder', () => {
  let builder: AuthHeadersBuilder;

  beforeEach(() => {
    vi.resetAllMocks();
    builder = new AuthHeadersBuilder();
    mockGetAuthenticatedToken.mockResolvedValue('kong-token-123');
    (userService.getAccessToken as any).mockReturnValue(null);
    (syncConfig.getProducerId as any).mockReturnValue('prod-123');
    (syncConfig.getChannelId as any).mockReturnValue('chan-456');
  });

  it('includes Authorization header with Bearer kong token', async () => {
    const headers = await builder.build(NetworkQueueType.COURSE_PROGRESS);
    expect(headers['Authorization']).toBe('Bearer kong-token-123');
  });

  it('includes X-App-Id and X-Channel-Id', async () => {
    const headers = await builder.build(NetworkQueueType.COURSE_PROGRESS);
    expect(headers['X-App-Id']).toBe('prod-123');
    expect(headers['X-Channel-Id']).toBe('chan-456');
  });

  it('does NOT include X-Authenticated-User-Token when no user token', async () => {
    (userService.getAccessToken as any).mockReturnValue(null);
    const headers = await builder.build(NetworkQueueType.COURSE_PROGRESS);
    expect(headers['X-Authenticated-User-Token']).toBeUndefined();
  });

  it('includes X-Authenticated-User-Token when user is logged in', async () => {
    (userService.getAccessToken as any).mockReturnValue('user-access-token');
    const headers = await builder.build(NetworkQueueType.COURSE_PROGRESS);
    expect(headers['X-Authenticated-User-Token']).toBe('user-access-token');
  });

  it('sets Content-Type to application/octet-stream and Content-Encoding to gzip for TELEMETRY', async () => {
    const headers = await builder.build(NetworkQueueType.TELEMETRY);
    expect(headers['Content-Type']).toBe('application/octet-stream');
    expect(headers['Content-Encoding']).toBe('gzip');
  });

  it('sets Content-Type to application/json for non-TELEMETRY types', async () => {
    const headers = await builder.build(NetworkQueueType.COURSE_PROGRESS);
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Content-Encoding']).toBeUndefined();
  });
});
