import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DashboardService } from '../services/dashboard.service';

export const getStats = async (req: AuthRequest, res: Response) => {
    try {
        const stats = await DashboardService.getStats(req.user.school_id);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
