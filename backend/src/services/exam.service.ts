import { supabase } from '../config/supabase';

export class ExamService {
    static async getExams(schoolId: string) {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createExam(schoolId: string, examData: any) {
        const { data, error } = await supabase
            .from('exams')
            .insert([{ ...examData, school_id: schoolId }])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    static async updateExam(schoolId: string, id: string, updates: any) {
        const { data, error } = await supabase
            .from('exams')
            .update(updates)
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
