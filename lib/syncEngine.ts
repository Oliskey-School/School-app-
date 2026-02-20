/**
 * Sync Engine - Bidirectional Synchronization
 * 
 * Orchestrates data synchronization between IndexedDB and Supabase.
 * Handles conflict resolution, retry logic, and delta sync.
 */

import { EventEmitter } from './EventEmitter';
import { supabase } from './supabase';
import { offlineDB, TableName, SyncQueueItem, dbHelpers } from './offlineDatabase';
import { networkManager } from './networkManager';
import { debounce } from './performanceUtils';
import { requestBackgroundSync } from './serviceWorkerRegistration';

// ============================================================================
// Types & Interfaces
// ============================================================================

export enum SyncStatus {
    IDLE = 'idle',
    SYNCING = 'syncing',
    ERROR = 'error',
    PAUSED = 'paused'
}

export interface SyncState {
    status: SyncStatus;
    lastSync: number;
    pendingOperations: number;
    failedOperations: number;
    isInitialSyncComplete: boolean;
}

export interface SyncEventMap {
    'sync-start': void;
    'sync-complete': { synced: number; failed: number };
    'sync-error': { error: Error; operation?: SyncQueueItem };
    'sync-progress': { current: number; total: number };
    'state-change': SyncState;
    'conflict-detected': { table: TableName; localData: any; serverData: any };
}

export interface ConflictResolutionResult {
    resolution: 'server' | 'client' | 'merged';
    data: any;
}

// ============================================================================
// Sync Engine Class
// ============================================================================

class SyncEngine extends EventEmitter {
    private state: SyncState;
    private syncIntervalId: NodeJS.Timeout | null = null;
    private isSyncing: boolean = false;
    private syncInterval: number = 2 * 60 * 1000; // 2 minutes
    private maxRetries: number = 3;
    private batchSize: number = 50;
    private debouncedSync = debounce(() => this.sync(), 1000);

    constructor() {
        super();

        const savedState = this.loadState();
        this.state = {
            status: SyncStatus.IDLE,
            lastSync: savedState.lastSync || 0,
            pendingOperations: 0,
            failedOperations: 0,
            isInitialSyncComplete: savedState.isInitialSyncComplete || false
        };

        this.setupListeners();
    }

    // ========================================================================
    // Persistence
    // ========================================================================

    private loadState(): Partial<SyncState> {
        if (typeof window === 'undefined') return {};
        const stored = localStorage.getItem('sync_engine_state');
        return stored ? JSON.parse(stored) : {};
    }

    private saveState(): void {
        if (typeof window === 'undefined') return;
        const stateToSave = {
            lastSync: this.state.lastSync,
            isInitialSyncComplete: this.state.isInitialSyncComplete
        };
        localStorage.setItem('sync_engine_state', JSON.stringify(stateToSave));
    }

    // ========================================================================
    // Initialization
    // ========================================================================

