/**
 * Data Service - Unified Data Access Layer
 * 
 * Provides a single interface for data operations with automatic
 * routing between offline and online sources, optimistic updates,
 * and multiple caching strategies.
 */

import { supabase } from './supabase';
import { offlineDB, TableName, OfflineRecord, QueryOptions } from './offlineDatabase';
import { syncEngine } from './syncEngine';
import { networkManager } from './networkManager';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type CacheStrategy = 'cache-first' | 'network-first' | 'cache-and-network' | 'network-only';

export interface DataServiceOptions extends QueryOptions {
    strategy?: CacheStrategy;
    skipCache?: boolean;
    optimistic?: boolean;
}

export interface MutationOptions {
    optimistic?: boolean;
    skipSync?: boolean;
}

// ============================================================================
// Data Service Class
// ============================================================================

class DataService {
    // ========================================================================
    // Query Operations
    // ========================================================================

    /**
     * Query data with automatic caching and network awareness
     */
    async query<T>(
        table: TableName,
        options: DataServiceOptions = {}
    ): Promise<T[]> {
        const strategy = options.strategy || this.getDefaultStrategy(table);

        switch (strategy) {
            case 'cache-first':
                return this.cacheFirstQuery<T>(table, options);
            case 'network-first':
                return this.networkFirstQuery<T>(table, options);
            case 'cache-and-network':
                return this.cacheAndNetworkQuery<T>(table, options);
            case 'network-only':
                return this.networkOnlyQuery<T>(table, options);
            default:
                return this.cacheFirstQuery<T>(table, options);
        }
    }

    /**
     * Get a single record by ID
     */
    async getById<T>(
        table: TableName,
        id: string,
        options: DataServiceOptions = {}
    ): Promise<T | null> {
        const strategy = options.strategy || 'cache-first';

        if (strategy === 'cache-first' || networkManager.isOffline()) {
            // Try cache first
            const cached = await offlineDB.get<T>(table, id);
            if (cached) {
                return cached.data;
            }

            // Fallback to network if online
            if (networkManager.isOnline()) {
                return this.fetchFromServer<T>(table, { where: { id } }).then(items => items[0] || null);
            }

            return null;
        } else {
            // Network first
            try {
                const items = await this.fetchFromServer<T>(table, { where: { id } });
                const item = items[0] || null;

                if (item) {
                    // Update cache
                    await offlineDB.upsert(table, id, item, {
                        syncStatus: 'synced',
                        lastSynced: Date.now()
                    });
                }

                return item;
            } catch (error) {
                // Fallback to cache
                const cached = await offlineDB.get<T>(table, id);
                return cached ? cached.data : null;
            }
        }
    }

    // ========================================================================
    // Cache Strategies
    // ========================================================================

    /**
     * Cache-first: Try cache, fallback to network
     */
    private async cacheFirstQuery<T>(
        table: TableName,
        options: DataServiceOptions
    ): Promise<T[]> {
        // Always check cache first
        const cached = await offlineDB.getAll<T>(table, options);

        if (cached.length > 0) {
            // Return cached data immediately
            const results = cached.map(r => r.data);

            // Background refresh if online
            if (networkManager.isOnline() && !options.skipCache) {
                this.backgroundRefresh(table, options);
            }

            return results;
        }

        // No cache, fetch from network if online
        if (networkManager.isOnline()) {
            return this.fetchFromServer<T>(table, options);
        }

        // Offline with no cache
        return [];
    }

    /**
     * Network-first: Try network, fallback to cache
     */
    private async networkFirstQuery<T>(
        table: TableName,
        options: DataServiceOptions
    ): Promise<T[]> {
        if (networkManager.isOnline()) {
            try {
                return await this.fetchFromServer<T>(table, options);
            } catch (error) {
                console.warn('Network fetch failed, falling back to cache:', error);
            }
        }

        // Fallback to cache
        const cached = await offlineDB.getAll<T>(table, options);
        return cached.map(r => r.data);
    }

