import { supabase } from '../lib/supabase';
import { showNotification } from '../components/shared/notifications';
import { offlineDB, TableName } from '../lib/offlineDatabase';
import { syncEngine } from '../lib/syncEngine';

class RealtimeService {
    private channel: any;
    private userId: string | null = null;
    private schoolId: string | null = null;

    constructor() { }

    initialize(userId: string, schoolId: string) {
        if (this.channel) {
            if (this.userId === userId && this.schoolId === schoolId) return;
            this.destroy();
        }

        this.userId = userId;
        this.schoolId = schoolId;

        console.log(`🔌 Initializing Global Realtime Service for School: ${schoolId}`);

        this.channel = supabase.channel('global_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages', filter: `school_id=eq.${schoolId}` },
                (p) => {
                    this.handleDataUpdate('messages', p);
                    if (p.eventType === 'INSERT' && p.new.sender_id !== userId) {
                        showNotification('New Message', {
                            body: p.new.content || 'You have a new message'
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'conversations', filter: `school_id=eq.${schoolId}` },
                (p) => this.handleDataUpdate('conversations', p)
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'auth_accounts' },
                (p) => this.handleDataUpdate('users', p) // Map to users table name in offlineDB
            )
            // 2. Listen for Global Notices
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notices',
                    filter: `school_id=eq.${schoolId}`
                },
                (payload) => {
                    this.handleDataUpdate('notices', payload);
                    showNotification('New School Notice', {
                        body: payload.new.title || 'Check the dashboard'
                    });
                }
            )
            // 3. Delta Sync for Core Tables (Listen to all events)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'students', filter: `school_id=eq.${schoolId}` },
                (p) => this.handleDataUpdate('students', p)
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'teachers', filter: `school_id=eq.${schoolId}` },
                (p) => this.handleDataUpdate('teachers', p)
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'classes', filter: `school_id=eq.${schoolId}` },
                (p) => this.handleDataUpdate('classes', p)
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'grades', filter: `school_id=eq.${schoolId}` },
                (p) => this.handleDataUpdate('grades', p)
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'attendance_records', filter: `school_id=eq.${schoolId}` },
                (p) => this.handleDataUpdate('attendance_records', p)
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Realtime Sync Connected');
                }
            });
    }

    private async handleDataUpdate(table: TableName, payload: any) {
        console.log(`📥 Realtime Update [${table}]:`, payload.eventType);

        try {
            switch (payload.eventType) {
                case 'INSERT':
                case 'UPDATE':
                    await offlineDB.upsert(table, payload.new.id, payload.new, {
                        syncStatus: 'synced',
                        lastSynced: Date.now()
                    });
                    break;
                case 'DELETE':
                    await offlineDB.delete(table, payload.old.id);
                    break;
            }

            // Notify SyncEngine/UI to refresh
            // We cast syncEngine to any to emit a custom event if not typed
            (syncEngine as any).emit('realtime-update', { table, record: payload.new || payload.old });
        } catch (err) {
            console.error(`❌ Failed to apply realtime update to ${table}:`, err);
        }
    }

    destroy() {
        if (this.channel) {
            supabase.removeChannel(this.channel);
            this.channel = null;
        }
        this.userId = null;
        this.schoolId = null;
    }
}

export const realtimeService = new RealtimeService();
