import { supabase } from '../config/supabase';

export class AiService {
    static async getGeneratedResources(schoolId: string, branchId: string | undefined, teacherId: string) {
        let query = supabase
            .from('generated_resources')
            .select('*')
            .eq('teacher_id', teacherId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query
            .order('updated_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async saveGeneratedResource(schoolId: string, branchId: string | undefined, resourceData: any) {
        // Find existing to decide update or insert
        let query = supabase
            .from('generated_resources')
            .select('id')
            .eq('teacher_id', resourceData.teacher_id)
            .eq('subject', resourceData.subject)
            .eq('class_name', resourceData.class_name)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
            const { data, error } = await supabase
                .from('generated_resources')
                .update({ ...resourceData, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw new Error(error.message);
            return data;
        } else {
            const insertData: any = {
                ...resourceData,
                school_id: schoolId
            };
            if (branchId && branchId !== 'all') {
                insertData.branch_id = branchId;
            }

            const { data, error } = await supabase
                .from('generated_resources')
                .insert([insertData])
                .select()
                .single();
            if (error) throw new Error(error.message);
            return data;
        }
    }
}
