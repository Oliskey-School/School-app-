import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const branchId = req.query.branch_id as string | undefined;

        const result = await AuditService.getAuditLogs(req.user.school_id, branchId, limit);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
