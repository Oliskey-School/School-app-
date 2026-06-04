import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { IdVerificationService } from '../services/idVerification.service';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getVerificationRequests = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const data = await IdVerificationService.getRequests(
            req.user.school_id,
            branchId && branchId !== 'all' ? branchId : undefined
        );
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const reviewVerificationRequest = async (req: AuthRequest, res: Response) => {
    try {
        const { status, notes } = req.body;
        const result = await IdVerificationService.review(
            req.user.school_id,
            req.params.id as string,
            status,
            notes,
            req.user.id
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
