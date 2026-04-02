import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BatchService } from '../services/course/BatchService';
import { canUseForceSync, markForceSyncUsed } from '../services/forceSyncStorage';
import { networkService } from '../services/network/networkService';

const batchService = new BatchService();

export function useForceSync(
  userId: string | null | undefined,
  collectionId: string | undefined,
  batchId: string | undefined,
  courseProgressProps: { total: number; completed: number; percentage: number } | null | undefined,
  isBatchEnded?: boolean,
) {
  const { t } = useTranslation();
  const [, setForceSyncRefresh] = useState(0);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [forceSyncError, setForceSyncError] = useState<string | null>(null);

  const progressPercentage = courseProgressProps?.percentage ?? 0;

  const showForceSyncButton = Boolean(
    userId &&
    collectionId &&
    batchId &&
    !isBatchEnded &&
    progressPercentage >= 100 &&
    canUseForceSync(userId, collectionId, batchId),
  );

  const handleForceSync = useCallback(async () => {
    if (!userId || !collectionId || !batchId) return;
    if (!canUseForceSync(userId, collectionId, batchId)) {
      setForceSyncError(t('forceSyncCooldown'));
      return;
    }
    setIsForceSyncing(true);
    setForceSyncError(null);
    try {
      if (!networkService.isConnected()) {
        setForceSyncError(t('syncNoInternet'));
        return;
      }
      await batchService.forceSyncActivityAgg({
        userId,
        courseId: collectionId,
        batchId,
      });
      markForceSyncUsed(userId, collectionId, batchId);
      setForceSyncRefresh((r) => r + 1);
    } catch (err) {
      if (!networkService.isConnected()) {
        setForceSyncError(t('syncNoInternet'));
      } else {
        const message = (err as Error).message;
        setForceSyncError(message && message.trim() ? message : t('forceSyncFailed'));
      }
    } finally {
      setIsForceSyncing(false);
    }
  }, [userId, collectionId, batchId, t]);

  return { showForceSyncButton, handleForceSync, isForceSyncing, forceSyncError };
}
