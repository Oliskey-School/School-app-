import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TimetableService } from '../services/timetable.service';

export const getTimetable = async (req: AuthRequest, res: Response) => {
    try {
        const { className, teacherId } = req.query;
        const result = await TimetableService.getTimetable(
            req.user.school_id, 
            className as string, 
            teacherId as string
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
