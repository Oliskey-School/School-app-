import prisma from '../config/database';
import { SocketService } from './socket.service';

export class QuizService {
    static async getQuizzes(schoolId: string, branchId: string | undefined, filterStr?: string) {
        const where: any = {
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        if (filterStr) {
            try {
                const filters = JSON.parse(filterStr);
                if (filters.classId) where.class_id = filters.classId;
                if (filters.subjectId) where.subject_id = filters.subjectId;
                if (filters.teacherId) where.teacher_id = filters.teacherId;
            } catch (e) {
                // Ignore parse errors
            }
        }

        return await prisma.quiz.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });
    }

    static async createQuizWithQuestions(schoolId: string, branchId: string | undefined, payload: { quiz: any, questions: any[] }) {
        return await prisma.$transaction(async (tx) => {
            const quizData = await tx.quiz.create({
                data: {
                    ...payload.quiz,
                    school_id: schoolId,
                    branch_id: branchId && branchId !== 'all' ? branchId : null
                }
            });

            if (payload.questions && payload.questions.length > 0) {
                await tx.quizQuestion.createMany({
                    data: payload.questions.map((q, index) => ({
                        ...q,
                        quiz_id: quizData.id,
                        school_id: schoolId,
                        branch_id: branchId && branchId !== 'all' ? branchId : null,
                        order_index: index
                    }))
                });
            }

            SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'create_quiz', quizId: quizData.id });
            return quizData;
        });
    }

    static async updateQuizStatus(schoolId: string, branchId: string | undefined, id: string, isPublished: boolean) {
        const where: any = {
            id,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        const quiz = await prisma.quiz.update({
            where,
            data: { is_published: isPublished }
        });

        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'update_quiz_status', quizId: id, isPublished });
        return quiz;
    }

    static async submitQuizResult(schoolId: string, branchId: string | undefined, payload: any) {
        const submission = await prisma.quizSubmission.create({
            data: {
                quiz_id: payload.quiz_id,
                student_id: payload.student_id,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                score: payload.score,
                total_questions: payload.total_questions,
                answers: payload.answers,
                focus_violations: payload.focus_violations || 0,
                status: payload.status || 'graded',
                submitted_at: payload.submitted_at ? new Date(payload.submitted_at) : new Date()
            }
        });

        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'submit_quiz', quizId: payload.quiz_id, studentId: payload.student_id });
        return submission;
    }

    static async deleteQuiz(schoolId: string, branchId: string | undefined, id: string) {
        const where: any = {
            id,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        const result = await prisma.quiz.delete({ where });
        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'delete_quiz', quizId: id });
        return true;
    }
}
