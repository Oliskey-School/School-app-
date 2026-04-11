import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { HealthService } from '../services/health.service';

export const getHealthLogs = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = (req.query.branchId || req.query.branch_id) as string | undefined;
        const result = await HealthService.getHealthLogs(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createHealthLog = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await HealthService.createHealthLog(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
