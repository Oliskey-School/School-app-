import { supabase } from '../config/supabase';

export class AuditService {
    static async getAuditLogs(schoolId: string, branchId: string | undefined, limit: number) {
        let query = supabase
            .from('audit_logs')
            .select('*, profiles:users(!user_id) (name, avatar_url)')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

        if (error) throw new Error(error.message);
        return data || [];
    }
}
