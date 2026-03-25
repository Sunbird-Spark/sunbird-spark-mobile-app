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
  const [isCheckPending, setIsCheckPending] = useState(!!identifier);
  const [prevId, setPrevId] = useState<string | undefined>(identifier);

  // Sync state with identifier changes during render to avoid synchronous setState in useEffect
  if (identifier !== prevId) {
    setPrevId(identifier);
    setIsLocal(false);
    setIsCheckPending(!!identifier);
  }

  useEffect(() => {
    if (!identifier) {
      return;
    }

    let cancelled = false;

    const check = () =>
      contentDbService
        .getByIdentifier(identifier)
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
        (event.identifier === identifier && event.type === 'state_change') ||
        event.type === 'all_done'
      ) {
        check();
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [identifier]);

  if (!identifier) return { isLocal: false, isCheckPending: false };

  return { isLocal, isCheckPending };
}


