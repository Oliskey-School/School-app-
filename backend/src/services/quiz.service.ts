import { supabase } from '../config/supabase';

export class QuizService {
    static async getQuizzes(schoolId: string, branchId: string | undefined, filterStr?: string) {
        let query = supabase.from('quizzes').select('*').eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

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
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createQuizWithQuestions(schoolId: string, branchId: string | undefined, payload: { quiz: any, questions: any[] }) {
        // 1. Create Quiz
        const quizInsert = { ...payload.quiz, school_id: schoolId };
        if (branchId && branchId !== 'all') {
            quizInsert.branch_id = branchId;
        }

        const { data: quizData, error: quizError } = await supabase
            .from('quizzes')
            .insert([quizInsert])
            .select()
            .single();

        if (quizError) throw new Error(`Quiz Creation Error: ${quizError.message}`);

        // 2. Insert Questions if any
        if (payload.questions && payload.questions.length > 0) {
            const questionsPayload = payload.questions.map(q => {
                const qInsert = {
                    ...q,
                    quiz_id: quizData.id,
                    school_id: schoolId
                };
                if (branchId && branchId !== 'all') {
                    qInsert.branch_id = branchId;
                }
                return qInsert;
            });

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

    static async updateQuizStatus(schoolId: string, branchId: string | undefined, id: string, isPublished: boolean) {
        let query = supabase
            .from('quizzes')
            .update({ is_published: isPublished })
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

    static async submitQuizResult(schoolId: string, branchId: string | undefined, payload: any) {
        const insertData: any = {
            quiz_id: payload.quiz_id,
            student_id: payload.student_id,
            school_id: schoolId,
            score: payload.score,
            total_questions: payload.total_questions,
            answers: payload.answers,
            focus_violations: payload.focus_violations || 0,
            status: payload.status || 'graded',
            submitted_at: payload.submitted_at || new Date().toISOString()
        };

        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('quiz_submissions')
            .insert([insertData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteQuiz(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('quizzes')
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
