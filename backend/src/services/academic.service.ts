import { supabase as supabaseAdmin } from '../config/supabase';

export class AcademicService {
    static async saveGrade(schoolId: string, studentId: string | number, subject: string, term: string, score: number, session: string) {
        // Teacher submitting a grade. Uses Admin privileges to bypass RLS.
        const { data: existing } = await supabaseAdmin
            .from('academic_performance')
            .select('id')
            .eq('school_id', schoolId)
            .eq('student_id', studentId)
            .eq('subject', subject)
            .eq('term', term)
            .maybeSingle();

        if (existing) {
            const { data, error } = await supabaseAdmin
                .from('academic_performance')
                .update({ score, last_updated: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabaseAdmin
                .from('academic_performance')
                .insert([{
                    school_id: schoolId,
                    student_id: studentId,
                    subject,
                    term,
                    score,
                    session,
                    last_updated: new Date().toISOString()
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    }

    static async getGrades(schoolId: string, studentIds: (string | number)[], subject: string, term: string) {
        if (!studentIds || studentIds.length === 0) return [];

        const { data, error } = await supabaseAdmin
            .from('academic_performance')
            .select('student_id, score')
            .eq('school_id', schoolId)
            .eq('subject', subject)
            .eq('term', term)
            .in('student_id', studentIds);

        if (error) throw error;
        return data;
    }
}
