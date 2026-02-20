import { supabase } from '../config/supabase';

export class NoticeService {
    static async getNotices(schoolId: string) {
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .eq('school_id', schoolId)
            .order('timestamp', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createNotice(schoolId: string, noticeData: any) {
        const { data, error } = await supabase
            .from('notices')
            .insert([{
                ...noticeData,
                school_id: schoolId,
                timestamp: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteNotice(schoolId: string, id: string) {
        const { error } = await supabase
            .from('notices')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId);

        if (error) throw new Error(error.message);
        return true;
    }
}
