import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { QuizService } from '../services/quiz.service';
import prisma from '../config/database';

export const getQuizzes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const filters: any = { ...req.query };

        if (req.user.role === 'teacher') {
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
        }

        const branchId = req.user.branch_id || req.query.branchId as string;
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

        const branchId = req.user.branch_id || payload.quiz.branch_id || payload.branch_id;
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
        const { branch_id, ...updateData } = req.body;
        const branchId = req.user.branch_id || branch_id;
        const result = await QuizService.updateQuizStatus(req.user.school_id, branchId, req.params.id as string, updateData);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const submitQuizResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await QuizService.submitQuizResult(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const branchId = req.user.branch_id || req.body.branch_id || req.query.branchId as string;
        await QuizService.deleteQuiz(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
