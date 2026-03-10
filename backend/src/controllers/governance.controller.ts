import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { GovernanceService } from '../services/governance.service';

export const getComplianceStatus = async (req: AuthRequest, res: Response) => {
    try {
        const result = await GovernanceService.getComplianceStatus(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const verifySystemIntegrity = async (req: AuthRequest, res: Response) => {
    try {
        const result = await GovernanceService.verifySystemIntegrity(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
