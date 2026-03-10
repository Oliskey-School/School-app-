import { supabase } from '../config/supabase';

export class SubjectService {
    static async getSubjects(schoolId: string, branchId?: string) {
        let query = supabase
            .from('subjects')
            .select('*')
            .eq('school_id', schoolId);

        const { data, error } = await query.order('name');

        if (error) throw new Error(error.message);
        return data || [];
    }
}
