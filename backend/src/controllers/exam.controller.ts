import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ExamService } from '../services/exam.service';
import { supabase } from '../config/supabase';

export const getExams = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();
            if (teacher) teacherId = teacher.id;
            else return res.json([]);
        }

        const result = await ExamService.getExams(req.user.school_id, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createExam = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ExamService.createExam(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateExam = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ExamService.updateExam(req.user.school_id, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteExam = async (req: AuthRequest, res: Response) => {
    try {
        await ExamService.deleteExam(req.user.school_id, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getExamResults = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ExamService.getExamResults(req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
