/**
 * Offline Database Layer - IndexedDB Wrapper
 * 
 * Provides type-safe CRUD operations for offline data persistence.
 * Supports transactions, indexes, and metadata tracking.
 */

import { get, set, del, keys, clear } from 'idb-keyval';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SyncMetadata {
    lastSynced: number;
    version: string;
    syncStatus: 'pending' | 'synced' | 'error';
    localUpdatedAt: number;
    conflictResolution?: 'server' | 'client' | 'manual';
}

export interface OfflineRecord<T> {
    id: string;
    data: T;
    metadata: SyncMetadata;
}

export type TableName =
    | 'students' | 'teachers' | 'parents' | 'users'
    | 'classes' | 'subjects' | 'timetable' | 'conversations'
    | 'assignments' | 'grades' | 'attendance_records'
    | 'notices' | 'messages' | 'schools' | 'branches'
    | 'sync_queue' | 'conflict_log' | 'notifications'
    | 'class_teachers' | 'teacher_subjects';

export interface SyncQueueItem {
    id: string;
    table: TableName;
    operation: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
    retryCount: number;
    error?: string;
}

export interface QueryOptions {
    where?: Record<string, any>;
    orderBy?: string;
    limit?: number;
    offset?: number;
    columns?: string;
}

// ============================================================================
// Database Configuration
// ============================================================================

const DB_NAME = 'school_app_offline';
const DB_VERSION = 1;
const STORE_PREFIX = 'table_';

class OfflineDatabase {
    private dbPromise: Promise<IDBDatabase> | null = null;

