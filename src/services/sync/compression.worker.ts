import { gzipSync, strToU8 } from 'fflate';

self.onmessage = (e: MessageEvent<{ id: number; data: string }>) => {
  const { id, data } = e.data;
  const bytes = gzipSync(strToU8(data));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  self.postMessage({ id, result: btoa(binary) });
};
