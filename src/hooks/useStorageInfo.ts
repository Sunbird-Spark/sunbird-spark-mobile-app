import { useState, useEffect } from 'react';
import { contentDbService } from '../services/db/ContentDbService';
import { downloadManager } from '../services/download_manager';

interface StorageInfo {
  totalBytes: number;
  itemCount: number;
}

/**
 * Returns the total downloaded content size and count.
 * Re-evaluates when download state changes or imports complete.
 */
export function useStorageInfo(): StorageInfo {
  const [info, setInfo] = useState<StorageInfo>({ totalBytes: 0, itemCount: 0 });

  useEffect(() => {
    const refresh = () =>
      contentDbService.getDownloadedContent().then((entries) => {
        setInfo({
          totalBytes: entries.reduce((sum, e) => sum + (e.size_on_device || 0), 0),
          itemCount: entries.length,
        });
      });

    refresh();

    const unsub = downloadManager.subscribe((event) => {
      if (event.type === 'state_change' || event.type === 'all_done') {
        refresh();
      }
    });

    return unsub;
  }, []);

  return info;
}
