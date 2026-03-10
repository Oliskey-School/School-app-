import { supabase } from '../config/supabase';

export class ExamService {
    static async getExams(schoolId: string, branchId: string | undefined, teacherId?: string) {
        let query = supabase
            .from('exams')
            .select('*')
            .eq('school_id', schoolId);

        if (teacherId) {
            query = query.eq('teacher_id', teacherId);
        }

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);

        // DEMO MODE MOCK DATA INJECTION
        const isDemoSchool = schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
        if (isDemoSchool && (!data || data.length === 0)) {
            console.log('🛡️ [ExamService] Injecting Demo Mock Exams');
            return [
                { id: 'e1', title: 'Mid-Term Assessment', subject: 'Mathematics', class_name: 'Grade 10A', date: '2025-03-15', status: 'Scheduled', school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f' },
                { id: 'e2', title: 'Mid-Term Assessment', subject: 'English', class_name: 'Grade 10A', date: '2025-03-16', status: 'Scheduled', school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f' },
                { id: 'e3', title: 'External Mock Exam', subject: 'Physics', class_name: 'Grade 11A', date: '2025-04-10', status: 'Draft', school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f' }
            ];
        }

        return data || [];
    }

    static async createExam(schoolId: string, branchId: string | undefined, examData: any) {
        const payload: any = {
            ...examData,
            school_id: schoolId,
        };

        if (branchId && branchId !== 'all') {
            payload.branch_id = branchId;
        }

        // Transform frontend camelCase to snake_case if present
        if (payload.className) {
            payload.class_name = payload.className;
            delete payload.className;
        }

        const { data, error } = await supabase
            .from('exams')
            .insert([payload])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    static async updateExam(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        const payload = { ...updates };
        // Transform frontend camelCase to snake_case if present
        if (payload.className) {
            payload.class_name = payload.className;
            delete payload.className;
        }

        let query = supabase
            .from('exams')
            .update(payload)
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

    static async deleteExam(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('exams')
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

    static async getExamResults(schoolId: string, branchId: string | undefined, examId: string) {
        let query = supabase
            .from('exam_results')
            .select('*, students(name)')
            .eq('exam_id', examId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query;
        return data || [];
    }
}
