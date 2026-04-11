import Dexie, { Table } from 'dexie';

export interface SyncAction {
    id?: number;
    action_type: 'ATTENDANCE' | 'FEE_PAYMENT' | 'GRADE_ENTRY' | 'LESSON_NOTE' | 'TABLE_OP';
    table?: string;
    operation?: 'create' | 'update' | 'delete' | 'upsert';
    payload: any;
    created_at: string;
    synced: number; // 0 for false, 1 for true (IndexedDB indexing)
    retry_count: number;
}

export interface CachedData {
    key: string; // e.g., 'students_10A', 'timetable_monday'
    data: any;
    updated_at: string;
}

export class OliskeyOfflineDB extends Dexie {
    sync_queue!: Table<SyncAction>;
    roster_cache!: Table<CachedData>;

    constructor() {
        super('OliskeyOfflineDB');
        this.version(1).stores({
            sync_queue: '++id, action_type, synced, created_at',
            roster_cache: 'key'
        });
    }
}

export const offlineDB = new OliskeyOfflineDB();
