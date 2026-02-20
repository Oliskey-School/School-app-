import { supabase } from '../config/supabase';

export class QuizService {
    static async getQuizzes(schoolId: string, filterStr?: string) {
        let query = supabase.from('quizzes').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
        if (filterStr) {
            try {
                const filters = JSON.parse(filterStr);
                if (filters.classId) query = query.eq('class_id', filters.classId);
                if (filters.subjectId) query = query.eq('subject_id', filters.subjectId);
                if (filters.teacherId) query = query.eq('teacher_id', filters.teacherId);
            } catch (e) {
                // Ignore parse errors
            }
        }
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createQuizWithQuestions(schoolId: string, payload: { quiz: any, questions: any[] }) {
        // 1. Create Quiz
        const { data: quizData, error: quizError } = await supabase
            .from('quizzes')
            .insert([{ ...payload.quiz, school_id: schoolId }])
            .select()
            .single();

        if (quizError) throw new Error(`Quiz Creation Error: ${quizError.message}`);

        // 2. Insert Questions if any
        if (payload.questions && payload.questions.length > 0) {
            const questionsPayload = payload.questions.map(q => ({
                ...q,
                quiz_id: quizData.id,
                school_id: schoolId
            }));

            const { error: qError } = await supabase
                .from('quiz_questions')
                .insert(questionsPayload);

            if (qError) {
                // Rollback quiz if questions fail to ensure consistency
                await supabase.from('quizzes').delete().eq('id', quizData.id);
                throw new Error(`Questions Insert Error: ${qError.message}`);
            }
        }

        return quizData;
    }

    static async updateQuizStatus(schoolId: string, id: string, isPublished: boolean) {
        const { data, error } = await supabase
            .from('quizzes')
            .update({ is_published: isPublished })
            .eq('id', id)
            .eq('school_id', schoolId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async submitQuizResult(schoolId: string, payload: any) {
        const { data, error } = await supabase
            .from('quiz_submissions')
            .insert([{
                quiz_id: payload.quiz_id,
                student_id: payload.student_id,
                school_id: schoolId,
                score: payload.score,
                total_questions: payload.total_questions,
                answers: payload.answers,
                focus_violations: payload.focus_violations || 0,
                status: payload.status || 'graded',
                submitted_at: payload.submitted_at || new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteQuiz(schoolId: string, id: string) {
        const { error } = await supabase
            .from('quizzes')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId);

        if (error) throw new Error(error.message);
        return true;
    }
}