    /**
     * Initialize IndexedDB connection
     */
    private async getDB(): Promise<IDBDatabase> {
        if (this.dbPromise) {
            return this.dbPromise;
        }

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB failed to open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                this.createStores(db);
            };
        });

        return this.dbPromise;
    }

    /**
     * Create object stores on database upgrade
     */
    private createStores(db: IDBDatabase) {
        const tables: TableName[] = [
            'students', 'teachers', 'parents', 'users',
            'classes', 'subjects', 'timetable', 'conversations',
            'assignments', 'grades', 'attendance_records',
            'notices', 'messages', 'schools', 'branches',
            'sync_queue', 'conflict_log', 'notifications',
            'class_teachers', 'teacher_subjects'
        ];

        tables.forEach(table => {
            const storeName = STORE_PREFIX + table;

            if (!db.objectStoreNames.contains(storeName)) {
                const store = db.createObjectStore(storeName, { keyPath: 'id' });

                // Create common indexes
                store.createIndex('lastSynced', 'metadata.lastSynced', { unique: false });
                store.createIndex('syncStatus', 'metadata.syncStatus', { unique: false });
                store.createIndex('localUpdatedAt', 'metadata.localUpdatedAt', { unique: false });

                // Table-specific indexes
                if (table === 'students' || table === 'teachers' || table === 'parents') {
                    store.createIndex('school_id', 'data.school_id', { unique: false });
                    store.createIndex('email', 'data.email', { unique: false });
                }
                if (table === 'assignments' || table === 'grades') {
                    store.createIndex('class_id', 'data.class_id', { unique: false });
                    store.createIndex('student_id', 'data.student_id', { unique: false });
                }
                if (table === 'timetable') {
                    store.createIndex('day', 'data.day', { unique: false });
                    store.createIndex('class_name', 'data.class_name', { unique: false });
                }
                if (table === 'sync_queue') {
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('retryCount', 'retryCount', { unique: false });
                }
            }
        });

        console.log('✅ IndexedDB stores created successfully');
    }

    /**
     * Get object store for a table
     */
    private async getStore(table: TableName, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
        const db = await this.getDB();
        const transaction = db.transaction(STORE_PREFIX + table, mode);
        return transaction.objectStore(STORE_PREFIX + table);
    }

    // ========================================================================
    // CRUD Operations
    // ========================================================================

    /**
     * Insert or update a record
     */
    async upsert<T>(table: TableName, id: string, data: T, metadata?: Partial<SyncMetadata>): Promise<void> {
        const store = await this.getStore(table, 'readwrite');

        const record: OfflineRecord<T> = {
            id,
            data,
            metadata: {
                lastSynced: metadata?.lastSynced || 0,
                version: metadata?.version || '1.0',
                syncStatus: metadata?.syncStatus || 'pending',
                localUpdatedAt: Date.now(),
                conflictResolution: metadata?.conflictResolution
            }
        };

        return new Promise((resolve, reject) => {
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a single record by ID
     */
    async get<T>(table: TableName, id: string): Promise<OfflineRecord<T> | null> {
        const store = await this.getStore(table, 'readonly');

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all records from a table
     */
    async getAll<T>(table: TableName, options?: QueryOptions): Promise<OfflineRecord<T>[]> {
        const store = await this.getStore(table, 'readonly');

        return new Promise((resolve, reject) => {
            const request = store.getAll();

            request.onsuccess = () => {
                let results = request.result || [];

                // Apply filters
                if (options?.where) {
                    results = this.filterRecords(results, options.where);
                }

                // Apply ordering
                if (options?.orderBy) {
                    results = this.sortRecords(results, options.orderBy);
                }

                // Apply pagination
                if (options?.offset) {
                    results = results.slice(options.offset);
                }
                if (options?.limit) {
                    results = results.slice(0, options.limit);
                }

                resolve(results);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Query records by index
     */
    async queryByIndex<T>(
        table: TableName,
        indexName: string,
        value: any
    ): Promise<OfflineRecord<T>[]> {
        const store = await this.getStore(table, 'readonly');
        const index = store.index(indexName);

        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a record
     */
    async delete(table: TableName, id: string): Promise<void> {
        const store = await this.getStore(table, 'readwrite');

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Batch insert/update records
     */
    async batchUpsert<T>(table: TableName, records: Array<{ id: string; data: T; metadata?: Partial<SyncMetadata> }>): Promise<void> {
        const store = await this.getStore(table, 'readwrite');

        return new Promise((resolve, reject) => {
            const transaction = store.transaction;

            records.forEach(({ id, data, metadata }) => {
                const record: OfflineRecord<T> = {
                    id,
                    data,
                    metadata: {
                        lastSynced: metadata?.lastSynced || 0,
                        version: metadata?.version || '1.0',
                        syncStatus: metadata?.syncStatus || 'pending',
                        localUpdatedAt: Date.now(),
                        conflictResolution: metadata?.conflictResolution
                    }
                };
                store.put(record);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Clear all records from a table
     */
    async clearTable(table: TableName): Promise<void> {
        const store = await this.getStore(table, 'readwrite');

        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all tables (logout/reset)
     */
    async clearAll(): Promise<void> {
        const tables: TableName[] = [
            'students', 'teachers', 'parents', 'users',
            'classes', 'subjects', 'timetable', 'conversations',
            'assignments', 'grades', 'attendance_records',
            'notices', 'messages', 'schools', 'branches',
            'sync_queue', 'conflict_log', 'notifications',
            'class_teachers', 'teacher_subjects'
        ];

        await Promise.all(tables.map(table => this.clearTable(table)));
        console.log('✅ All IndexedDB tables cleared');
    }

    // ========================================================================
    // Sync Queue Operations
    // ========================================================================

    /**
     * Add operation to sync queue
     */
    async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
        const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const queueItem: SyncQueueItem = {
            id,
            ...item,
            timestamp: Date.now(),
            retryCount: 0
        };

        await this.upsert('sync_queue', id, queueItem);
        return id;
    }

    /**
     * Get all pending sync operations
     */
    async getPendingSyncQueue(): Promise<OfflineRecord<SyncQueueItem>[]> {
        return this.getAll<SyncQueueItem>('sync_queue');
    }

    /**
     * Remove operation from sync queue
     */
    async removeFromSyncQueue(id: string): Promise<void> {
        await this.delete('sync_queue', id);
    }

    /**
     * Increment retry count for failed sync
     */
    async incrementSyncRetry(id: string, error: string): Promise<void> {
        const record = await this.get<SyncQueueItem>('sync_queue', id);
        if (record) {
            record.data.retryCount += 1;
            record.data.error = error;
            await this.upsert('sync_queue', id, record.data);
        }
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Get database size and quota
     */
    async getStorageInfo(): Promise<{ usage: number; quota: number; percentage: number }> {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const usage = estimate.usage || 0;
            const quota = estimate.quota || 0;
            const percentage = quota > 0 ? (usage / quota) * 100 : 0;

            return { usage, quota, percentage };
        }

        return { usage: 0, quota: 0, percentage: 0 };
    }

    /**
     * Purge old cached data (older than specified days)
     */
    async purgeOldData(daysOld: number = 30): Promise<number> {
        const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
        let purgedCount = 0;

        const tables: TableName[] = [
            'assignments', 'grades', 'attendance_records', 'messages', 'notices'
        ];

        for (const table of tables) {
            const records = await this.getAll(table);
            const oldRecords = records.filter(r => r.metadata.lastSynced < cutoffTime);

            for (const record of oldRecords) {
                await this.delete(table, record.id);
                purgedCount++;
            }
        }

        console.log(`✅ Purged ${purgedCount} old records from cache`);
        return purgedCount;
    }

    /**
     * Filter records by criteria
     */
    private filterRecords<T>(records: OfflineRecord<T>[], where: Record<string, any>): OfflineRecord<T>[] {
        return records.filter(record => {
            return Object.entries(where).every(([key, value]) => {
                const recordValue = this.getNestedValue(record.data, key);
                return recordValue === value;
            });
        });
    }

    /**
     * Sort records
     */
    private sortRecords<T>(records: OfflineRecord<T>[], orderBy: string): OfflineRecord<T>[] {
        const [field, direction = 'asc'] = orderBy.split(':');

        return [...records].sort((a, b) => {
            const aValue = this.getNestedValue(a.data, field);
            const bValue = this.getNestedValue(b.data, field);

            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Get nested object value by dot notation path
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Export database for debugging
     */
    async exportDatabase(): Promise<Record<TableName, any[]>> {
        const tables: TableName[] = [
            'students', 'teachers', 'parents', 'users',
            'classes', 'subjects', 'timetable', 'conversations',
            'assignments', 'grades', 'attendance_records',
            'notices', 'messages', 'schools', 'branches',
            'sync_queue', 'conflict_log', 'notifications',
            'class_teachers', 'teacher_subjects'
        ];

        const exported: any = {};

        for (const table of tables) {
            exported[table] = await this.getAll(table);
        }

        return exported;
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const offlineDB = new OfflineDatabase();

// Helper functions for common operations
export const dbHelpers = {
    /**
     * Check if a record exists
     */
    async exists(table: TableName, id: string): Promise<boolean> {
        const record = await offlineDB.get(table, id);
        return record !== null;
    },

    /**
     * Get count of records in a table
     */
    async count(table: TableName): Promise<number> {
        const records = await offlineDB.getAll(table);
        return records.length;
    },

    /**
     * Get records that need syncing
     */
    async getPendingSync<T>(table: TableName): Promise<OfflineRecord<T>[]> {
        return offlineDB.queryByIndex(table, 'syncStatus', 'pending');
    },

    /**
     * Mark record as synced
     */
    async markSynced(table: TableName, id: string): Promise<void> {
        const record = await offlineDB.get(table, id);
        if (record) {
            await offlineDB.upsert(table, id, record.data, {
                syncStatus: 'synced',
                lastSynced: Date.now()
            });
        }
    }
};