    private setupListeners(): void {
        // Sync on network reconnection
        networkManager.on('online', async () => {
            console.log('🔄 Network reconnected - triggering sync');
            await this.sync();
        });

        // Sync on visibility change (tab refocus)
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', async () => {
                if (!document.hidden && networkManager.isOnline()) {
                    await this.sync();
                }
            });
        }

        // Periodic sync
        this.startPeriodicSync();
    }

    private startPeriodicSync(): void {
        this.syncIntervalId = setInterval(async () => {
            if (networkManager.isOnline() && !this.isSyncing) {
                await this.sync();
            }
        }, this.syncInterval);
    }

    private stopPeriodicSync(): void {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    }

    // ========================================================================
    // Main Sync Logic
    // ========================================================================

    /**
     * Trigger full bidirectional sync
     */
    async sync(): Promise<{ synced: number; failed: number }> {
        if (this.isSyncing) {
            console.log('⏳ Sync already in progress, skipping');
            return { synced: 0, failed: 0 };
        }

        if (networkManager.isOffline()) {
            console.log('📴 Offline - skipping sync');
            return { synced: 0, failed: 0 };
        }

        this.isSyncing = true;
        this.updateState({ status: SyncStatus.SYNCING });
        this.emit('sync-start');

        let syncedCount = 0;
        let failedCount = 0;

        try {
            // Step 1: Process local changes (push to server)
            const pushResult = await this.pushLocalChanges();
            syncedCount += pushResult.synced;
            failedCount += pushResult.failed;

            // Step 2: Pull server changes (fetch from server)
            const pullResult = await this.pullServerChanges();
            syncedCount += pullResult.synced;
            failedCount += pullResult.failed;

            // Step 3: Initial hydration if first sync
            if (!this.state.isInitialSyncComplete) {
                await this.initialHydration();
                this.updateState({ isInitialSyncComplete: true });
            }

            this.updateState({
                status: SyncStatus.IDLE,
                lastSync: Date.now(),
                pendingOperations: failedCount
            });

            this.emit('sync-complete', { synced: syncedCount, failed: failedCount });

            console.log(`✅ Sync complete: ${syncedCount} synced, ${failedCount} failed`);
        } catch (error) {
            console.error('❌ Sync failed:', error);
            this.updateState({ status: SyncStatus.ERROR });
            this.emit('sync-error', { error: error as Error });
            failedCount++;
        } finally {
            this.isSyncing = false;
        }

        return { synced: syncedCount, failed: failedCount };
    }

    // ========================================================================
    // Push Local Changes
    // ========================================================================

    /**
     * Push local changes to server
     */
    private async pushLocalChanges(): Promise<{ synced: number; failed: number }> {
        const queueItems = await offlineDB.getPendingSyncQueue();

        if (queueItems.length === 0) {
            return { synced: 0, failed: 0 };
        }

        console.log(`📤 Pushing ${queueItems.length} local changes to server`);

        let synced = 0;
        let failed = 0;

        // Process in batches
        for (let i = 0; i < queueItems.length; i += this.batchSize) {
            const batch = queueItems.slice(i, i + this.batchSize);

            for (const item of batch) {
                try {
                    await this.processSyncQueueItem(item.data);
                    await offlineDB.removeFromSyncQueue(item.id);
                    synced++;

                    this.emit('sync-progress', {
                        current: i + batch.indexOf(item) + 1,
                        total: queueItems.length
                    });
                } catch (error) {
                    console.error(`Failed to sync item ${item.id}:`, error);

                    // Increment retry count
                    await offlineDB.incrementSyncRetry(item.id, (error as Error).message);

                    // Remove if max retries exceeded
                    if (item.data.retryCount >= this.maxRetries) {
                        console.warn(`Max retries exceeded for ${item.id}, removing from queue`);
                        await offlineDB.removeFromSyncQueue(item.id);
                    }

                    failed++;
                    this.emit('sync-error', { error: error as Error, operation: item.data });
                }
            }
        }

        return { synced, failed };
    }

    /**
     * Process a single sync queue item
     */
    private async processSyncQueueItem(item: SyncQueueItem): Promise<void> {
        const { table, operation, data } = item;

        switch (operation) {
            case 'create':
                await this.createOnServer(table, data);
                break;
            case 'update':
                await this.updateOnServer(table, data);
                break;
            case 'delete':
                await this.deleteOnServer(table, data.id);
                break;
        }

        // Mark as synced in local DB
        await dbHelpers.markSynced(table, data.id);
    }

    // ========================================================================
    // Server Operations
    // ========================================================================

    private async createOnServer(table: TableName, data: any): Promise<void> {
        const { error } = await supabase.from(table).insert(data);
        if (error) throw error;
    }

    private async updateOnServer(table: TableName, data: any): Promise<void> {
        // Check for conflicts
        const { data: serverData, error: fetchError } = await supabase
            .from(table)
            .select('*')
            .eq('id', data.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        if (serverData) {
            // Conflict detection
            const resolution = await this.resolveConflict(table, data, serverData);

            const { error } = await supabase
                .from(table)
                .update(resolution.data)
                .eq('id', data.id);

            if (error) throw error;

            // Update local copy with resolved data
            if (resolution.resolution === 'server' || resolution.resolution === 'merged') {
                await offlineDB.upsert(table, data.id, resolution.data, {
                    syncStatus: 'synced',
                    lastSynced: Date.now()
                });
            }
        } else {
            // Record doesn't exist on server, create it
            await this.createOnServer(table, data);
        }
    }

    private async deleteOnServer(table: TableName, id: string): Promise<void> {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
    }

    // ========================================================================
    // Pull Server Changes
    // ========================================================================

    /**
     * Pull server changes and update local database
     */
    private async pullServerChanges(): Promise<{ synced: number; failed: number }> {
        // Essential tables for app startup
        const essentialTables: TableName[] = [
            'schools', 'users', 'branches', 'notices'
        ];

        // Background tables (synced if we have time or on demand)
        const backgroundTables: TableName[] = [
            'classes', 'subjects', 'timetable', 'students', 'teachers', 'parents',
            'assignments', 'grades', 'attendance_records', 'messages'
        ];

        let synced = 0;
        let failed = 0;

        // On first sync, only fetch essential tables to reduce blocking
        const tablesToSync = this.state.lastSync === 0 ? essentialTables : [...essentialTables, ...backgroundTables];

        console.log(`📥 Starting staggered pull for ${tablesToSync.length} tables...`);

        // Get session to check for school_id validity
        const { data: { session } } = await supabase.auth.getSession();
        let schoolId = session?.user?.user_metadata?.school_id || session?.user?.app_metadata?.school_id;

        // Fallback: Query public.users if metadata is missing (robust resolution)
        if (!schoolId && session?.user?.id) {
            const { data: userProfile } = await supabase
                .from('users')
                .select('school_id')
                .eq('id', session.user.id)
                .maybeSingle();

            if (userProfile?.school_id) {
                schoolId = userProfile.school_id;
                console.log('✅ Resolved school_id from public.users:', schoolId);
            }
        }

        // Fallback for Demo Users (even if session is null)
        const isDemoMode = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('is_demo_mode') === 'true';
        if (!schoolId && (session?.user?.email?.includes('demo') || isDemoMode)) {
            schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
            console.log('🛡️ [SyncEngine] resolved school_id via Demo Mode fallback');
        }


        for (const table of tablesToSync) {
            try {
                // ADDED: Small delay between table fetches to prevent AbortError / network congestion
                await new Promise(resolve => setTimeout(resolve, 500));

                if (!this.isSyncing) break; // Check if sync was cancelled mid-sequence

                // Skip sensitive tables if no school_id (prevents 401s)
                if (['grades', 'attendance_records', 'timetable', 'assignments'].includes(table) && !schoolId) {
                    console.log(`⏭️ Skipping ${table} - no school_id (preventing 401)`);
                    continue;
                }

                // Get last sync timestamp for delta sync
                const lastSync = this.state.lastSync;

                let query = supabase.from(table).select('*');

                // Delta sync: only fetch records updated since last sync
                if (lastSync > 0) {
                    const lastSyncDate = new Date(lastSync).toISOString();
                    query = query.gt('updated_at', lastSyncDate);
                }

                // Limit to prevent overwhelming the client
                query = query.limit(1000);

                const { data, error } = await query;

                if (error) {
                    // Skip permission errors silently (common for demo users without RLS policies)
                    if (error.code === '42501' || error.message?.includes('permission denied')) {
                        console.log(`⏭️ Skipping ${table} - no permission (expected for demo users)`);
                        continue; // Skip this table, don't count as failed
                    }

                    if (error.message?.includes('AbortError')) {
                        console.warn(`⚠️ Fetch for ${table} was aborted. This usually happens on navigation or multiple sync triggers. Skipping.`);
                    } else {
                        console.error(`Failed to fetch ${table}:`, error);
                        failed++;
                    }
                    continue;
                }

                if (data && data.length > 0) {
                    // Batch update local database
                    const records = data.map(record => ({
                        id: record.id,
                        data: record,
                        metadata: {
                            syncStatus: 'synced' as const,
                            lastSynced: Date.now()
                        }
                    }));

                    await offlineDB.batchUpsert(table, records);
                    synced += data.length;

                    console.log(`📥 Pulled ${data.length} records from ${table}`);
                }
            } catch (error) {
                console.error(`Error pulling ${table}:`, error);
                failed++;
            }
        }

        return { synced, failed };
    }

    // ========================================================================
    // Initial Hydration
    // ========================================================================

    /**
     * Initial data hydration for first-time users
     */
    private async initialHydration(): Promise<void> {
        console.log('🌊 Starting initial data hydration...');

        // Fetch essential data for the current user
        // This would be customized based on user role and school

        const tables: TableName[] = [
            'users', 'schools', 'classes', 'subjects', 'timetable'
        ];

        for (const table of tables) {
            try {
                const { data } = await supabase.from(table).select('*').limit(500);

                if (data && data.length > 0) {
                    const records = data.map(record => ({
                        id: record.id,
                        data: record,
                        metadata: {
                            syncStatus: 'synced' as const,
                            lastSynced: Date.now()
                        }
                    }));

                    await offlineDB.batchUpsert(table, records);
                    console.log(`✅ Hydrated ${data.length} ${table} records`);
                }
            } catch (error) {
                console.error(`Failed to hydrate ${table}:`, error);
            }
        }
    }

    // ========================================================================
    // Conflict Resolution
    // ========================================================================

    /**
     * Resolve conflicts using Last-Write-Wins strategy
     */
    private async resolveConflict(
        table: TableName,
        localData: any,
        serverData: any
    ): Promise<ConflictResolutionResult> {
        const localTimestamp = new Date(localData.updated_at || localData.created_at).getTime();
        const serverTimestamp = new Date(serverData.updated_at || serverData.created_at).getTime();

        // Emit conflict event for logging
        this.emit('conflict-detected', { table, localData, serverData });

        console.warn(`⚠️ Conflict detected in ${table} for record ${localData.id}`);
        console.log(`Local timestamp: ${new Date(localTimestamp).toISOString()}`);
        console.log(`Server timestamp: ${new Date(serverTimestamp).toISOString()}`);

        // Last-Write-Wins: Server timestamp takes priority
        if (serverTimestamp > localTimestamp) {
            console.log('✅ Server wins (newer timestamp)');
            return {
                resolution: 'server',
                data: serverData
            };
        } else if (localTimestamp > serverTimestamp) {
            console.log('✅ Client wins (newer timestamp)');
            return {
                resolution: 'client',
                data: localData
            };
        } else {
            // Same timestamp - merge where possible
            console.log('⚖️ Same timestamp - merging');
            const merged = { ...serverData, ...localData };
            return {
                resolution: 'merged',
                data: merged
            };
        }
    }

    // ========================================================================
    // State Management
    // ========================================================================

    private updateState(updates: Partial<SyncState>): void {
        this.state = { ...this.state, ...updates };
        this.saveState();
        this.emit('state-change', this.state);
    }

    // ========================================================================
    // Public API
    // ========================================================================

    /**
     * Get current sync state
     */
    getState(): SyncState {
        return { ...this.state };
    }

    /**
     * Check if currently syncing
     */
    isSyncInProgress(): boolean {
        return this.isSyncing;
    }

    /**
     * Manually trigger sync
     */
    async triggerSync(): Promise<void> {
        await this.sync();
    }

    /**
     * Pause automatic syncing
     */
    pause(): void {
        this.stopPeriodicSync();
        this.updateState({ status: SyncStatus.PAUSED });
    }

    /**
     * Resume automatic syncing
     */
    resume(): void {
        this.startPeriodicSync();
        this.updateState({ status: SyncStatus.IDLE });
    }

    /**
     * Queue an operation for sync
     */
    async queueOperation(
        table: TableName,
        operation: 'create' | 'update' | 'delete',
        data: any
    ): Promise<void> {
        await offlineDB.addToSyncQueue({ table, operation, data });

        const pendingCount = (await offlineDB.getPendingSyncQueue()).length;
        this.updateState({ pendingOperations: pendingCount });

        // Trigger immediate sync if online and not already syncing
        if (networkManager.isOnline() && !this.isSyncing) {
            // Debounce sync to avoid too many rapid syncs
            setTimeout(() => this.sync(), 1000);
        } else if (networkManager.isOffline()) {
            // Register background sync task
            requestBackgroundSync('offline-sync');
        }
    }

    /**
     * Get pending operations count
     */
    async getPendingCount(): Promise<number> {
        const queue = await offlineDB.getPendingSyncQueue();
        return queue.length;
    }

    /**
     * Clear failed operations
     */
    async clearFailed(): Promise<void> {
        const queue = await offlineDB.getPendingSyncQueue();
        const failed = queue.filter(item => item.data.retryCount >= this.maxRetries);

        for (const item of failed) {
            await offlineDB.removeFromSyncQueue(item.id);
        }

        this.updateState({ failedOperations: 0 });
    }

    /**
     * Register event listener
     */
    on<K extends keyof SyncEventMap>(
        event: K,
        listener: (data: SyncEventMap[K]) => void
    ): this {
        return super.on(event, listener);
    }

    /**
     * Remove event listener
     */
    off<K extends keyof SyncEventMap>(
        event: K,
        listener: (data: SyncEventMap[K]) => void
    ): this {
        return super.off(event, listener);
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.stopPeriodicSync();
        this.removeAllListeners();
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const syncEngine = new SyncEngine();

// Auto-start sync engine
if (typeof window !== 'undefined') {
    // Wait for initial network check and app hydration
    setTimeout(() => {
        if (networkManager.isOnline()) {
            // Only trigger if last sync was more than 30 mins ago
            const THIRTY_MINS = 30 * 60 * 1000;
            const state = syncEngine.getState();
            if (Date.now() - state.lastSync > THIRTY_MINS) {
                syncEngine.triggerSync();
            }
        }
    }, 5000); // Increased delay to let app settle
}
