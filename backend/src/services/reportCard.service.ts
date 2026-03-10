import { supabase } from '../config/supabase';

export class ReportCardService {
    static async getReportCards(schoolId: string, branchId: string | undefined, teacherId?: string) {
        let query;

        if (teacherId) {
            // Join with class_teachers via student's class
            query = supabase
                .from('report_cards')
                .select('*, students!inner(id, current_class_id, class_teachers!inner(teacher_id))')
                .eq('school_id', schoolId)
                .eq('students.class_teachers.teacher_id', teacherId);
        } else {
            query = supabase
                .from('report_cards')
                .select('*, students!inner(id, current_class_id)')
                .eq('school_id', schoolId);
        }

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query
            .order('session', { ascending: false })
            .order('term', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async updateStatus(schoolId: string, branchId: string | undefined, id: string, status: string) {
        const updateData: any = { status };
        if (status === 'Published') {
            updateData.published_at = new Date().toISOString();
        }

        let query = supabase
            .from('report_cards')
            .update(updateData)
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
}
