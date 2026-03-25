import { useState, useEffect, useCallback } from 'react';
import { contentDbService } from '../services/db/ContentDbService';
import { downloadManager } from '../services/download_manager';
import type { DownloadEvent } from '../services/download_manager/types';

/**
 * Returns a Set of content identifiers that are available locally (content_state === 2).
 * Accepts a list of identifiers to check in bulk.
 * Auto-refreshes when download state changes (completions, imports, all_done).
 */
export function useLocalContentSet(identifiers: string[]): Set<string> {
  const [localSet, setLocalSet] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (identifiers.length === 0) {
      setLocalSet(new Set());
      return;
    }
    const entries = await contentDbService.getByIdentifiers(identifiers);
    const localIds = new Set(
      entries.filter((e) => e.content_state === 2).map((e) => e.identifier),
    );
    setLocalSet(localIds);
  }, [identifiers]);

  useEffect(() => {
    let cancelled = false;

    const doRefresh = async () => {
      if (cancelled) return;
      await refresh();
    };

    doRefresh();

    const unsub = downloadManager.subscribe((event: DownloadEvent) => {
      if (
        event.type === 'state_change' ||
        event.type === 'all_done'
      ) {
        doRefresh();
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [refresh]);

  return localSet;
}
