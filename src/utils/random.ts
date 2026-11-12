/**
 * Cryptographically-secure random helpers.
 *
 * `Math.random()` is a pseudorandom generator with no security guarantees, so it
 * must not be used anywhere in the app (SonarQube typescript:S2245). Everything
 * here is backed by `crypto.getRandomValues`, which is available in the
 * Android/iOS Capacitor WebView, in modern browsers and in Node/happy-dom.
 *
 * Uint32 values are drawn in batches so that hot paths (e.g. the per-frame
 * particle animation) do not pay for a `getRandomValues` syscall per value.
 */

const POOL_SIZE = 256;
const UINT32_RANGE = 0x1_0000_0000; // 2^32

const pool = new Uint32Array(POOL_SIZE);
let poolIndex = POOL_SIZE; // force a refill on first use

function getCrypto(): Crypto {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) {
    throw new Error('Secure random source (crypto.getRandomValues) is unavailable');
  }
  return cryptoObj;
}

/** Next uniformly-distributed unsigned 32-bit integer from the batched pool. */
function nextUint32(): number {
  if (poolIndex >= POOL_SIZE) {
    getCrypto().getRandomValues(pool);
    poolIndex = 0;
  }
  return pool[poolIndex++] as number;
}

/** Uniform float in [0, 1) — the secure drop-in replacement for `Math.random()`. */
export function randomFloat(): number {
  return nextUint32() / UINT32_RANGE;
}

/** Uniform float in [min, max). Returns `min` when the range is empty or inverted. */
export function randomBetween(min: number, max: number): number {
  if (!(max > min)) return min;
  return min + randomFloat() * (max - min);
}

/** Uniform integer in [min, maxExclusive). Returns `min` when the range is empty or inverted. */
export function randomInt(min: number, maxExclusive: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(maxExclusive);
  if (!(hi > lo)) return lo;
  return lo + Math.floor(randomFloat() * (hi - lo));
}

/** Lowercase hex string of `length` characters, drawn from `crypto.getRandomValues`. */
export function randomHex(length: number): string {
  if (length <= 0) return '';
  const bytes = new Uint8Array(Math.ceil(length / 2));
  getCrypto().getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, '0');
  }
  return out.slice(0, length);
}

/**
 * RFC 4122 v4 UUID. Uses the native `crypto.randomUUID` when present and falls
 * back to building one from `crypto.getRandomValues` on older WebViews.
 */
export function randomUUID(): string {
  const cryptoObj = getCrypto();
  if (typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  const bytes = new Uint8Array(16);
  cryptoObj.getRandomValues(bytes);
  bytes[6] = ((bytes[6] as number) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80; // variant 10xx

  const hex: string[] = [];
  for (const byte of bytes) {
    hex.push(byte.toString(16).padStart(2, '0'));
  }
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}
