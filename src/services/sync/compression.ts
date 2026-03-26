import { gzip } from 'pako';

/**
 * Gzip-compress a JSON string using pako.
 * Returns a Uint8Array (pako v2 dropped the `{to:'string'}` option).
 */
export function gzipCompress(jsonString: string): Uint8Array {
  return gzip(jsonString);
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
