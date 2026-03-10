import { supabase } from '../config/supabase';

export class NotificationService {
    static async createNotification(schoolId: string, branchId: string | undefined, notificationData: any) {
        const insertData = { ...notificationData, school_id: schoolId };

        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('notifications')
            .insert([insertData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async getNotificationsForUser(schoolId: string, branchId: string | undefined, userId: string, audience: string[]) {
        // Fetch notifications specifically for this user OR for their audience groups
        let query = supabase
            .from('notifications')
            .select('*')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query
            .or(`user_id.eq.${userId},audience.overlap.{${audience.join(',')}},audience.cs.{all}`)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async markAsRead(schoolId: string, branchId: string | undefined, notificationId: string) {
        let query = supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
}
