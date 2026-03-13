import { supabase as supabaseAdmin } from '../config/supabase';

export class VirtualClassService {
    static async createSession(sessionData: any) {
        const { data, error } = await supabaseAdmin
            .from('virtual_class_sessions')
            .insert([sessionData])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async getSessions(schoolId: string, branchId: string | undefined, teacherId?: string) {
        let query = supabaseAdmin
            .from('virtual_class_sessions')
            .select('*')
            .eq('school_id', schoolId);

        if (teacherId) {
            query = query.eq('teacher_id', teacherId);
        }

        const { data, error } = await query.order('start_time', { ascending: false });

        if (error) throw error;
        return data || [];
    }
}
