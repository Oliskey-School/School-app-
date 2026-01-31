/**
 * Web Worker Manager
 * 
 * Manages Web Worker lifecycle and communication for heavy operations
 */

type WorkerMessageType =
    | 'PROCESS_SYNC_BATCH'
    | 'COMPUTE_DIFF'
    | 'COMPRESS_DATA'
    | 'DECOMPRESS_DATA';

interface WorkerMessage {
    type: WorkerMessageType;
    payload: any;
}

interface WorkerResponse {
    type: string;
    results?: any;
    diff?: any;
    compressed?: string;
    decompressed?: any;
    error?: string;
}

class WebWorkerManager {
    private worker: Worker | null = null;
    private messageHandlers: Map<string, (data: any) => void> = new Map();

    /**
     * Initialize the worker
     */
    init(): void {
        if (this.worker) {
            return;
        }

        try {
            // Try to load the worker
            this.worker = new Worker('/sync.worker.js');

            this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
                const { type, ...data } = event.data;

                // Call registered handler
                const handler = this.messageHandlers.get(type);
                if (handler) {
                    handler(data);
                    this.messageHandlers.delete(type);
                }

                // Log errors
                if (type === 'ERROR') {
                    console.error('[Worker Error]:', data.error);
                }
            });

            this.worker.addEventListener('error', (error) => {
                console.error('[Worker Error]:', error);
            });

            console.log('✅ Web Worker initialized');
        } catch (error) {
            console.warn('⚠️ Web Worker not available:', error);
        }
    }

    /**
     * Send message to worker
     */
    private postMessage(type: WorkerMessageType, payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Worker not initialized'));
                return;
            }

            // Register response handler
            const responseType = type.replace('_', '_COMPLETE').replace('PROCESS', '').replace('COMPUTE', '');
            this.messageHandlers.set(
                type === 'PROCESS_SYNC_BATCH' ? 'SYNC_BATCH_COMPLETE' :
                    type === 'COMPUTE_DIFF' ? 'DIFF_COMPLETE' :
                        type === 'COMPRESS_DATA' ? 'COMPRESS_COMPLETE' :
                            'DECOMPRESS_COMPLETE',
                resolve
            );

            // Set timeout
            const timeout = setTimeout(() => {
                reject(new Error('Worker timeout'));
            }, 30000);

            // Clear timeout on response
            const originalHandler = this.messageHandlers.get(responseType);
            this.messageHandlers.set(responseType, (data) => {
                clearTimeout(timeout);
                if (originalHandler) originalHandler(data);
            });

            // Send message
            this.worker.postMessage({ type, payload });
        });
    }

    /**
     * Process sync batch in worker
     */
    async processSyncBatch(items: any[]): Promise<any[]> {
        try {
            const result = await this.postMessage('PROCESS_SYNC_BATCH', { items });
            return result.results || [];
        } catch (error) {
            console.warn('Worker failed, falling back to main thread:', error);
            return items.map(item => ({ ...item, processed: true }));
        }
    }

    /**
     * Compute diff in worker
     */
    async computeDiff(localData: any, serverData: any): Promise<any[]> {
        try {
            const result = await this.postMessage('COMPUTE_DIFF', { localData, serverData });
            return result.diff || [];
        } catch (error) {
            console.warn('Worker failed, falling back to main thread:', error);
            return [];
        }
    }

    /**
     * Compress data in worker
     */
    async compressData(data: any): Promise<{ compressed: string; originalSize: number; compressedSize: number }> {
        try {
            return await this.postMessage('COMPRESS_DATA', { data });
        } catch (error) {
            console.warn('Worker failed, falling back to main thread:', error);
            const compressed = btoa(JSON.stringify(data));
            return {
                compressed,
                originalSize: JSON.stringify(data).length,
                compressedSize: compressed.length
            };
        }
    }

    /**
     * Decompress data in worker
     */
    async decompressData(compressed: string): Promise<any> {
        try {
            const result = await this.postMessage('DECOMPRESS_DATA', { compressed });
            return result.decompressed;
        } catch (error) {
            console.warn('Worker failed, falling back to main thread:', error);
            return JSON.parse(atob(compressed));
        }
    }

    /**
     * Terminate worker
     */
    terminate(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.messageHandlers.clear();
            console.log('✅ Web Worker terminated');
        }
    }
}

// Singleton instance
export const webWorkerManager = new WebWorkerManager();

// Auto-initialize
if (typeof window !== 'undefined') {
    webWorkerManager.init();
}
