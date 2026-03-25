import { useState, useEffect, useRef, useMemo } from 'react';
import { downloadManager } from '../services/download_manager';
import type { DownloadProgress, DownloadEvent } from '../services/download_manager/types';

/**
 * Subscribes to download manager events and returns a Map of identifier → DownloadProgress
 * for all identifiers in the given list. Uses a single subscription instead of one per item.
 */
export function useBatchDownloadStates(
  identifiers: string[],
): Map<string, DownloadProgress> {
  const [stateMap, setStateMap] = useState<Map<string, DownloadProgress>>(new Map());

  // Stabilize identifiers reference — only change when the actual list content changes
  const idsKey = identifiers.join(',');
  const stableIds = useMemo(() => identifiers, [idsKey]);

  // Keep a ref to avoid stale closure in the subscriber
  const idsRef = useRef(stableIds);
  idsRef.current = stableIds;

  useEffect(() => {
    let cancelled = false;

    const doRefresh = async () => {
      if (cancelled) return;
      const ids = idsRef.current;
      if (ids.length === 0) {
        setStateMap(new Map());
        return;
      }
      const map = new Map<string, DownloadProgress>();
      for (const id of ids) {
        const p = await downloadManager.getProgress(id);
        if (p) map.set(id, p);
      }
      if (!cancelled) setStateMap(map);
    };

    doRefresh();

    const unsub = downloadManager.subscribe((event: DownloadEvent) => {
      if (
        event.type === 'progress' ||
        event.type === 'state_change' ||
        event.type === 'all_done' ||
        event.type === 'queue_changed'
      ) {
        doRefresh();
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [stableIds]);

  return stateMap;
}
