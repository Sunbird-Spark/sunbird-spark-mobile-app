import { gzipSync, strToU8 } from 'fflate';

/**
 * Gzip-compress a JSON string using fflate.
 * strToU8 encodes the string as UTF-8 (identical to what pako did internally).
 * Returns a Uint8Array — output is standard RFC 1952 gzip, H4sI prefix preserved.
 */
export function gzipCompress(jsonString: string): Uint8Array {
  return gzipSync(strToU8(jsonString));
}

/**
 * Convert a gzip Uint8Array to base64 for SQLite storage.
 * Converts each byte to a Latin-1 char then uses btoa — this is the
 * correct way to base64-encode binary data in browsers/Capacitor.
 */
export function gzipStringToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

let _worker: Worker | null = null;
let _msgId = 0;
const _pending = new Map<number, { resolve: (s: string) => void; reject: (e: Error) => void }>();

function getCompressionWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(new URL('./compression.worker.ts', import.meta.url), { type: 'module' });
    _worker.onmessage = (e: MessageEvent<{ id: number; result: string }>) => {
      const p = _pending.get(e.data.id);
      if (p) { p.resolve(e.data.result); _pending.delete(e.data.id); }
    };
    _worker.onerror = (err: ErrorEvent) => {
      _pending.forEach(({ reject }) => reject(new Error(err.message)));
      _pending.clear();
      _worker = null; // reset so next call gets a fresh worker
    };
  }
  return _worker;
}

/**
 * Gzip-compress jsonString off the main thread and return base64.
 * Drop-in async replacement for gzipStringToBase64(gzipCompress(json)).
 */
export function gzipCompressAsync(jsonString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = ++_msgId;
    _pending.set(id, { resolve, reject });
    getCompressionWorker().postMessage({ id, data: jsonString });
  });
}
