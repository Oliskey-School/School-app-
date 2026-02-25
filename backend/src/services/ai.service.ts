import { supabase } from '../config/supabase';

export class AiService {
    static async getGeneratedResources(teacherId: string) {
        const { data, error } = await supabase
            .from('generated_resources')
            .select('*')
            .eq('teacher_id', teacherId)
            .order('updated_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async saveGeneratedResource(resourceData: any) {
        // Find existing to decide update or insert
        const { data: existing } = await supabase
            .from('generated_resources')
            .select('id')
            .eq('teacher_id', resourceData.teacher_id)
            .eq('subject', resourceData.subject)
            .eq('class_name', resourceData.class_name)
            .maybeSingle();

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
            const { data, error } = await supabase
                .from('generated_resources')
                .insert([resourceData])
                .select()
                .single();
            if (error) throw new Error(error.message);
            return data;
        }
    }
}
