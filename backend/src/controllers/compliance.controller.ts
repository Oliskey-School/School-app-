import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ComplianceService } from '../services/compliance.service';

export const getComplianceChecks = async (req: AuthRequest, res: Response) => {
    try {
        const data = await ComplianceService.getChecks(req.user.school_id);
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const runComplianceChecks = async (req: AuthRequest, res: Response) => {
    try {
        const data = await ComplianceService.runChecks(req.user.school_id);
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
