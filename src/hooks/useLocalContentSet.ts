import { useState, useEffect, useCallback, useMemo } from 'react';
import { contentDbService } from '../services/db/ContentDbService';
import { downloadManager } from '../services/download_manager';
import type { DownloadEvent } from '../services/download_manager/types';

interface UseLocalContentSetOptions {
  /**
   * When true, includes content with visibility='Parent' (downloaded as part of a collection).
   * Default is false — only visibility='Default' is included (standalone downloads).
   */
  includeParentVisibility?: boolean;
}

/**
 * Returns a Set of content identifiers that are available locally (content_state === 2).
 * Accepts a list of identifiers to check in bulk.
 * Auto-refreshes when download state changes (completions, imports, all_done).
 */
export function useLocalContentSet(
  identifiers: string[],
  options?: UseLocalContentSetOptions,
): Set<string> {
  const includeParent = options?.includeParentVisibility ?? false;
  const [localSet, setLocalSet] = useState<Set<string>>(new Set());

  // Join identifiers to create a stable dependency for the effect.
  // This prevents infinite loops if the caller passes a new array literal on every render.
  const idString = useMemo(() => {
    return [...identifiers].sort().join(',');
  }, [identifiers]);

  // Create a stable array reference that only changes when the contents change.
  // This allows us to use it in useCallback dependency safely.
  const stableIds = useMemo(() => identifiers, [idString]);

  const refresh = useCallback(async () => {
    if (stableIds.length === 0) {
      setLocalSet((prev) => (prev.size === 0 ? prev : new Set()));
      return;
    }
    const entries = await contentDbService.getByIdentifiers(stableIds);
    const localIdsArray = entries
      .filter(
        (e) =>
          e.content_state === 2 &&
          (e.visibility === 'Default' || (includeParent && e.visibility === 'Parent')),
      )
      .map((e) => e.identifier);

    const newSet = new Set(localIdsArray);

    // Deep compare to avoid redundant state updates which cause re-renders
    setLocalSet((prev) => {
      if (prev.size === newSet.size && [...newSet].every((id) => prev.has(id))) {
        return prev;
      }
      return newSet;
    });
  }, [stableIds, includeParent]);

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
        event.type === 'all_done' ||
        event.type === 'content_deleted'
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
