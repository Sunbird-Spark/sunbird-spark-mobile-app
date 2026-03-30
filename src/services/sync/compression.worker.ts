import { gzipSync, strToU8 } from 'fflate';

self.onmessage = (e: MessageEvent<{ id: number; data: string }>) => {
  const { id, data } = e.data;
  const bytes = gzipSync(strToU8(data));
  // Chunked conversion avoids O(n²) string reallocation from per-byte concatenation.
  const CHUNK = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
  }
  self.postMessage({ id, result: btoa(chunks.join('')) });
};
