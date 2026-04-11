import { api } from './api';

export type AnnouncementType = 'Emergency' | 'Academic' | 'Event' | 'Financial';
export type Channel = 'push' | 'sms' | 'email';

export interface AnnouncementPayload {
    title: string;
    body: string;
    type: AnnouncementType;
    channels: Channel[];
    scheduled_at?: string;
    target_role?: string; // 'parent', 'teacher', 'all'
}

/**
 * Multi-Channel Announcement Service.
 * Handles simultaneous delivery and tracking.
 */
export class CommunicationService {
    /**
     * Creates an announcement. 
     * In production, a Supabase Edge Function triggers Termii and Resend 
     * on the 'INSERT' event of this table.
     */
    static async sendAnnouncement(payload: AnnouncementPayload, schoolId: string, userId: string) {
        const { data, error } = await api
            .from('announcements')
            .insert({
                ...payload,
                school_id: schoolId,
                created_by: userId,
                sent_at: payload.scheduled_at ? null : new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Tracks a read receipt for an announcement.
     */
    static async markAsRead(announcementId: string, userId: string) {
        await api
            .from('announcement_reads')
            .upsert({
                announcement_id: announcementId,
                user_id: userId,
                read_at: new Date().toISOString()
            });
    }

    /**
     * Gets read receipt statistics for an admin.
     */
    static async getReadReceipts(announcementId: string) {
        const { data, count, error } = await api
            .from('announcement_reads')
            .select('user_id', { count: 'exact' })
            .eq('announcement_id', announcementId);

        if (error) throw error;
        return { count };
    }
}

