import { useState, useEffect, useMemo } from 'react';
import { contentDbService } from '../services/db/ContentDbService';
import { downloadManager } from '../services/download_manager';
import type { DownloadEvent } from '../services/download_manager/types';

/**
 * Options for useIsContentLocal hook.
 */
interface UseIsContentLocalOptions {
  /**
   * When true, includes content with visibility='Parent' (only downloaded as part of collection).
   * Default is false — only visibility='Default' is included (standalone download).
   */
  includeParentVisibility?: boolean;
}

/**
 * Checks whether content is available locally (content_state === 2).
 * Re-evaluates when download events complete for this identifier.
 *
 * Returns { isLocal, isCheckPending } so callers can distinguish between
 * "not local" and "haven't checked yet", preventing premature error rendering.
 */
export function useIsContentLocal(
  identifier: string | undefined,
  options?: UseIsContentLocalOptions,
): { isLocal: boolean; isCheckPending: boolean } {
  const includeParent = options?.includeParentVisibility ?? false;
  const [isLocal, setIsLocal] = useState(false);
  const [lastCheckedId, setLastCheckedId] = useState<string | undefined>();

  // Derived state: pending if current identifier hasn't been checked yet
  const isCheckPending = !!identifier && identifier !== lastCheckedId;

  useEffect(() => {
    if (!identifier) {
      return;
    }

    let cancelled = false;
    setIsLocal(false);

    const check = () =>
      contentDbService
        .getByIdentifier(identifier)
        .then((entry) => {
          if (!cancelled) {
            // Content is only considered "fully localized" for the user's library
            // if it has content_state === 2 AND Visibility is 'Default'.
            // If Visibility is 'Parent', it was only downloaded as part of a
            // collection and doesn't explicitly belong in the standalone downloads list.
            const local =
              entry !== null &&
              entry.content_state === 2 &&
              (entry.visibility === 'Default' || (includeParent && entry.visibility === 'Parent'));

            setIsLocal(local);
            setLastCheckedId(identifier);
          }
        })
        .catch(() => {
          if (!cancelled) setLastCheckedId(identifier);
        });

    check();

    const unsub = downloadManager.subscribe((event: DownloadEvent) => {
      if (
        (event.identifier === identifier &&
          (event.type === 'state_change' || event.type === 'content_deleted')) ||
        event.type === 'all_done'
      ) {
        check();
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [identifier, includeParent]);

  if (!identifier) return { isLocal: false, isCheckPending: false };

  return { isLocal, isCheckPending };
}


