import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { StudentReportService } from '../services/studentReport.service';

export const createAnonymousReport = async (req: AuthRequest, res: Response) => {
    try {
        const result = await StudentReportService.createAnonymousReport(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createDiscreetRequest = async (req: AuthRequest, res: Response) => {
    try {
        const result = await StudentReportService.createDiscreetRequest(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
