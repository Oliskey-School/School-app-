import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { HealthService } from '../services/health.service';

export const getHealthLogs = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.query.branch_id as string | undefined;
        const result = await HealthService.getHealthLogs(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
