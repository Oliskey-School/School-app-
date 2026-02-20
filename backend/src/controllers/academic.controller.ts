import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AcademicService } from '../services/academic.service';

export const saveGrade = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, subject, term, score, session } = req.body;
        const result = await AcademicService.saveGrade(req.user.school_id, studentId, subject, term, score, session);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getGrades = async (req: AuthRequest, res: Response) => {
    try {
        const { studentIds, subject, term } = req.body;
        const result = await AcademicService.getGrades(req.user.school_id, studentIds, subject, term);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
