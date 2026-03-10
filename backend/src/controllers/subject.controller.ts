import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SubjectService } from '../services/subject.service';

export const getSubjects = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.query.branch_id as string || req.query.branchId as string;
        const result = await SubjectService.getSubjects(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
