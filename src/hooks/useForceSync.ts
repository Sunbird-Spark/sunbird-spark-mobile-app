import { useState, useCallback } from 'react';
import { BatchService } from '../services/course/BatchService';
import { canUseForceSync, markForceSyncUsed } from '../services/forceSyncStorage';

const batchService = new BatchService();

export function useForceSync(
  userId: string | null | undefined,
  collectionId: string | undefined,
  batchId: string | undefined,
  courseProgressProps: { total: number; completed: number; percentage: number } | null | undefined,
) {
  const [, setForceSyncRefresh] = useState(0);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [forceSyncError, setForceSyncError] = useState<string | null>(null);

  const progressPercentage = courseProgressProps?.percentage ?? 0;

  const showForceSyncButton = Boolean(
    userId &&
    collectionId &&
    batchId &&
    progressPercentage >= 100 &&
    canUseForceSync(userId, collectionId, batchId),
  );

  const handleForceSync = useCallback(async () => {
    if (!userId || !collectionId || !batchId) return;
    if (!canUseForceSync(userId, collectionId, batchId)) {
      setForceSyncError('Force sync is on cooldown. Please try again later.');
      return;
    }
    setIsForceSyncing(true);
    setForceSyncError(null);
    try {
      await batchService.forceSyncActivityAgg({
        userId,
        courseId: collectionId,
        batchId,
      });
      markForceSyncUsed(userId, collectionId, batchId);
      setForceSyncRefresh((r) => r + 1);
    } catch (err) {
      const message = (err as Error).message;
      setForceSyncError(message && message.trim() ? message : 'Force sync failed');
    } finally {
      setIsForceSyncing(false);
    }
  }, [userId, collectionId, batchId]);

  return { showForceSyncButton, handleForceSync, isForceSyncing, forceSyncError };
}
