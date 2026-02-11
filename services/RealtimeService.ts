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
                (p) => this.handleDataUpdate('users', p)
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notices', filter: `school_id=eq.${schoolId}` },
                (payload) => {
                    this.handleDataUpdate('notices', payload);
                    showNotification('New School Notice', {
                        body: payload.new.title || 'Check the dashboard'
                    });
                }
            )
            // Core Tables
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `school_id=eq.${schoolId}` }, (p) => this.handleDataUpdate('students', p))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers', filter: `school_id=eq.${schoolId}` }, (p) => this.handleDataUpdate('teachers', p))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'classes', filter: `school_id=eq.${schoolId}` }, (p) => this.handleDataUpdate('classes', p))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects', filter: `school_id=eq.${schoolId}` }, (p) => this.handleDataUpdate('subjects', p))

            // Teacher & Assignment Tables
            .on('postgres_changes', { event: '*', schema: 'public', table: 'class_teachers', filter: `school_id=eq.${schoolId}` }, (p) => this.handleDataUpdate('assignments' as any, p))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_subjects', filter: `school_id=eq.${schoolId}` }, (p) => this.handleDataUpdate('subjects' as any, p))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments', filter: `school_id=eq.${schoolId}` }, (p) => this.handleDataUpdate('assignments', p))

            // Attendance & Grades
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records', filter: `school_id=eq.${schoolId}` }, (p) => this.handleDataUpdate('attendance_records', p))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'grades', filter: `school_id=eq.${schoolId}` }, (p) => this.handleDataUpdate('grades', p))

            // Notifications
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `school_id=eq.${schoolId}` }, (p) => {
                this.handleDataUpdate('notifications' as any, p);
                const audience = Array.isArray(p.new.audience) ? p.new.audience : [p.new.audience];
                const lowercaseAudience = audience.map((a: string) => (a || '').toLowerCase());

                if (p.new.user_id === userId ||
                    lowercaseAudience.includes('all') ||
                    lowercaseAudience.includes('admin') ||
                    lowercaseAudience.includes('teacher') ||
                    lowercaseAudience.includes('parent') ||
                    lowercaseAudience.includes('student')) {

                    showNotification(p.new.title || 'New Notification', {
                        body: p.new.message || 'You have a new update'
                    });
                }
            })
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

            // Notify SyncEngine
            (syncEngine as any).emit('realtime-update', { table, record: payload.new || payload.old });

            // Notify UI via Window Event
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('realtime-update', {
                    detail: { table, record: payload.new || payload.old }
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
