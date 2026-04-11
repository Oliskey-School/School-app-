import { offlineDB, SyncAction } from './dexie-db';
import { api } from './api';
import { networkManager } from './networkManager';
import { EventEmitter } from './EventEmitter';

class SyncEngine extends EventEmitter {
    private isSyncing = false;

    constructor() {
        super();
        // Periodically check for unsynced items
        if (typeof window !== 'undefined') {
            setInterval(() => this.processQueue(), 60000);
        }
    }

    /**
     * Entry point for all data mutations in the app.
     */
    async enqueueAction(type: SyncAction['action_type'], payload: any) {
        const action: SyncAction = {
            action_type: type,
            payload,
            created_at: new Date().toISOString(),
            synced: 0,
            retry_count: 0
        };

        await offlineDB.sync_queue.add(action);
        console.log(`📦 [SyncEngine] Action enqueued: ${type}`);
        
        await this.emitStateChange();
        
        // Trigger background sync if online
        this.processQueue();
    }

    /**
     * Generic table operation queueing
     */
    async queueOperation(table: string, operation: 'create' | 'update' | 'delete' | 'upsert', payload: any) {
        const action: SyncAction = {
            action_type: 'TABLE_OP',
            table,
            operation,
            payload,
            created_at: new Date().toISOString(),
            synced: 0,
            retry_count: 0
        };

        await offlineDB.sync_queue.add(action);
        console.log(`📦 [SyncEngine] Table operation queued: ${operation} on ${table}`);
        
        await this.emitStateChange();
        this.processQueue();
    }

    /**
     * Replays all unsynced actions to Backend in chronological order.
     */
    async processQueue() {
        if (this.isSyncing || networkManager.isOffline()) return;

        this.setSyncing(true);
        const unsynced = await offlineDB.sync_queue
            .where('synced')
            .equals(0)
            .sortBy('created_at');

        if (unsynced.length === 0) {
            this.setSyncing(false);
            return;
        }

        console.log(`🔄 [SyncEngine] Syncing ${unsynced.length} actions...`);

        for (const action of unsynced) {
            try {
                const success = await this.replayAction(action);
                if (success) {
                    await offlineDB.sync_queue.update(action.id!, { synced: 1 });
                } else {
                    await offlineDB.sync_queue.update(action.id!, { 
                        retry_count: (action.retry_count || 0) + 1 
                    });
                }
            } catch (err) {
                console.error(`❌ [SyncEngine] Replay failed for action ${action.id}:`, err);
            }
        }

        this.setSyncing(false);
        
        // Broadcast completion for UI status bar
        window.dispatchEvent(new CustomEvent('sync-complete', { 
            detail: { count: unsynced.length } 
        }));
    }

    private setSyncing(val: boolean) {
        this.isSyncing = val;
        this.emitStateChange();
    }

    private async emitStateChange() {
        const count = await this.getPendingCount();
        this.emit('state-change', {
            status: this.isSyncing ? 'syncing' : 'idle',
            pendingOperations: count
        });
    }

    async getPendingCount(): Promise<number> {
        return await offlineDB.sync_queue.where('synced').equals(0).count();
    }

    async triggerSync() {
        return this.processQueue();
    }

    private async replayAction(action: SyncAction): Promise<boolean> {
        const { action_type, payload, table, operation } = action;

        try {
            switch (action_type) {
                case 'TABLE_OP':
                    if (!table || !operation) return false;
                    const query = api.from(table);
                    let result;
                    
                    if (operation === 'create') {
                        result = await query.insert(payload);
                    } else if (operation === 'update') {
                        result = await query.eq('id', payload.id).update(payload);
                    } else if (operation === 'upsert') {
                        result = await query.upsert(payload);
                    } else if (operation === 'delete') {
                        result = await query.eq('id', payload.id).delete();
                    }
                    
                    return !result?.error;

                case 'ATTENDANCE':
                    await api.saveAttendance(Array.isArray(payload) ? payload : [payload]);
                    return true;
                
                case 'FEE_PAYMENT':
                    await api.recordStudentPayment(payload);
                    return true;

                case 'GRADE_ENTRY':
                    await api.saveGrade(payload);
                    return true;

                case 'LESSON_NOTE':
                    await api.createLessonNote({
                        ...payload,
                        status: 'published' // Upgrade from 'draft_offline' on sync
                    });
                    return true;

                default:
                    return false;
            }
        } catch (err) {
            console.error(`[SyncEngine] Error replaying action ${action_type}:`, err);
            return false;
        }
    }
}

export const syncEngine = new SyncEngine();
export default syncEngine;
