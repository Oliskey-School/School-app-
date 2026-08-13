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
    // JWT subject of the user who queued this action. sync_queue is a single
    // IndexedDB store shared by the whole browser origin (not tab- or
    // session-scoped like sessionStorage), so on a shared device — or in demo
    // mode where switchDemoRole() swaps identity without a full logout — a
    // queued action must not get replayed under a DIFFERENT user's/role's
    // token once they log in next. Undefined means the entry predates this
    // field (pre-migration); it is still replayed for backward compatibility.
    user_scope?: string;
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
