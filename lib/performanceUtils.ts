/**
 * Performance Utilities
 * 
 * Debouncing, throttling, and other performance optimization utilities
 * for the offline-first architecture.
 */

/**
 * Debounce function - delays execution until after wait time has elapsed since last call
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function (this: any, ...args: Parameters<T>) {
        const context = this;

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Throttle function - ensures function is only called once per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;

    return function (this: any, ...args: Parameters<T>) {
        const context = this;

        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;

            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Batch updates - Group multiple updates into a single batch
 */
export class BatchProcessor<T> {
    private queue: T[] = [];
    private timeout: NodeJS.Timeout | null = null;
    private processFn: (items: T[]) => Promise<void>;
    private batchSize: number;
    private batchDelay: number;

    constructor(
        processFn: (items: T[]) => Promise<void>,
        options: { batchSize?: number; batchDelay?: number } = {}
    ) {
        this.processFn = processFn;
        this.batchSize = options.batchSize || 50;
        this.batchDelay = options.batchDelay || 1000;
    }

    add(item: T): void {
        this.queue.push(item);

        // Process immediately if batch size reached
        if (this.queue.length >= this.batchSize) {
            this.flush();
            return;
        }

        // Schedule batch processing
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        this.timeout = setTimeout(() => {
            this.flush();
        }, this.batchDelay);
    }

    async flush(): Promise<void> {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        if (this.queue.length === 0) {
            return;
        }

        const items = [...this.queue];
        this.queue = [];

        await this.processFn(items);
    }

    get pending(): number {
        return this.queue.length;
    }
}

/**
 * Memory-efficient pagination helper
 */
export class VirtualScroller<T> {
    private allItems: T[] = [];
    private pageSize: number;
    private currentPage: number = 0;

    constructor(pageSize: number = 50) {
        this.pageSize = pageSize;
    }

    setItems(items: T[]): void {
        this.allItems = items;
        this.currentPage = 0;
    }

    getCurrentPage(): T[] {
        const start = this.currentPage * this.pageSize;
        const end = start + this.pageSize;
        return this.allItems.slice(start, end);
    }

    nextPage(): T[] | null {
        if (!this.hasNextPage()) {
            return null;
        }

        this.currentPage++;
        return this.getCurrentPage();
    }

    previousPage(): T[] | null {
        if (!this.hasPreviousPage()) {
            return null;
        }

        this.currentPage--;
        return this.getCurrentPage();
    }

    hasNextPage(): boolean {
        return (this.currentPage + 1) * this.pageSize < this.allItems.length;
    }

    hasPreviousPage(): boolean {
        return this.currentPage > 0;
    }

    getTotalPages(): number {
        return Math.ceil(this.allItems.length / this.pageSize);
    }

    goToPage(page: number): T[] | null {
        if (page < 0 || page >= this.getTotalPages()) {
            return null;
        }

        this.currentPage = page;
        return this.getCurrentPage();
    }
}

/**
 * Storage quota monitoring
 */
export async function getStorageQuota(): Promise<{
    usage: number;
    quota: number;
    percentUsed: number;
    available: number;
}> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
        const available = quota - usage;

        return {
            usage,
            quota,
            percentUsed,
            available
        };
    }

    // Fallback for browsers without storage API
    return {
        usage: 0,
        quota: 0,
        percentUsed: 0,
        available: 0
    };
}

/**
 * Check if storage quota is running low
 */
export async function isStorageQuotaLow(): Promise<boolean> {
    const { percentUsed } = await getStorageQuota();
    return percentUsed >= 80;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Lazy loader for heavy operations
 */
export class LazyLoader<T> {
    private loader: () => Promise<T>;
    private cache: T | null = null;
    private loading: boolean = false;
    private promise: Promise<T> | null = null;

    constructor(loader: () => Promise<T>) {
        this.loader = loader;
    }

    async load(): Promise<T> {
        if (this.cache) {
            return this.cache;
        }

        if (this.loading && this.promise) {
            return this.promise;
        }

        this.loading = true;
        this.promise = this.loader();

        try {
            this.cache = await this.promise;
            return this.cache;
        } finally {
            this.loading = false;
        }
    }

    clear(): void {
        this.cache = null;
        this.loading = false;
        this.promise = null;
    }

    get isLoaded(): boolean {
        return this.cache !== null;
    }
}

/**
 * Performance monitor
 */
export class PerformanceMonitor {
    private marks: Map<string, number> = new Map();

    start(label: string): void {
        this.marks.set(label, performance.now());
    }

    end(label: string): number {
        const start = this.marks.get(label);
        if (!start) {
            console.warn(`No start mark found for ${label}`);
            return 0;
        }

        const duration = performance.now() - start;
        this.marks.delete(label);

        return duration;
    }

    async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
        this.start(label);

        try {
            const result = await fn();
            const duration = this.end(label);
            console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
            return result;
        } catch (error) {
            this.end(label);
            throw error;
        }
    }
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();
