import { supabase } from '../lib/supabase';
import { showNotification } from '../components/shared/notifications';
import { offlineDB, TableName } from '../lib/offlineDatabase';
import { syncEngine } from '../lib/syncEngine';

class RealtimeService {
    private channel: any;
    private userId: string | null = null;
    private schoolId: string | null = null;
    private branchId: string | null = null;

    constructor() { }

    initialize(userId: string, schoolId: string, branchId?: string | null) {
        if (this.channel) {
            if (this.userId === userId && this.schoolId === schoolId && this.branchId === branchId) return;
            this.destroy();
        }

        this.userId = userId;
        this.schoolId = schoolId;
        this.branchId = branchId || null;

        console.log(`🔌 Initializing Global Realtime Service for School: ${schoolId}, Branch: ${branchId || 'All'}`);

        // Construct filter
        let filter = `school_id=eq.${schoolId}`;
        if (branchId && branchId !== 'all') {
            filter += `,branch_id=eq.${branchId}`;
        }

        this.channel = supabase.channel('global_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public' },
                (payload) => {
                    const table = (payload as any).table;
                    console.log(`📥 Realtime Update [${table}]:`, payload.eventType);
                    this.handleDataUpdate(table as any, payload);

                    // Specific toast for messages
                    if (table === 'messages' && payload.eventType === 'INSERT' && payload.new.sender_id !== userId) {
                        showNotification('New Message', {
                            body: payload.new.content || 'You have a new message'
                        });
                    }

                    // Specific toast for notices
                    if (table === 'notices' && payload.eventType === 'INSERT') {
                        showNotification('New School Notice', {
                            body: payload.new.title || 'Check the dashboard'
                        });
                    }

                    // Specific toast for notifications
                    if (table === 'notifications' && payload.eventType === 'INSERT') {
                        const audience = Array.isArray(payload.new.audience) ? payload.new.audience : [payload.new.audience];
                        const lowercaseAudience = audience.map((a: string) => (a || '').toLowerCase());

                        if (payload.new.user_id === userId ||
                            lowercaseAudience.includes('all') ||
                            lowercaseAudience.includes('admin') ||
                            lowercaseAudience.includes('teacher') ||
                            lowercaseAudience.includes('parent') ||
                            lowercaseAudience.includes('student')) {

                            showNotification(payload.new.title || 'New Notification', {
                                body: payload.new.message || 'You have a new update'
                            });
                        }
                    }
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ [Realtime] Connected to Global Channel (School: ${this.schoolId})`);
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error('❌ [Realtime] Channel Error:', err);
                }
                if (status === 'TIMED_OUT') {
                    console.warn('⚠️ [Realtime] Subscription timed out. Check your internet connection.');
                }
            });
    }

    private async handleDataUpdate(table: TableName, payload: any) {
        try {
            // Tenant Isolation Check: Only process updates for the current school
            // Note: payload.new or payload.old might have school_id
            const record = payload.new || payload.old;
            const recordSchoolId = record?.school_id;

            if (recordSchoolId && this.schoolId && String(recordSchoolId) !== String(this.schoolId)) {
                // Ignore updates from other schools (tenant isolation)
                return;
            }

            // Update Offline DB if table exists in schema
            const knownTables: string[] = [
                'students', 'teachers', 'parents', 'users', 'classes', 'subjects',
                'timetable', 'conversations', 'assignments', 'grades',
                'attendance_records', 'notices', 'messages', 'schools',
                'branches', 'notifications', 'class_teachers', 'teacher_subjects'
            ];

            if (knownTables.includes(table as string)) {
                switch (payload.eventType) {
                    case 'INSERT':
                    case 'UPDATE':
                        await offlineDB.upsert(table, payload.new.id, payload.new, {
                            syncStatus: 'synced',
                            lastSynced: Date.now()
                        });

                        // Show specific toasts for record changes
                        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                            if (table === 'classes' || (table as string) === 'class_teachers') {
                                showNotification('Academic Update', { body: 'A class or teacher assignment has been updated.' });
                            } else if (table === 'grades') {
                                showNotification('Grades Updated', { body: 'New grades have been recorded or modified.' });
                            } else if (table === 'attendance_records') {
                                showNotification('Attendance Update', { body: 'An attendance record has been updated.' });
                            }
                        }
                        break;
                    case 'DELETE':
                        await offlineDB.delete(table, payload.old.id);
                        break;
                }
            }

            // Notify SyncEngine
            (syncEngine as any).emit('realtime-update', { table, record: payload.new || payload.old });

            // Notify UI via Window Event
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('realtime-update', {
                    detail: { table, record: payload.new || payload.old, eventType: payload.eventType }
                }));
            }
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
