import { useState, useEffect, useMemo } from 'react';
import { contentDbService } from '../services/db/ContentDbService';
import { downloadManager } from '../services/download_manager';
import type { DownloadEvent } from '../services/download_manager/types';

/**
 * Checks whether content is available locally (content_state === 2).
 * Re-evaluates when download events complete for this identifier.
 *
 * Returns { isLocal, isCheckPending } so callers can distinguish between
 * "not local" and "haven't checked yet", preventing premature error rendering.
 */
export function useIsContentLocal(identifier: string | undefined): { isLocal: boolean; isCheckPending: boolean } {
  const [isLocal, setIsLocal] = useState(false);
  const [isCheckPending, setIsCheckPending] = useState(true);

  const safeId = useMemo(() => identifier ?? null, [identifier]);

  useEffect(() => {
    if (!safeId) {
      setIsLocal(false);
      setIsCheckPending(false);
      return;
    }

    let cancelled = false;
    setIsCheckPending(true);

    const check = () =>
      contentDbService
        .getByIdentifier(safeId)
        .then((entry) => {
          if (!cancelled) {
            setIsLocal(entry !== null && entry.content_state === 2);
            setIsCheckPending(false);
          }
        })
        .catch(() => {
          if (!cancelled) setIsCheckPending(false);
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

  if (!safeId) return { isLocal: false, isCheckPending: false };

  return { isLocal, isCheckPending };
}

