import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { QuizService } from '../services/quiz.service';
import { supabase } from '../config/supabase';

export const getQuizzes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const filters: any = { ...req.query };
        
        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();
            if (teacher) {
                filters.teacherId = teacher.id;
            } else {
                res.status(200).json([]);
                return;
            }
        }

        const result = await QuizService.getQuizzes(req.user.school_id, JSON.stringify(filters));
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

        const result = await QuizService.createQuizWithQuestions(req.user.school_id, payload);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateQuizStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { is_published } = req.body;
        const result = await QuizService.updateQuizStatus(req.user.school_id, req.params.id as string, is_published);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const submitQuizResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await QuizService.submitQuizResult(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await QuizService.deleteQuiz(req.user.school_id, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
