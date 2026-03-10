import { supabase } from '../config/supabase';

export class LessonPlanService {
    static async getLessonPlans(schoolId: string, branchId: string | undefined, teacherId?: string) {
        let query = supabase.from('lesson_notes').select('*').eq('school_id', schoolId);

        if (teacherId) query = query.eq('teacher_id', teacherId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createLessonPlan(schoolId: string, branchId: string | undefined, planData: any) {
        const insertData = { ...planData, school_id: schoolId };

        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('lesson_notes')
            .insert([insertData])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    static async updateLessonPlan(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        let query = supabase
            .from('lesson_notes')
            .update(updates)
            .eq('id', id)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteLessonPlan(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('lesson_notes')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { error } = await query;
        if (error) throw new Error(error.message);
        return true;
    }
}
