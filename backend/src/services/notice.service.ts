import { supabase } from '../config/supabase';

export class NoticeService {
    static async getNotices(schoolId: string, branchId: string | undefined) {
        let query = supabase
            .from('notices')
            .select('*')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.order('timestamp', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createNotice(schoolId: string, branchId: string | undefined, noticeData: any) {
        const insertData = {
            ...noticeData,
            school_id: schoolId,
            timestamp: new Date().toISOString()
        };

        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('notices')
            .insert([insertData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteNotice(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('notices')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { error } = await query;

        if (error) throw new Error(error.message);
        return true;
    }
}
