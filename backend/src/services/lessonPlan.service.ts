import { supabase } from '../config/supabase';

export class LessonPlanService {
    static async getLessonPlans(schoolId: string, teacherId?: string) {
        let query = supabase.from('lesson_notes').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
        if (teacherId) query = query.eq('teacher_id', teacherId);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createLessonPlan(schoolId: string, planData: any) {
        const { data, error } = await supabase
            .from('lesson_notes')
            .insert([{ ...planData, school_id: schoolId }])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    static async updateLessonPlan(schoolId: string, id: string, updates: any) {
        const { data, error } = await supabase
            .from('lesson_notes')
            .update(updates)
            .eq('id', id)
            .eq('school_id', schoolId)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteLessonPlan(schoolId: string, id: string) {
        const { error } = await supabase
            .from('lesson_notes')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId);
        if (error) throw new Error(error.message);
        return true;
    }
}
