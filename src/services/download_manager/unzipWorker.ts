import * as fflate from 'fflate';

/**
 * Multi-threaded Unzip Worker using fflate.
 * Offloads CPU-intensive decompression from the main UI thread.
 * Specifically repairs legacy Sunbird absolute paths (starting with "/").
 */
self.onmessage = (e: MessageEvent<{ zipData: ArrayBuffer }>) => {
    const { zipData } = e.data;

    try {
        // Perform decompression in the background worker thread
        const unzipped = fflate.unzipSync(new Uint8Array(zipData));
        const sanitizedFiles: Record<string, Uint8Array> = {};
        const transferables: ArrayBuffer[] = [];

        for (const [rawPath, data] of Object.entries(unzipped)) {
            // 1. Repair: Strip leading slash from legacy Sunbird paths
            const safePath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;

            // 2. Security: Reject path traversal segments
            if (safePath.split('/').some((part) => part === '..')) continue;
            if (!safePath) continue;

            sanitizedFiles[safePath] = data;
            transferables.push(data.buffer);
        }

        // Return the sanitized file map back to the main thread
        self.postMessage(
            { status: 'success', files: sanitizedFiles },
            { transfer: transferables as ArrayBuffer[] }
        );
    } catch (err) {
        self.postMessage({ status: 'error', error: String(err) });
    }
};
