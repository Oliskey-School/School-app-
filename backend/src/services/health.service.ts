import { supabase } from '../config/supabase';

export class HealthService {
    static async getHealthLogs(schoolId: string, branchId: string | undefined) {
        let query = supabase
            .from('health_logs')
            .select('*, students(name)')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query.order('logged_date', { ascending: false }).limit(10);

        if (error) throw new Error(error.message);
        return data || [];
    }
}