    /**
     * Cache-and-network: Return cache immediately, then update with network
     */
    private async cacheAndNetworkQuery<T>(
        table: TableName,
        options: DataServiceOptions
    ): Promise<T[]> {
        // Return cache first
        const cached = await offlineDB.getAll<T>(table, options);
        const cachedResults = cached.map(r => r.data);

        // Fetch from network in background
        if (networkManager.isOnline()) {
            this.backgroundRefresh(table, options);
        }

        return cachedResults;
    }

    /**
     * Network-only: Always fetch from network, don't use cache
     */
    private async networkOnlyQuery<T>(
        table: TableName,
        options: DataServiceOptions
    ): Promise<T[]> {
        if (networkManager.isOffline()) {
            throw new Error('Network-only query requires internet connection');
        }

        return this.fetchFromServer<T>(table, options);
    }

    // ========================================================================
    // Network Operations
    // ========================================================================

    /**
     * Fetch data from server and update cache
     */
    private async fetchFromServer<T>(
        table: TableName,
        options: QueryOptions = {}
    ): Promise<T[]> {
        let query = supabase.from(table).select(options.columns || '*');

        // Apply filters
        if (options.where) {
            Object.entries(options.where).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        // Apply ordering
        if (options.orderBy) {
            const [field, direction = 'asc'] = options.orderBy.split(':');
            query = query.order(field, { ascending: direction === 'asc' });
        }

        // Apply pagination
        if (options.limit) {
            query = query.limit(options.limit);
        }
        if (options.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        // Update cache
        if (data && data.length > 0) {
            const records = data.map((item: any) => ({
                id: item.id,
                data: item,
                metadata: {
                    syncStatus: 'synced' as const,
                    lastSynced: Date.now()
                }
            }));

            await offlineDB.batchUpsert(table, records);
        }

        return (data as T[]) || [];
    }

    /**
     * Background refresh of cache
     */
    private async backgroundRefresh(table: TableName, options: QueryOptions): Promise<void> {
        try {
            await this.fetchFromServer(table, options);
        } catch (error) {
            console.warn('Background refresh failed:', error);
        }
    }

    // ========================================================================
    // Mutation Operations
    // ========================================================================

    /**
     * Create a new record
     */
    async create<T extends { id: string }>(
        table: TableName,
        data: T,
        options: MutationOptions = {}
    ): Promise<T> {
        const optimistic = options.optimistic !== false; // Default to true

        // Optimistic update: Save to cache immediately
        if (optimistic) {
            await offlineDB.upsert(table, data.id, data, {
                syncStatus: 'pending'
            });
        }

        // Queue for sync
        if (!options.skipSync) {
            await syncEngine.queueOperation(table, 'create', data);
        }

        // If online, sync immediately
        if (networkManager.isOnline() && networkManager.isGoodForSync()) {
            try {
                const { data: serverData, error } = await supabase
                    .from(table)
                    .insert(data)
                    .select()
                    .single();

                if (error) throw error;

                // Update cache with server response
                await offlineDB.upsert(table, data.id, serverData as T, {
                    syncStatus: 'synced',
                    lastSynced: Date.now()
                });

                return serverData as T;
            } catch (error) {
                console.warn('Create failed, queued for sync:', error);
                // Return optimistic data
                return data;
            }
        }

        return data;
    }

    /**
     * Update an existing record
     */
    async update<T extends { id: string }>(
        table: TableName,
        id: string,
        updates: Partial<T>,
        options: MutationOptions = {}
    ): Promise<T> {
        const optimistic = options.optimistic !== false;

        // Get existing data
        const existing = await offlineDB.get<T>(table, id);
        const mergedData = existing ? { ...existing.data, ...updates } : updates;

        // Optimistic update
        if (optimistic) {
            await offlineDB.upsert(table, id, mergedData as T, {
                syncStatus: 'pending'
            });
        }

        // Queue for sync
        if (!options.skipSync) {
            await syncEngine.queueOperation(table, 'update', { id, ...mergedData });
        }

        // If online, sync immediately
        if (networkManager.isOnline() && networkManager.isGoodForSync()) {
            try {
                const { data: serverData, error } = await supabase
                    .from(table)
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;

                // Update cache with server response
                await offlineDB.upsert(table, id, serverData as T, {
                    syncStatus: 'synced',
                    lastSynced: Date.now()
                });

                return serverData as T;
            } catch (error) {
                console.warn('Update failed, queued for sync:', error);
                return mergedData as T;
            }
        }

        return mergedData as T;
    }

    /**
     * Delete a record
     */
    async delete(
        table: TableName,
        id: string,
        options: MutationOptions = {}
    ): Promise<void> {
        const optimistic = options.optimistic !== false;

        // Optimistic delete from cache
        if (optimistic) {
            await offlineDB.delete(table, id);
        }

        // Queue for sync
        if (!options.skipSync) {
            await syncEngine.queueOperation(table, 'delete', { id });
        }

        // If online, sync immediately
        if (networkManager.isOnline() && networkManager.isGoodForSync()) {
            try {
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } catch (error) {
                console.warn('Delete failed, queued for sync:', error);
            }
        }
    }

    /**
     * Batch create multiple records
     */
    async batchCreate<T extends { id: string }>(
        table: TableName,
        items: T[],
        options: MutationOptions = {}
    ): Promise<T[]> {
        // Update cache
        const records = items.map(item => ({
            id: item.id,
            data: item,
            metadata: {
                syncStatus: 'pending' as const
            }
        }));

        await offlineDB.batchUpsert(table, records);

        // Queue for sync
        for (const item of items) {
            if (!options.skipSync) {
                await syncEngine.queueOperation(table, 'create', item);
            }
        }

        // If online, sync immediately
        if (networkManager.isOnline() && networkManager.isGoodForSync()) {
            try {
                const { data: serverData, error } = await supabase
                    .from(table)
                    .insert(items)
                    .select();

                if (error) throw error;

                // Update cache with server response
                const syncedRecords = (serverData as T[]).map(item => ({
                    id: item.id,
                    data: item,
                    metadata: {
                        syncStatus: 'synced' as const,
                        lastSynced: Date.now()
                    }
                }));

                await offlineDB.batchUpsert(table, syncedRecords);

                return serverData as T[];
            } catch (error) {
                console.warn('Batch create failed, queued for sync:', error);
            }
        }

        return items;
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Get default cache strategy for a table
     */
    private getDefaultStrategy(table: TableName): CacheStrategy {
        // Critical real-time data uses network-first
        const networkFirst: TableName[] = ['grades', 'attendance_records', 'messages'];
        if (networkFirst.includes(table)) {
            return 'network-first';
        }

        // Relatively static data uses cache-first
        const cacheFirst: TableName[] = ['users', 'schools', 'teachers', 'students', 'timetable'];
        if (cacheFirst.includes(table)) {
            return 'cache-first';
        }

        // Default to cache-and-network for balanced approach
        return 'cache-and-network';
    }

    /**
     * Clear cache for a specific table
     */
    async clearCache(table: TableName): Promise<void> {
        await offlineDB.clearTable(table);
    }

    /**
     * Clear all caches
     */
    async clearAllCaches(): Promise<void> {
        await offlineDB.clearAll();
    }

    /**
     * Get sync status for a record
     */
    async getSyncStatus(table: TableName, id: string): Promise<'synced' | 'pending' | 'error' | null> {
        const record = await offlineDB.get(table, id);
        return record ? record.metadata.syncStatus : null;
    }

    /**
     * Check if data is available offline
     */
    async isAvailableOffline(table: TableName): Promise<boolean> {
        const records = await offlineDB.getAll(table);
        return records.length > 0;
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const dataService = new DataService();
