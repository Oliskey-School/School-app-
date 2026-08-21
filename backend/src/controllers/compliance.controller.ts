import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ComplianceService } from '../services/compliance.service';
import { sendError } from '../utils/httpError';

export const getComplianceChecks = async (req: AuthRequest, res: Response) => {
    try {
        const data = await ComplianceService.getChecks(req.user.school_id);
        res.json(data);
    } catch (error: any) {
        sendError(res, error, 'compliance.controller.ts');
    }
};

export const runComplianceChecks = async (req: AuthRequest, res: Response) => {
    try {
        const data = await ComplianceService.runChecks(req.user.school_id);
        res.json(data);
    } catch (error: any) {
        sendError(res, error, 'compliance.controller.ts');
    }
};
