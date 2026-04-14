import { useState, useEffect, useMemo } from 'react';
import { downloadManager } from '../services/download_manager';
import type { DownloadProgress, DownloadEvent } from '../services/download_manager/types';

/**
 * Live download progress subscription for a single content identifier.
 * Returns null if the content is not in the download queue.
 */
export function useDownloadState(identifier: string | undefined): DownloadProgress | null {
  const [state, setState] = useState<DownloadProgress | null>(null);

  // Reset state synchronously when identifier changes (not inside effect)
  const safeId = useMemo(() => identifier ?? null, [identifier]);

  useEffect(() => {
    if (!safeId) return;

    let cancelled = false;

    // Initial state from DB
    downloadManager.getProgress(safeId).then((p) => {
      if (!cancelled) setState(p);
    });

    // Subscribe to events — only update when this identifier changes
    const unsub = downloadManager.subscribe((event: DownloadEvent) => {
      if (event.identifier === safeId || event.type === 'all_done') {
        downloadManager.getProgress(safeId).then((p) => {
          if (!cancelled) setState(p);
        });
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [safeId]);

  // When identifier becomes undefined, return null
  if (!safeId) return null;

  return state;
}
