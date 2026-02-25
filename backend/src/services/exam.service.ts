import { supabase } from '../config/supabase';

export class ExamService {
    static async getExams(schoolId: string, teacherId?: string) {
        let query = supabase
            .from('exams')
            .select('*')
            .eq('school_id', schoolId);
        
        if (teacherId) {
            query = query.eq('teacher_id', teacherId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createExam(schoolId: string, examData: any) {
        const payload = {
            ...examData,
            school_id: schoolId,
        };
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

    static async updateExam(schoolId: string, id: string, updates: any) {
        const payload = { ...updates };
        // Transform frontend camelCase to snake_case if present
        if (payload.className) {
            payload.class_name = payload.className;
            delete payload.className;
        }

        const { data, error } = await supabase
            .from('exams')
            .update(payload)
            .eq('id', id)
            .eq('school_id', schoolId)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteExam(schoolId: string, id: string) {
        const { error } = await supabase
            .from('exams')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId);
        if (error) throw new Error(error.message);
        return true;
    }

    static async getExamResults(examId: string) {
        const { data, error } = await supabase
            .from('exam_results')
            .select('*, students(name)')
            .eq('exam_id', examId);
        if (error) throw new Error(error.message);
        return data || [];
    }
}
