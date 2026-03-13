import { supabase as supabaseAdmin } from '../config/supabase';

export class ResourceService {
    static async createResource(schoolId: string, branchId: string | undefined, resourceData: any) {
        // Teacher submitting a resource. Uses Admin privileges to bypass RLS.
        const insertData = {
            ...resourceData,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabaseAdmin
            .from('resources')
            .insert([insertData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getResources(schoolId: string, branchId: string | undefined, filters: any = {}) {
        let query = supabaseAdmin
            .from('resources')
            .select('*, teacher:teachers(name)')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        if (filters.category) {
            query = query.eq('category', filters.category);
        }

        if (filters.subject) {
            query = query.eq('subject', filters.subject);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }
}
