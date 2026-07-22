import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { QuizService } from '../services/quiz.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

// A teacher may only publish/unpublish or delete a quiz they created themselves;
// admins can manage any quiz in the school.
async function assertOwnsQuiz(req: AuthRequest, quizId: string): Promise<boolean> {
    if (isAdmin(req)) return true;
    const quiz = await prisma.quiz.findFirst({ where: { id: quizId, school_id: req.user.school_id }, select: { teacher_id: true } });
    if (!quiz) return false;
    const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
    return !!teacher && teacher.id === quiz.teacher_id;
}

export const getQuizzes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const filters: any = { ...req.query };

        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });
            if (teacher) {
                filters.teacherId = teacher.id;
            } else {
                res.status(200).json([]);
                return;
            }
        } else if (req.user.role === 'STUDENT') {
            // A student only sees published quizzes for their own class(es)/grade.
            const student = await prisma.student.findUnique({
                where: { user_id: req.user.id },
                select: { id: true, grade: true }
            });
            if (!student) {
                res.status(200).json([]);
                return;
            }
            const enrollments = await prisma.studentEnrollment.findMany({
                where: { student_id: student.id, status: 'Active' },
                select: { class_id: true }
            });
            filters.forStudent = true;
            filters.studentClassIds = enrollments.map(e => e.class_id);
            filters.studentGrade = student.grade;
        }

        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await QuizService.getQuizzes(req.user.school_id, branchId, JSON.stringify(filters));
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createQuizWithQuestions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const payload = req.body;
        if (!payload || !payload.quiz) {
            res.status(400).json({ success: false, message: 'Invalid payload: missing quiz data' });
            return;
        }

        const branchId = getEffectiveBranchId(req.user, payload.quiz.branch_id || payload.branch_id || payload.quiz.branchId);
        const result = await QuizService.createQuizWithQuestions(req.user.school_id, branchId, payload);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await QuizService.getQuiz(req.user.school_id, req.params.id as string);
        if (!result) {
            res.status(404).json({ success: false, message: 'Quiz not found' });
            return;
        }
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateQuizStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!(await assertOwnsQuiz(req, req.params.id as string))) {
            res.status(403).json({ success: false, message: 'You do not have access to this quiz' });
            return;
        }
        const { branch_id, ...updateData } = req.body;
        const branchId = getEffectiveBranchId(req.user, branch_id);
        const result = await QuizService.updateQuizStatus(req.user.school_id, branchId, req.params.id as string, updateData);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const submitQuizResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { quiz_id, student_id } = req.body || {};
        if (!quiz_id) {
            res.status(400).json({ success: false, message: 'quiz_id is required' });
            return;
        }
        if (!student_id) {
            res.status(400).json({ success: false, message: 'student_id is required' });
            return;
        }
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId);
        const result = await QuizService.submitQuizResult(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        // Unknown quiz/student (e.g. a demo quiz that is not a persisted row) is a
        // not-found condition, not a server error.
        if (error?.code === 'P2003' || error?.code === 'P2025') {
            res.status(404).json({ success: false, message: 'Quiz or student not found.' });
            return;
        }
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!(await assertOwnsQuiz(req, req.params.id as string))) {
            res.status(403).json({ success: false, message: 'You do not have access to this quiz' });
            return;
        }
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId || (req.query.branchId as string));
        await QuizService.deleteQuiz(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getQuizSubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await QuizService.getQuizSubmissions(req.user.school_id, branchId, req.params.id as string);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
