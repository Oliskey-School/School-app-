import { supabase as supabaseAdmin } from '../config/supabase';

export class ResourceService {
    static async createResource(schoolId: string, resourceData: any) {
        // Teacher submitting a resource. Uses Admin privileges to bypass RLS.
        const { data, error } = await supabaseAdmin
            .from('resources')
            .insert([{
                ...resourceData,
                school_id: schoolId
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}
