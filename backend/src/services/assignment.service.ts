import { supabase } from '../config/supabase';

export class AssignmentService {
    static async getAssignments(schoolId: string, classId?: string) {
        let query = supabase.from('assignments').select('*').eq('school_id', schoolId);
        if (classId) query = query.eq('class_id', classId);
        const { data, error } = await query.order('due_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createAssignment(schoolId: string, assignmentData: any) {
        const { data, error } = await supabase
            .from('assignments')
            .insert([{ ...assignmentData, school_id: schoolId }])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    static async getSubmissions(assignmentId: string) {
        const { data, error } = await supabase
            .from('assignment_submissions')
            .select('*, students(name, avatar_url)')
            .eq('assignment_id', assignmentId);
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async gradeSubmission(schoolId: string, submissionId: string, gradeData: any) {
        const { data, error } = await supabase
            .from('assignment_submissions')
            .update(gradeData)
            .eq('id', submissionId)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    static async submitAssignment(schoolId: string, studentId: string, assignmentId: string, submissionData: any) {
        const { data, error } = await supabase
            .from('assignment_submissions')
            .upsert([{
                ...submissionData,
                school_id: schoolId,
                student_id: studentId,
                assignment_id: assignmentId,
                status: 'submitted',
                submitted_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }
}
