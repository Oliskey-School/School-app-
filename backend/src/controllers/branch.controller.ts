import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SchoolService } from '../services/school.service';

export const getBranches = async (req: AuthRequest, res: Response) => {
    try {
        const result = await SchoolService.getBranches(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
