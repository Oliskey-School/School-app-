/**
 * Tombstone Records for Soft Deletes
 * 
 * Handles soft delete operations with tombstone markers for proper sync
 */

import { offlineDB, TableName } from './offlineDatabase';
import { syncEngine } from './syncEngine';

export interface TombstoneRecord {
    id: string;
    table: TableName;
    deletedAt: number;
    deletedBy?: string;
    reason?: string;
}

/**
 * Soft delete a record with tombstone
 */
export async function softDelete(
    table: TableName,
    id: string,
    userId?: string,
    reason?: string
): Promise<void> {
    try {
        // Get the record
        const record = await offlineDB.get(table, id);

        if (!record) {
            console.warn(`Record ${id} not found in ${table}`);
            return;
        }

        // Create tombstone
        const tombstone: TombstoneRecord = {
            id,
            table,
            deletedAt: Date.now(),
            deletedBy: userId,
            reason
        };

        // Store tombstone
        await offlineDB.upsert('tombstones' as TableName, id, tombstone, {
            syncStatus: 'pending',
            lastSynced: 0
        });

        // Mark original record as deleted
        const recordData = record.data as any;
        await offlineDB.upsert(table, id, {
            ...recordData,
            is_deleted: true,
            deleted_at: new Date().toISOString()
        }, {
            syncStatus: 'pending',
            lastSynced: 0
        });

        // Queue sync operation
        await syncEngine.queueOperation(table, 'update', {
            ...recordData,
            is_deleted: true,
            deleted_at: new Date().toISOString()
        });

        console.log(`✅ Soft deleted ${table}:${id}`);
    } catch (error) {
        console.error(`❌ Soft delete failed for ${table}:${id}`, error);
        throw error;
    }
}

/**
 * Restore a soft-deleted record
 */
export async function restoreSoftDeleted(
    table: TableName,
    id: string
): Promise<void> {
    try {
        // Get the record
        const record = await offlineDB.get(table, id);

        if (!record) {
            console.warn(`Record ${id} not found in ${table}`);
            return;
        }

        // Remove soft delete markers
        const recordData = record.data as any;
        await offlineDB.upsert(table, id, {
            ...recordData,
            is_deleted: false,
            deleted_at: null
        }, {
            syncStatus: 'pending',
            lastSynced: 0
        });

        // Remove tombstone
        await offlineDB.delete('tombstones' as TableName, id);

        // Queue sync operation
        await syncEngine.queueOperation(table, 'update', {
            ...recordData,
            is_deleted: false,
            deleted_at: null
        });

        console.log(`✅ Restored ${table}:${id}`);
    } catch (error) {
        console.error(`❌ Restore failed for ${table}:${id}`, error);
        throw error;
    }
}

/**
 * Hard delete (permanent)
 */
export async function hardDelete(
    table: TableName,
    id: string
): Promise<void> {
    try {
        // Delete from IndexedDB
        await offlineDB.delete(table, id);

        // Delete tombstone if exists
        await offlineDB.delete('tombstones' as TableName, id);

        // Queue sync operation
        await syncEngine.queueOperation(table, 'delete', { id });

        console.log(`✅ Hard deleted ${table}:${id}`);
    } catch (error) {
        console.error(`❌ Hard delete failed for ${table}:${id}`, error);
        throw error;
    }
}

/**
 * Get all tombstones
 */
export async function getAllTombstones(): Promise<TombstoneRecord[]> {
    const records = await offlineDB.getAll('tombstones' as TableName);
    return records.map(r => r.data as TombstoneRecord);
}

/**
 * Get tombstones for a specific table
 */
export async function getTombstonesByTable(table: TableName): Promise<TombstoneRecord[]> {
    const all = await getAllTombstones();
    return all.filter(t => t.table === table);
}

/**
 * Clean up old tombstones (older than 30 days)
 */
export async function cleanupOldTombstones(daysOld: number = 30): Promise<number> {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const tombstones = await getAllTombstones();

    let cleaned = 0;

    for (const tombstone of tombstones) {
        if (tombstone.deletedAt < cutoff) {
            await offlineDB.delete('tombstones' as TableName, tombstone.id);
            cleaned++;
        }
    }

    console.log(`🧹 Cleaned ${cleaned} old tombstones`);
    return cleaned;
}

/**
 * Check if a record is soft-deleted
 */
export async function isSoftDeleted(table: TableName, id: string): Promise<boolean> {
    const record = await offlineDB.get(table, id);

    if (!record) {
        return false;
    }

    const recordData = record.data as any;
    return recordData.is_deleted === true;
}

/**
 * Sync tombstones to server
 */
export async function syncTombstones(): Promise<void> {
    const tombstones = await getAllTombstones();

    for (const tombstone of tombstones) {
        try {
            // Verify the record is actually deleted on the server
            const record = await offlineDB.get(tombstone.table, tombstone.id);

            if (record && record.metadata.syncStatus === 'synced') {
                // Remove tombstone if record is synced
                await offlineDB.delete('tombstones' as TableName, tombstone.id);
            }
        } catch (error) {
            console.error(`Error syncing tombstone ${tombstone.id}:`, error);
        }
    }

    console.log('✅ Tombstone sync complete');
}
