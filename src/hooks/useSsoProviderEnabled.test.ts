import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetProviders } = vi.hoisted(() => ({ mockGetProviders: vi.fn() }));

vi.mock('../services/AppInfoService', () => ({
  appInfoService: { getEnabledSsoProviders: mockGetProviders },
}));

import { useSsoProviderEnabled } from './useSsoProviderEnabled';

describe('useSsoProviderEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to true while the request is pending', () => {
    mockGetProviders.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );
    const { result } = renderHook(() => useSsoProviderEnabled('google'));
    expect(result.current).toBe(true);
  });

  it('is true when the provider is listed', async () => {
    mockGetProviders.mockResolvedValue(['google']);
    const { result } = renderHook(() => useSsoProviderEnabled('Google'));
    await waitFor(() => expect(mockGetProviders).toHaveBeenCalled());
    expect(result.current).toBe(true);
  });

  it('is false when the provider is not listed', async () => {
    mockGetProviders.mockResolvedValue([]);
    const { result } = renderHook(() => useSsoProviderEnabled('google'));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('stays true when the list is unavailable (null)', async () => {
    mockGetProviders.mockResolvedValue(null);
    const { result } = renderHook(() => useSsoProviderEnabled('google'));
    await waitFor(() => expect(mockGetProviders).toHaveBeenCalled());
    expect(result.current).toBe(true);
  });
});
