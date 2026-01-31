/**
 * Cache Manager
 * 
 * Manages cache cleanup, memory optimization, and storage quota
 */

import { offlineDB } from './offlineDatabase';
import { getStorageQuota, formatBytes } from './performanceUtils';

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear old cached data (> 30 days)
 */
export async function clearStaleCache(maxAgeDays: number = 30): Promise<number> {
    const maxAge = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    let clearedCount = 0;

    const tables = [
        'students', 'teachers', 'parents', 'users',
        'classes', 'subjects', 'timetable',
        'assignments', 'grades', 'attendance_records',
        'notices', 'messages', 'schools', 'branches'
    ] as const;

    for (const table of tables) {
        const records = await offlineDB.getAll(table);

        for (const record of records) {
            const lastSynced = record.metadata.lastSynced || 0;

            if (lastSynced > 0 && lastSynced < maxAge) {
                await offlineDB.delete(table, record.id);
                clearedCount++;
            }
        }
    }

    console.log(`🧹 Cleared ${clearedCount} stale cache records`);
    return clearedCount;
}

/**
 * Clear all caches on logout
 * NOTE: Disabled global wipe to prevent affecting other active sessions in the same browser (multi-tab isolation).
 * Supabase auth now uses sessionStorage, so tab isolation is handled there.
 */
export async function clearAllCachesOnLogout(): Promise<void> {
    try {
        await offlineDB.clearAll();
    } catch (e) {
        console.warn('Failed to clear offlineDB:', e);
    }

    // Clear localStorage items (prefixed)
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('school_app_') || key.startsWith('sync_engine_'))) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 Cleared ${keysToRemove.length} local storage items`);
    } catch (e) {
        console.warn('Failed to clear localStorage:', e);
    }
}

/**
 * Check storage quota and clean if necessary
 */
export async function checkAndCleanStorage(): Promise<void> {
    const quota = await getStorageQuota();

    console.log(`📊 Storage: ${formatBytes(quota.usage)} / ${formatBytes(quota.quota)} (${quota.percentUsed.toFixed(1)}%)`);

    // Warn if over 80%
    if (quota.percentUsed >= 80) {
        console.warn('⚠️ Storage quota > 80%, cleaning stale cache...');

        // Clear stale data (>30 days)
        let cleared = await clearStaleCache(30);

        // If still over 80%, clear older data (>14 days)
        const newQuota = await getStorageQuota();
        if (newQuota.percentUsed >= 80) {
            console.warn('⚠️ Still over 80%, clearing 14-day-old cache...');
            cleared += await clearStaleCache(14);
        }

        // If still over 80%, clear older data (>7 days)
        const finalQuota = await getStorageQuota();
        if (finalQuota.percentUsed >= 80) {
            console.warn('⚠️ Still over 80%, clearing 7-day-old cache...');
            cleared += await clearStaleCache(7);
        }

        console.log(`✅ Cleared ${cleared} records to free space`);
    }
}

/**
 * Prioritize current academic year data
 */
export async function prioritizeCurrentYearData(currentYear: number): Promise<void> {
    // This would be implemented based on your academic year logic
    // For example, clearing data from previous years first

    const tables = ['assignments', 'grades', 'attendance_records'] as const;

    for (const table of tables) {
        const records = await offlineDB.getAll(table);

        for (const record of records) {
            const recordYear = extractYear(record.data);

            if (recordYear && recordYear < currentYear - 1) {
                await offlineDB.delete(table, record.id);
            }
        }
    }

    console.log(`✅ Prioritized current year (${currentYear}) data`);
}

/**
 * Extract year from record (helper function)
 */
function extractYear(data: any): number | null {
    // Try common date fields
    const dateFields = ['created_at', 'updated_at', 'date', 'academic_year'];

    for (const field of dateFields) {
        if (data[field]) {
            const date = new Date(data[field]);
            if (!isNaN(date.getTime())) {
                return date.getFullYear();
            }
        }
    }

    return null;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
    totalRecords: number;
    recordsByTable: Record<string, number>;
    oldestRecord: number;
    newestRecord: number;
    storageQuota: Awaited<ReturnType<typeof getStorageQuota>>;
}> {
    const tables = [
        'students', 'teachers', 'parents', 'users',
        'classes', 'subjects', 'timetable',
        'assignments', 'grades', 'attendance_records',
        'notices', 'messages', 'schools', 'branches'
    ] as const;

    let totalRecords = 0;
    const recordsByTable: Record<string, number> = {};
    let oldestRecord = Date.now();
    let newestRecord = 0;

    for (const table of tables) {
        const records = await offlineDB.getAll(table);
        recordsByTable[table] = records.length;
        totalRecords += records.length;

        for (const record of records) {
            const lastSynced = record.metadata.lastSynced || 0;
            if (lastSynced > 0) {
                oldestRecord = Math.min(oldestRecord, lastSynced);
                newestRecord = Math.max(newestRecord, lastSynced);
            }
        }
    }

    const storageQuota = await getStorageQuota();

    return {
        totalRecords,
        recordsByTable,
        oldestRecord,
        newestRecord,
        storageQuota
    };
}

/**
 * Auto-cleanup scheduler
 */
export class CacheCleanupScheduler {
    private intervalId: NodeJS.Timeout | null = null;
    private cleanupInterval: number = 24 * 60 * 60 * 1000; // 24 hours

    start(): void {
        if (this.intervalId) {
            return;
        }

        // Run cleanup immediately
        this.runCleanup();

        // Schedule recurring cleanup
        this.intervalId = setInterval(() => {
            this.runCleanup();
        }, this.cleanupInterval);

        console.log('🚀 Cache cleanup scheduler started');
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('⏹️  Cache cleanup scheduler stopped');
        }
    }

    private async runCleanup(): Promise<void> {
        try {
            await checkAndCleanStorage();
            console.log('✅ Scheduled cache cleanup completed');
        } catch (error) {
            console.error('❌ Cache cleanup failed:', error);
        }
    }

    setInterval(hours: number): void {
        this.cleanupInterval = hours * 60 * 60 * 1000;

        // Restart if already running
        if (this.intervalId) {
            this.stop();
            this.start();
        }
    }
}

// Global cleanup scheduler instance
export const cacheCleanupScheduler = new CacheCleanupScheduler();

// Auto-start cleanup scheduler
if (typeof window !== 'undefined') {
    cacheCleanupScheduler.start();
}
