import { useState, useEffect, useMemo } from 'react';
import { contentDbService } from '../services/db/ContentDbService';
import { downloadManager } from '../services/download_manager';
import type { DownloadEvent } from '../services/download_manager/types';

/**
 * Checks whether content is available locally (content_state === 2).
 * Re-evaluates when download events complete for this identifier.
 */
export function useIsContentLocal(identifier: string | undefined): boolean {
  const [isLocal, setIsLocal] = useState(false);

  const safeId = useMemo(() => identifier ?? null, [identifier]);

  useEffect(() => {
    if (!safeId) return;

    let cancelled = false;

    const check = () =>
      contentDbService
        .getByIdentifier(safeId)
        .then((entry) => {
          if (!cancelled) setIsLocal(entry !== null && entry.content_state === 2);
        });

    check();

    const unsub = downloadManager.subscribe((event: DownloadEvent) => {
      if (
        (event.identifier === safeId && event.type === 'state_change') ||
        event.type === 'all_done'
      ) {
        check();
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [safeId]);

  // When identifier becomes undefined, return false
  if (!safeId) return false;

  return isLocal;
}
