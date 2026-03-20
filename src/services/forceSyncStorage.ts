const FORCE_SYNC_PREFIX = 'forceSync:';
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown

function getKey(userId: string, courseId: string, batchId: string): string {
  return `${FORCE_SYNC_PREFIX}${userId}:${courseId}:${batchId}`;
}

/** Returns true if force sync can be used (not in cooldown). */
export function canUseForceSync(userId: string, courseId: string, batchId: string): boolean {
  try {
    const key = getKey(userId, courseId, batchId);
    const stored = localStorage.getItem(key);
    if (!stored) return true;
    const ts = Number(stored);
    if (Number.isNaN(ts)) return true;
    return Date.now() - ts > COOLDOWN_MS;
  } catch {
    return true;
  }
}

/** Mark force sync as used (starts cooldown). */
export function markForceSyncUsed(userId: string, courseId: string, batchId: string): void {
  try {
    const key = getKey(userId, courseId, batchId);
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // localStorage may be unavailable
  }
}
