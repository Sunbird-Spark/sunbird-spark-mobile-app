import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockForceSyncActivityAgg } = vi.hoisted(() => ({
  mockForceSyncActivityAgg: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../services/course/BatchService', () => ({
  BatchService: class {
    forceSyncActivityAgg = mockForceSyncActivityAgg;
  },
}));

vi.mock('../services/forceSyncStorage', () => ({
  canUseForceSync: vi.fn(),
  markForceSyncUsed: vi.fn(),
}));

vi.mock('../services/network/networkService', () => ({
  networkService: { isConnected: vi.fn() },
}));

import { useForceSync } from './useForceSync';
import { canUseForceSync, markForceSyncUsed } from '../services/forceSyncStorage';
import { networkService } from '../services/network/networkService';

const USER = 'user-1';
const COURSE = 'do_course';
const BATCH = 'batch-1';
const COMPLETE = { total: 4, completed: 4, percentage: 100 };

const render = (
  args: Partial<{
    userId: string | null | undefined;
    collectionId: string | undefined;
    batchId: string | undefined;
    progress: { total: number; completed: number; percentage: number } | null;
    isBatchEnded: boolean;
  }> = {},
) => {
  // `in` checks (not destructuring defaults) so an explicit `undefined` is honoured.
  const userId = 'userId' in args ? args.userId : USER;
  const collectionId = 'collectionId' in args ? args.collectionId : COURSE;
  const batchId = 'batchId' in args ? args.batchId : BATCH;
  const progress = 'progress' in args ? args.progress : COMPLETE;
  const isBatchEnded = args.isBatchEnded ?? false;
  return renderHook(() =>
    useForceSync(userId, collectionId, batchId, progress, isBatchEnded),
  );
};

describe('useForceSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(canUseForceSync).mockReturnValue(true);
    vi.mocked(networkService.isConnected).mockReturnValue(true);
    mockForceSyncActivityAgg.mockResolvedValue({ data: {}, status: 200, headers: {} });
  });

  describe('showForceSyncButton', () => {
    it('is shown for a fully complete, ongoing batch that is off cooldown', () => {
      const { result } = render();

      expect(result.current.showForceSyncButton).toBe(true);
      expect(canUseForceSync).toHaveBeenCalledWith(USER, COURSE, BATCH);
    });

    it('is hidden below 100% progress', () => {
      const { result } = render({ progress: { total: 4, completed: 3, percentage: 75 } });
      expect(result.current.showForceSyncButton).toBe(false);
    });

    it('is hidden when the progress props are missing', () => {
      const { result } = render({ progress: null });
      expect(result.current.showForceSyncButton).toBe(false);
    });

    it('is hidden once the batch has ended', () => {
      const { result } = render({ isBatchEnded: true });
      expect(result.current.showForceSyncButton).toBe(false);
    });

    it('is hidden without a batchId', () => {
      const { result } = render({ batchId: undefined });
      expect(result.current.showForceSyncButton).toBe(false);
    });

    it('is hidden without a userId', () => {
      const { result } = render({ userId: null });
      expect(result.current.showForceSyncButton).toBe(false);
    });

    it('is hidden while the cooldown is active', () => {
      vi.mocked(canUseForceSync).mockReturnValue(false);
      const { result } = render();
      expect(result.current.showForceSyncButton).toBe(false);
    });
  });

  describe('handleForceSync', () => {
    it('triggers the aggregate sync, records the usage and hides the button', async () => {
      const { result } = render();

      await act(async () => { await result.current.handleForceSync(); });

      expect(mockForceSyncActivityAgg).toHaveBeenCalledWith({
        userId: USER,
        courseId: COURSE,
        batchId: BATCH,
      });
      expect(markForceSyncUsed).toHaveBeenCalledWith(USER, COURSE, BATCH);
      expect(result.current.forceSyncError).toBeNull();
      expect(result.current.isForceSyncing).toBe(false);
    });

    it('does nothing when the ids are incomplete', async () => {
      const { result } = render({ batchId: undefined });

      await act(async () => { await result.current.handleForceSync(); });

      expect(mockForceSyncActivityAgg).not.toHaveBeenCalled();
      expect(result.current.forceSyncError).toBeNull();
    });

    it('reports a cooldown instead of calling the API', async () => {
      vi.mocked(canUseForceSync).mockReturnValue(false);
      const { result } = render();

      await act(async () => { await result.current.handleForceSync(); });

      expect(result.current.forceSyncError).toBe('forceSyncCooldown');
      expect(mockForceSyncActivityAgg).not.toHaveBeenCalled();
    });

    it('reports no internet before calling the API when offline', async () => {
      vi.mocked(networkService.isConnected).mockReturnValue(false);
      const { result } = render();

      await act(async () => { await result.current.handleForceSync(); });

      expect(result.current.forceSyncError).toBe('syncNoInternet');
      expect(mockForceSyncActivityAgg).not.toHaveBeenCalled();
      expect(markForceSyncUsed).not.toHaveBeenCalled();
      expect(result.current.isForceSyncing).toBe(false);
    });

    it('surfaces the API error message on failure', async () => {
      mockForceSyncActivityAgg.mockRejectedValue(new Error('aggregation job busy'));
      const { result } = render();

      await act(async () => { await result.current.handleForceSync(); });

      expect(result.current.forceSyncError).toBe('aggregation job busy');
      expect(markForceSyncUsed).not.toHaveBeenCalled();
      expect(result.current.isForceSyncing).toBe(false);
    });

    it('falls back to a generic message for a blank error', async () => {
      mockForceSyncActivityAgg.mockRejectedValue(new Error('   '));
      const { result } = render();

      await act(async () => { await result.current.handleForceSync(); });

      expect(result.current.forceSyncError).toBe('forceSyncFailed');
    });

    it('reports no internet when connectivity dropped mid-request', async () => {
      mockForceSyncActivityAgg.mockImplementation(() => {
        vi.mocked(networkService.isConnected).mockReturnValue(false);
        return Promise.reject(new Error('Network request failed'));
      });
      const { result } = render();

      await act(async () => { await result.current.handleForceSync(); });

      expect(result.current.forceSyncError).toBe('syncNoInternet');
    });
  });
});
