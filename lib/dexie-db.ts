import Dexie, { Table } from 'dexie';

export interface SyncAction {
    id?: number;
    action_type: 'ATTENDANCE' | 'FEE_PAYMENT' | 'GRADE_ENTRY' | 'LESSON_NOTE' | 'TABLE_OP' | 'HTTP_OP';
    table?: string;
    operation?: 'create' | 'update' | 'delete' | 'upsert';
    // HTTP_OP only: replays a queued REST call through the same api.fetch() path
    // used online, so every screen's writes (not just the hand-wired action types
    // above) can be queued while offline without a per-screen integration.
    endpoint?: string;
    method?: string;
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
