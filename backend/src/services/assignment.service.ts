import { supabase } from '../config/supabase';

export class AssignmentService {
    static async getAssignments(schoolId: string, branchId?: string, classId?: string, teacherId?: string, className?: string) {
        let query = supabase.from('assignments').select('*').eq('school_id', schoolId);

        // Strict Data Isolation: Scope by branch
        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        if (classId) query = query.eq('class_id', classId);
        if (className) query = query.eq('class_name', className);
        if (teacherId) query = query.eq('teacher_id', teacherId);

        const { data, error } = await query.order('due_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }
    static async createAssignment(schoolId: string, branchId: string | undefined, assignmentData: any) {
        const { attachments, ...mainData } = assignmentData;

        // Force zero-leakage isolation
        const insertData: any = { ...mainData, school_id: schoolId };
        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data: assignment, error } = await supabase
            .from('assignments')
            .insert([insertData])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Handle attachments if present
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            const attachmentRecords = attachments.map((att: any) => ({
                assignment_id: assignment.id,
                file_name: att.file_name,
                file_url: att.file_url,
                file_type: att.file_type,
                file_size: att.file_size,
                uploaded_at: new Date().toISOString()
            }));

            const { error: attachError } = await supabase
                .from('assignment_attachments')
                .insert(attachmentRecords);

            if (attachError) {
                console.error('[AssignmentService] Error saving attachments:', attachError.message);
                // We don't throw here to avoid failing the whole assignment creation
                // but we could if we wanted atomic failure
            }
        }

        return assignment;
    }

    static async getSubmissions(schoolId: string, branchId: string | undefined, assignmentId: string) {
        let query = supabase
            .from('assignment_submissions')
            .select('*, students(name, avatar_url)')
            .eq('assignment_id', assignmentId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async gradeSubmission(schoolId: string, branchId: string | undefined, submissionId: string, gradeData: any) {
        let query = supabase
            .from('assignment_submissions')
            .update(gradeData)
            .eq('id', submissionId)
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

    static async submitAssignment(schoolId: string, branchId: string | undefined, studentId: string, assignmentId: string, submissionData: any) {
        const insertData: any = {
            ...submissionData,
            school_id: schoolId,
            student_id: studentId,
            assignment_id: assignmentId,
            status: 'submitted',
            submitted_at: new Date().toISOString()
        };

        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('assignment_submissions')
            .upsert([insertData])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }
}
