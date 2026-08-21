import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { GovernanceService } from '../services/governance.service';
import { sendError } from '../utils/httpError';

export const getComplianceStatus = async (req: AuthRequest, res: Response) => {
    try {
        const result = await GovernanceService.getComplianceStatus(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'governance.controller.ts');
    }
};

export const verifySystemIntegrity = async (req: AuthRequest, res: Response) => {
    try {
        const result = await GovernanceService.verifySystemIntegrity(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'governance.controller.ts');
    }
};
