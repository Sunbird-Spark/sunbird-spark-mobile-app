import { useState, useEffect, useMemo, useCallback } from 'react';
import { downloadManager } from '../services/download_manager';
import type { AggregateProgress, DownloadEvent } from '../services/download_manager/types';
import type { HierarchyContentNode } from '../types/collectionTypes';
import { flattenLeafNodes, isDownloadable } from '../services/content/hierarchyUtils';

export interface CourseDownloadProgress {
  /** Total leaf nodes that were enqueued for this collection. */
  total: number;
  /** Number of items that have completed download + import. */
  completed: number;
  /** Overall percentage (0–100) across all items. */
  overallPercent: number;
  /** True if at least one item is queued/downloading/importing/paused/retry_wait for this collection. */
  isDownloading: boolean;
  /** True if all items are purely in PAUSED state. */
  isPaused: boolean;
  /** True if all downloadable items have completed. */
  allDownloaded: boolean;
  /** Number of failed items. */
  failedCount: number;
}

const EMPTY: CourseDownloadProgress = {
  total: 0,
  completed: 0,
  overallPercent: 0,
  isDownloading: false,
  isPaused: false,
  allDownloaded: false,
  failedCount: 0,
};

/**
 * Tracks aggregate download progress for an entire course/collection.
 * Uses `parentIdentifier` grouping from DownloadManager.
 *
 * @param collectionId — the course/collection identifier (used as parentIdentifier)
 * @param children — the hierarchy children to determine total downloadable count
 * @param localIdentifiers — set of already-downloaded identifiers
 */
export function useCourseDownloadProgress(
  collectionId: string | undefined,
  children: HierarchyContentNode[] | undefined,
  localIdentifiers: Set<string>,
): CourseDownloadProgress {
  const [aggregate, setAggregate] = useState<AggregateProgress | null>(null);

  const downloadableCount = useMemo(() => {
    if (!children) return 0;
    return flattenLeafNodes(children).filter(
      (leaf) => isDownloadable(leaf) && !localIdentifiers.has(leaf.identifier),
    ).length;
  }, [children, localIdentifiers]);

  const refresh = useCallback(async () => {
    if (!collectionId) return;
    const agg = await downloadManager.getAggregateProgress(collectionId);
    setAggregate(agg);
  }, [collectionId]);

  useEffect(() => {
    let cancelled = false;
    let lastRefresh = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const doRefresh = async () => {
      if (cancelled) return;

      const now = Date.now();
      const wait = 500 - (now - lastRefresh);

      if (wait <= 0) {
        lastRefresh = now;
        await refresh();
      } else if (!timeout) {
        timeout = setTimeout(async () => {
          timeout = null;
          if (!cancelled) {
            lastRefresh = Date.now();
            await refresh();
          }
        }, wait);
      }
    };

    doRefresh();

    const unsub = downloadManager.subscribe((event: DownloadEvent) => {
      // Refresh on state changes immediately, but throttle progress updates
      if (
        event.type === 'state_change' ||
        event.type === 'all_done' ||
        event.type === 'queue_changed' ||
        event.type === 'content_deleted'
      ) {
        lastRefresh = 0; // Force immediate refresh
        doRefresh();
      } else if (event.type === 'progress') {
        doRefresh();
      }
    });

    // Refresh immediately when network comes back online to correctly resume
    // visual progress from QUEUED/RETRY_WAIT states.
    const networkHandler = () => {
      lastRefresh = 0;
      doRefresh();
    };
    window.addEventListener('online', networkHandler);
    window.addEventListener('offline', networkHandler);

    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener('online', networkHandler);
      window.removeEventListener('offline', networkHandler);
      if (timeout) clearTimeout(timeout);
    };
  }, [refresh]);

  return useMemo((): CourseDownloadProgress => {
    if (!collectionId || !aggregate || aggregate.total === 0) {
      // Check if everything is already local
      if (children && downloadableCount === 0) {
        const totalLeaves = children ? flattenLeafNodes(children).filter(isDownloadable).length : 0;
        return {
          ...EMPTY,
          allDownloaded: totalLeaves > 0 && localIdentifiers.size >= totalLeaves,
        };
      }
      return EMPTY;
    }

    const isDownloading = aggregate.total > 0 && aggregate.activeCount > 0;
    const isPaused = isDownloading && aggregate.pausedCount > 0 && aggregate.pausedCount === aggregate.activeCount;
    const failedCount = aggregate.failedCount;

    return {
      total: aggregate.total,
      completed: aggregate.completed,
      overallPercent: aggregate.overallPercent,
      isDownloading,
      isPaused,
      allDownloaded: aggregate.completed >= aggregate.total,
      failedCount,
    };
  }, [aggregate, collectionId, children, downloadableCount, localIdentifiers]);
}
