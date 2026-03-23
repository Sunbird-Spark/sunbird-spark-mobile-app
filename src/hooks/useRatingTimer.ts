import { useCallback, useEffect, useRef } from 'react';

/**
 * Manages a delayed rating popup timer.
 * - `onContentEnd`: schedules the popup after `delayMs` (cancels any pending timer first).
 * - `onContentStart`: cancels any pending timer (e.g. when content is replayed).
 * - `cancel`: explicitly cancels any pending timer.
 * The timer is also cleared on unmount.
 */
export function useRatingTimer(onOpen: () => void, delayMs = 5000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onContentEnd = useCallback(() => {
    cancel();
    timerRef.current = setTimeout(onOpen, delayMs);
  }, [onOpen, delayMs, cancel]);

  const onContentStart = useCallback(() => {
    cancel();
  }, [cancel]);

  useEffect(() => () => { cancel(); }, [cancel]);

  return { onContentEnd, onContentStart, cancel };
}
