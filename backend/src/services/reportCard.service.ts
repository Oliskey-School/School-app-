import { supabase } from '../config/supabase';

export class ReportCardService {
    static async getReportCards(schoolId: string, teacherId?: string) {
        let query = supabase
            .from('report_cards')
            .select('*, students!inner(id, class_id)')
            .eq('school_id', schoolId);
        
        if (teacherId) {
            // Join with class_teachers via student's class
            // This assumes students have a current_class_id or similar.
            // Looking at the schema used in other services:
            query = supabase
                .from('report_cards')
                .select('*, students!inner(id, current_class_id, class_teachers!inner(teacher_id))')
                .eq('school_id', schoolId)
                .eq('students.class_teachers.teacher_id', teacherId);
        }

        const { data, error } = await query
            .order('session', { ascending: false })
            .order('term', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    static async updateStatus(schoolId: string, id: string, status: string) {
        const updateData: any = { status };
        if (status === 'Published') {
            updateData.published_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('report_cards')
            .update(updateData)
            .eq('id', id)
            .eq('school_id', schoolId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
}
