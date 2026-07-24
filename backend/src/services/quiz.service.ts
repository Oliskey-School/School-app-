import prisma from '../config/database';
import { SocketService } from './socket.service';

export class QuizService {
    static async getQuizzes(schoolId: string, branchId: string | undefined, filterStr?: string) {
        const where: any = {
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId; // strict branch isolation (untagged → All Branches only)
        }

        if (filterStr) {
            try {
                const filters = JSON.parse(filterStr);
                if (filters.classId) where.class_id = filters.classId;
                if (filters.subjectId) where.subject_id = filters.subjectId;
                if (filters.teacherId) where.teacher_id = filters.teacherId;

                // Student scoping: a student only sees PUBLISHED quizzes for the exact
                // class(es) they're actively enrolled in. Every quiz belongs to exactly
                // one class (schema: class_id is required, non-nullable) — there is no
                // "whole grade" quiz — so matching by grade alone would leak a quiz
                // across sections of the same grade (e.g. JSS1A's CBT showing up for
                // JSS1B). class_id is therefore the only correct filter.
                if (filters.forStudent) {
                    where.is_published = true;
                    const classIds: string[] = Array.isArray(filters.studentClassIds) ? filters.studentClassIds : [];
                    // If the student has no active enrollment, match nothing rather than leak all.
                    where.AND = [...(where.AND || []), classIds.length ? { class_id: { in: classIds } } : { id: '__none__' }];
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        return await prisma.quiz.findMany({
            where,
            include: {
                class: { select: { id: true, name: true, grade: true, section: true } },
                subject: { select: { id: true, name: true } },
                _count: { select: { questions: true } }
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

            // Prepare clean data for Prisma (Unchecked input style)
            const { id: _unusedId, ...restOfQuiz } = quizRest as any;
            const prismaData = {
                title: quizRest.title,
                description: quizRest.description,
                status: status || 'draft',
                subject_id,
                class_id: quizRest.class_id,
                teacher_id: quizRest.teacher_id,
                school_id: schoolId,
                branch_id: (branchId && branchId !== 'all') ? branchId : (quizRest.branch_id || null),
                time_limit: duration_minutes ?? quizRest.time_limit ?? null,
                total_marks,
                is_published: quizRest.is_published ?? false,
                is_cbt: quizRest.is_cbt ?? false,
                type: quizRest.type || 'QUIZ'
            };

            let quizData;
            if (quiz.id) {
                // UPDATE existing quiz
                quizData = await tx.quiz.update({
                    where: { id: quiz.id },
                    data: prismaData
                });
                // Delete existing questions to simplify re-insertion (or we could sync them)
                await tx.quizQuestion.deleteMany({ where: { quiz_id: quiz.id } });
            } else {
                // CREATE new quiz
                quizData = await tx.quiz.create({
                    data: prismaData
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
        // Scope by id + school_id only. Branch is intentionally NOT part of the
        // filter: a quiz created under one effective branch could otherwise fail
        // to toggle if the teacher's current branch context differs, which would
        // make "Publish" appear to do nothing. school_id still enforces isolation.
        const where: any = {
            id,
            school_id: schoolId
        };

        const quiz = await prisma.quiz.update({
            where,
            data
        });

        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'update_quiz_status', quizId: id, ...data });
        return quiz;
    }

    // student_id and score are NEVER trusted from the client here — the caller
    // (quiz.controller.ts submitQuizResult) resolves student_id from the
    // authenticated session and this function recomputes the score itself from
    // the real answer key, so a student can't forge their own or a peer's grade.
    static async submitQuizResult(schoolId: string, branchId: string | undefined, studentId: string, payload: { quiz_id: string; answers: Record<string, string>; focus_violations?: number }) {
        const quiz = await prisma.quiz.findFirst({
            where: { id: payload.quiz_id, school_id: schoolId },
            select: {
                questions: { select: { id: true, correct_answer: true, points: true } },
            },
        });
        if (!quiz) {
            const err: any = new Error('Quiz not found');
            err.code = 'P2025';
            throw err;
        }

        const answers = payload.answers || {};
        let earned = 0;
        let max = 0;
        for (const q of quiz.questions) {
            const pts = q.points || 1;
            max += pts;
            if (answers[q.id] != null && answers[q.id] === q.correct_answer) earned += pts;
        }
        const percentage = max > 0 ? Math.round((earned / max) * 100) : 0;

        const submission = await prisma.quizSubmission.create({
            data: {
                quiz_id: payload.quiz_id,
                student_id: studentId,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                score: percentage,
                total_questions: quiz.questions.length,
                answers: payload.answers,
                focus_violations: payload.focus_violations || 0,
                status: 'graded',
                submitted_at: new Date()
            }
        });

        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'submit_quiz', quizId: payload.quiz_id, studentId });
        return submission;
    }

    // excludeAnswers: strip correct_answer/explanation — used when a student is
    // about to take the quiz, so the answer key never reaches the browser.
    static async getQuiz(schoolId: string, id: string, opts: { branchId?: string; excludeAnswers?: boolean } = {}) {
        const where: any = { id, school_id: schoolId };
        if (opts.branchId && opts.branchId !== 'all') where.branch_id = opts.branchId;

        const quiz = await prisma.quiz.findFirst({
            where,
            include: {
                questions: {
                    orderBy: { order_index: 'asc' },
                    select: opts.excludeAnswers ? {
                        id: true, quiz_id: true, question_text: true, question_type: true,
                        options: true, points: true, order_index: true,
                    } : undefined,
                },
            },
        });

        if (quiz && opts.excludeAnswers) {
            // The `options` JSON blob (free-form per question) commonly embeds an
            // `isCorrect` flag per option — Prisma's `select` can't reach inside a
            // JSON column, so strip it here or the answer key leaks right back out
            // through `options` even with correct_answer/explanation excluded above.
            quiz.questions = (quiz.questions as any[]).map((q: any) => ({
                ...q,
                options: Array.isArray(q.options)
                    ? q.options.map(({ isCorrect, ...opt }: any) => opt)
                    : q.options,
            })) as any;
        }

        return quiz;
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
