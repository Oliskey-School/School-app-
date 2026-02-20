import { supabase } from '../config/supabase';

export class NotificationService {
    static async createNotification(schoolId: string, notificationData: any) {
        const { data, error } = await supabase
            .from('notifications')
            .insert([{ ...notificationData, school_id: schoolId }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async getNotificationsForUser(schoolId: string, userId: string, audience: string[]) {
        // Fetch notifications specifically for this user OR for their audience groups
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('school_id', schoolId)
            .or(`user_id.eq.${userId},audience.overlap.{${audience.join(',')}},audience.cs.{all}`)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async markAsRead(schoolId: string, notificationId: string) {
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('school_id', schoolId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
}
