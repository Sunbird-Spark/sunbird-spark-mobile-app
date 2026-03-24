import { useState, useEffect } from 'react';
import { downloadManager } from '../services/download_manager';
import type { DownloadQueueEntry } from '../services/download_manager/types';

/**
 * Full download queue subscription. Re-fetches the queue
 * whenever any download event fires.
 */
export function useDownloadQueue(): DownloadQueueEntry[] {
  const [entries, setEntries] = useState<DownloadQueueEntry[]>([]);

  useEffect(() => {
    downloadManager.getQueue().then(setEntries);

    const unsub = downloadManager.subscribe(() => {
      downloadManager.getQueue().then(setEntries);
    });

    return unsub;
  }, []);

  return entries;
}
