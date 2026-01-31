/**
 * Sync Worker - Offload heavy sync operations to Web Worker
 * 
 * This worker handles CPU-intensive sync operations in the background
 * without blocking the main thread.
 */

// Worker context
const ctx: Worker = self as any;

// Message handler
ctx.addEventListener('message', async (event: MessageEvent) => {
    const { type, payload } = event.data;

    try {
        switch (type) {
            case 'PROCESS_SYNC_BATCH':
                await processSyncBatch(payload);
                break;

            case 'COMPUTE_DIFF':
                await computeDiff(payload);
                break;

            case 'COMPRESS_DATA':
                await compressData(payload);
                break;

            case 'DECOMPRESS_DATA':
                await decompressData(payload);
                break;

            default:
                ctx.postMessage({
                    type: 'ERROR',
                    error: `Unknown message type: ${type}`
                });
        }
    } catch (error) {
        ctx.postMessage({
            type: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Process a batch of sync operations
 */
async function processSyncBatch(payload: any) {
    const { items } = payload;
    const results = [];

    for (const item of items) {
        // Simulate processing
        const processed = {
            ...item,
            processed: true,
            timestamp: Date.now()
        };
        results.push(processed);
    }

    ctx.postMessage({
        type: 'SYNC_BATCH_COMPLETE',
        results
    });
}

/**
 * Compute diff between local and server data
 */
async function computeDiff(payload: any) {
    const { localData, serverData } = payload;
    const diff: any[] = [];

    // Simple diff algorithm
    for (const key in serverData) {
        if (JSON.stringify(localData[key]) !== JSON.stringify(serverData[key])) {
            diff.push({
                key,
                local: localData[key],
                server: serverData[key]
            });
        }
    }

    ctx.postMessage({
        type: 'DIFF_COMPLETE',
        diff
    });
}

/**
 * Compress data (simple string compression)
 */
async function compressData(payload: any) {
    const { data } = payload;

    // Simple compression using JSON stringify + base64
    const compressed = btoa(JSON.stringify(data));

    ctx.postMessage({
        type: 'COMPRESS_COMPLETE',
        compressed,
        originalSize: JSON.stringify(data).length,
        compressedSize: compressed.length
    });
}

/**
 * Decompress data
 */
async function decompressData(payload: any) {
    const { compressed } = payload;

    // Decompress
    const decompressed = JSON.parse(atob(compressed));

    ctx.postMessage({
        type: 'DECOMPRESS_COMPLETE',
        decompressed
    });
}

export { };
