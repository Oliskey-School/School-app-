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
}
