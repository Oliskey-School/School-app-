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
            include: {
                class: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createQuizWithQuestions(schoolId: string, branchId: string | undefined, payload: { quiz: any, questions: any[] }) {
        return await prisma.$transaction(async (tx) => {
            const { quiz, questions } = payload;
            // Extract and strip unknown/camelCase fields from the quiz payload
            const {
                subject,          // free-text subject name from the form
                duration_minutes, // not in schema — maps to time_limit
                is_active,        // not in schema — ignore
                status: statusFromPayload,
                subject_id: subjectIdFromPayload,
                ...quizRest
            } = quiz;

            const status = statusFromPayload || 'draft';

            // Resolve subject_id: prefer an explicit id, otherwise look up by name
            let subject_id = subjectIdFromPayload;
            if (!subject_id && subject) {
                const found = await tx.subject.findFirst({
                    where: { school_id: schoolId, name: { equals: subject, mode: 'insensitive' } }
                });
                if (found) {
                    subject_id = found.id;
                } else {
                    // Fallback: pick any subject in the school
                    const fallback = await tx.subject.findFirst({ where: { school_id: schoolId } });
                    subject_id = fallback?.id;
                }
            }

            if (!subject_id) {
                throw new Error(`Subject "${subject}" not found. Please add it in the Subjects section first.`);
            }

            // Calculate total_marks from questions (default 1 per question if not set)
            const total_marks = questions.reduce((sum, q) => sum + (q.marks || q.points || 1), 0) || questions.length || 1;

            let quizData;
            if (quiz.id) {
                // UPDATE existing quiz
                quizData = await tx.quiz.update({
                    where: { id: quiz.id },
                    data: {
                        ...quizRest,
                        status: status || 'draft',
                        subject_id,
                        time_limit: duration_minutes ?? quizRest.time_limit ?? null,
                        total_marks,
                        school_id: schoolId,
                        branch_id: branchId && branchId !== 'all' ? branchId : null
                    }
                });
                // Delete existing questions to simplify re-insertion (or we could sync them)
                await tx.quizQuestion.deleteMany({ where: { quiz_id: quiz.id } });
            } else {
                // CREATE new quiz
                quizData = await tx.quiz.create({
                    data: {
                        ...quizRest,
                        status: status || 'draft',
                        subject_id,
                        time_limit: duration_minutes ?? quizRest.time_limit ?? null,
                        total_marks,
                        school_id: schoolId,
                        branch_id: branchId && branchId !== 'all' ? branchId : null
                    }
                });
            }

            if (questions && questions.length > 0) {
                await tx.quizQuestion.createMany({
                    data: questions.map((q, index) => {
                        const { id: qId, marks, question_order, ...qRest } = q;
                        return {
                            ...qRest,
                            points: marks || q.points || 1,
                            quiz_id: quizData.id,
                            school_id: schoolId,
                            branch_id: branchId && branchId !== 'all' ? branchId : null,
                            order_index: question_order ?? index
                        };
                    })
                });
            }

            SocketService.emitToSchool(schoolId, 'academic:updated', { action: quiz.id ? 'update_quiz' : 'create_quiz', quizId: quizData.id });
            return quizData;
        });
    }

    static async updateQuizStatus(schoolId: string, branchId: string | undefined, id: string, data: { is_published?: boolean, status?: string }) {
        const where: any = {
            id,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        const quiz = await prisma.quiz.update({
            where,
            data
        });

        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'update_quiz_status', quizId: id, ...data });
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

    static async getQuiz(schoolId: string, id: string) {
        return await prisma.quiz.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: { order_index: 'asc' }
                }
            }
        });
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

    static async getQuizSubmissions(schoolId: string, branchId: string | undefined, quizId: string) {
        const where: any = {
            quiz_id: quizId,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        return await prisma.quizSubmission.findMany({
            where,
            include: {
                student: {
                    select: {
                        id: true,
                        full_name: true,
                        school_generated_id: true,
                        avatar_url: true
                    }
                }
            },
            orderBy: { submitted_at: 'desc' }
        });
    }
}
